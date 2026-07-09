'use server';

/**
 * Auth Server Actions (stage 0.6) — email + password only.
 *
 * All actions go through `createAction` (Zod-validated, typed `ActionResult`, rate-limited).
 * Navigation on success is done client-side by the calling form so these stay pure.
 *
 * Google OAuth is deferred: add a `signInWithGoogle` action + provider config later without
 * touching this file's structure.
 */
import { createHash } from 'node:crypto';

import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/auth';

/** Absolute URL for email redirect links (must be a real, reachable origin). */
function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Per-account rate-limit bucket (hashed so raw emails never land in Redis keys). */
function emailBucket(prefix: string, email: string): string {
  return `${prefix}:${createHash('sha256').update(email).digest('hex')}`;
}

/**
 * Create an account. Supabase sends a confirmation email; the profile row (with the
 * 14-day verification deadline) is created by the `handle_new_user` DB trigger, which
 * reads `username` / `full_name` / `last_name` from the user metadata passed here.
 */
export const signUp = createAction(
  signUpSchema,
  async ({ email, password, username, fullName, lastName }) => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: siteUrl('/api/auth/confirm?next=/'),
        data: {
          ...(username ? { username } : {}),
          full_name: fullName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      // Never swallow the real reason — surface it in server logs (no PII beyond
      // what Supabase itself put in `message`, which never includes the password).
      console.error('[auth.signUp] Supabase signUp failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      // Supabase signals throttling via HTTP 429 and/or an `over_*_rate_limit` code
      // (e.g. too many confirmation emails sent to the same address/IP).
      if (
        error.status === 429 ||
        error.code === 'over_email_send_rate_limit' ||
        error.code === 'over_request_rate_limit' ||
        /rate limit/i.test(error.message)
      ) {
        throw new ActionError(
          'rate_limited',
          'Too many sign-up attempts right now. Please try again in a little while.',
        );
      }

      // Supabase returns a generic message for already-registered emails only when
      // "Confirm email" is on; treat identity-collision signals as a conflict.
      if (
        error.code === 'user_already_exists' ||
        error.code === 'email_exists' ||
        /already registered|already exists/i.test(error.message)
      ) {
        throw new ActionError('conflict', 'An account with this email already exists.');
      }
      throw new ActionError('internal_error', 'Could not create your account. Please try again.');
    }

    // With email confirmation on, `data.session` is null until the link is clicked.
    return { needsEmailConfirmation: data.session === null, email };
  },
  { rateLimit: { key: 'auth:sign-up', limit: 5, window: '10 m' } },
);

/** Sign in with email + password. On success the session cookie is set; client redirects. */
export const signIn = createAction(
  signInSchema,
  async ({ email, password }) => {
    // Per-email ceiling (holds across IPs) on top of createAction's per-IP limit —
    // defense against distributed brute-force of one account.
    await assertWithinRateLimit(emailBucket('auth:sign-in:email', email), {
      limit: 8,
      window: '15 m',
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Don't distinguish "wrong password" from "no such user" (enumeration).
      throw new ActionError('unauthenticated', 'Invalid email or password.');
    }
    return null;
  },
  { rateLimit: { key: 'auth:sign-in', limit: 10, window: '5 m' } },
);

/** End the session. Client redirects afterwards. */
export const signOut = createAction(z.object({}), async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return null;
});

/**
 * Request a password-reset email. Always succeeds from the caller's POV — we never reveal
 * whether an account exists for the address (enumeration protection).
 */
export const requestPasswordReset = createAction(
  forgotPasswordSchema,
  async ({ email }) => {
    // Per-email ceiling so a target can't be spammed with reset mails from many IPs.
    await assertWithinRateLimit(emailBucket('auth:reset-request:email', email), {
      limit: 4,
      window: '1 h',
    });

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl('/api/auth/confirm?next=/reset-password'),
    });
    return null;
  },
  { rateLimit: { key: 'auth:reset-request', limit: 5, window: '15 m' } },
);

/**
 * Set a new password. Requires the recovery session established by clicking the reset link
 * (the `/api/auth/confirm` handler exchanges the token before redirecting here).
 */
export const updatePassword = createAction(
  resetPasswordSchema,
  async ({ password }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new ActionError(
        'unauthenticated',
        'Your reset link is invalid or has expired. Please request a new one.',
      );
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new ActionError('internal_error', 'Could not update your password. Please try again.');
    }

    // End the temporary recovery session so the user must sign in with the new password.
    // This also lets the client land on /login (an auth-only route) to show the success
    // banner — otherwise the middleware auth-gate would bounce a still-signed-in user to /.
    await supabase.auth.signOut();
    return null;
  },
  { rateLimit: { key: 'auth:reset-update', limit: 10, window: '15 m' } },
);
