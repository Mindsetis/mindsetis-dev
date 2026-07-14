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
import { siteUrl } from '@/lib/auth/site-url';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/auth';

/** Per-account rate-limit bucket (hashed so raw emails never land in Redis keys). */
function emailBucket(prefix: string, email: string): string {
  return `${prefix}:${createHash('sha256').update(email).digest('hex')}`;
}

/**
 * Create an account. The profile row (with the 14-day verification deadline) is created by
 * the `handle_new_user` DB trigger (an `AFTER INSERT on auth.users` trigger — fires no matter
 * which API path inserted the row, admin or anon), which reads `username` / `full_name` /
 * `last_name` from the user metadata passed here.
 *
 * Confirmation-email architecture (stage 1.2 registration-wizard reorder, reworked): the
 * client-SDK `supabase.auth.signUp()` used previously sends the confirmation email
 * unconditionally and synchronously whenever the hosted project's "Confirm email" setting is
 * on, with no option to suppress it — that made it impossible to defer the actual send to step
 * 3 (`app/[locale]/build-profile/actions.ts`'s `resendConfirmationEmail`) the way this wizard
 * needs. So account creation now goes through the **service-role Admin API** instead:
 *
 *   1. `service.auth.admin.createUser({ email_confirm: false, ... })` creates the user and
 *      explicitly marks it unconfirmed — `email_confirm: false` overrides the project's global
 *      autoconfirm setting for this one user and, per the Admin API, never sends any email
 *      itself. This leaves a genuinely-pending signup for step 3's `resend({ type: 'signup' })`
 *      to redeliver — the real first confirmation email is sent exactly once, from step 3.
 *   2. The Admin API alone does not establish a session/cookies, so we immediately follow up
 *      with an ordinary anon-client `signInWithPassword()` to sign the caller in for the rest
 *      of the wizard (steps 2/3 need `requireUser()` to succeed). This sign-in only succeeds
 *      once the hosted project's "Confirm email" toggle is switched OFF in the Dashboard
 *      (Authentication → Providers → Email) — with it ON, GoTrue still blocks a password
 *      sign-in for an unconfirmed user, so we fall back to `needsEmailConfirmation: true` and
 *      let the caller bounce to `/verify-email` (step 4) exactly like before that toggle is
 *      flipped, instead of throwing.
 *
 * `emailRedirectTo` for the real (step-3) send still points at the wizard's Congrats screen
 * (`/welcome`); it is not passed here because this call never triggers a send.
 */
export const signUp = createAction(
  signUpSchema,
  async ({ email, password, username, fullName, lastName }) => {
    const service = createServiceClient();
    const { data: createData, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        ...(username ? { username } : {}),
        full_name: fullName,
        last_name: lastName,
      },
    });

    if (createError) {
      // Never swallow the real reason — surface it in server logs (no PII beyond
      // what Supabase itself put in `message`, which never includes the password).
      console.error('[auth.signUp] admin.createUser failed:', {
        status: createError.status,
        code: createError.code,
        message: createError.message,
      });

      // Supabase signals throttling via HTTP 429 and/or an `over_*_rate_limit` code.
      if (
        createError.status === 429 ||
        createError.code === 'over_email_send_rate_limit' ||
        createError.code === 'over_request_rate_limit' ||
        /rate limit/i.test(createError.message)
      ) {
        throw new ActionError(
          'rate_limited',
          'Too many sign-up attempts right now. Please try again in a little while.',
        );
      }

      // Treat identity-collision signals as a conflict.
      if (
        createError.code === 'user_already_exists' ||
        createError.code === 'email_exists' ||
        /already registered|already exists/i.test(createError.message)
      ) {
        throw new ActionError('conflict', 'An account with this email already exists.');
      }
      throw new ActionError('internal_error', 'Could not create your account. Please try again.');
    }

    // Establish the real session/cookies for the rest of the wizard. This is the anon client
    // on purpose — signInWithPassword() is what sets the request's auth cookies; the
    // service-role client never touches cookies.
    const supabase = await createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      // Expected until the hosted project's "Confirm email" toggle is switched off: GoTrue
      // still gates password sign-in on confirmation while that global setting is on. Treat
      // this as "needs email confirmation" rather than an error — step 4 (`/verify-email`)
      // is a valid landing spot with no session yet, same as the pre-rework flow.
      if (
        signInError?.code === 'email_not_confirmed' ||
        /email not confirmed/i.test(signInError?.message ?? '')
      ) {
        return { needsEmailConfirmation: true, email };
      }
      console.error('[auth.signUp] post-create signInWithPassword failed:', {
        status: signInError?.status,
        code: signInError?.code,
        message: signInError?.message,
      });
      // The auth user was created but is now unreachable (no session, can't retry sign-up —
      // the email is taken). Roll it back so the visitor can simply try signing up again
      // instead of getting permanently stuck on a `conflict` error with no way in.
      if (createData.user) {
        const { error: deleteError } = await service.auth.admin.deleteUser(createData.user.id);
        if (deleteError) {
          console.error('[auth.signUp] rollback deleteUser failed:', {
            status: deleteError.status,
            message: deleteError.message,
          });
        }
      }
      throw new ActionError('internal_error', 'Could not create your account. Please try again.');
    }

    return { needsEmailConfirmation: false, email };
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
