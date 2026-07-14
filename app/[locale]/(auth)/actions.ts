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
 * Account creation goes through the **service-role Admin API**, auto-confirmed:
 *
 *   1. `service.auth.admin.createUser({ email_confirm: true, ... })` creates the user AND
 *      marks it confirmed immediately. This was empirically re-verified (direct Admin API
 *      call, not assumed): `signInWithPassword()` unconditionally rejects a user created with
 *      `email_confirm: false` with `email_not_confirmed`, REGARDLESS of the hosted project's
 *      global "Confirm email" toggle — that toggle only affects the self-serve `/signup`
 *      endpoint's auto-confirm behavior, not the Admin API path or password sign-in's
 *      confirmation check. So "create unconfirmed, sign in anyway" is not achievable on this
 *      platform; auto-confirming at creation is the only way to get a working session right
 *      after signup. The wizard still sends a "Welcome to Mindsetis" email once step 3
 *      completes (`app/[locale]/build-profile/actions.ts`, via
 *      `lib/auth/send-welcome-email.ts`) — purely informational now, not a confirmation gate.
 *   2. The Admin API alone does not establish a session/cookies, so we immediately follow up
 *      with an ordinary anon-client `signInWithPassword()` to sign the caller in for the rest
 *      of the wizard (steps 2/3 need `requireUser()` to succeed). Since the account is already
 *      confirmed, this now succeeds deterministically — any failure here is a genuine
 *      unexpected error, not an interim/expected state, so it's handled the same way as any
 *      other post-create failure below (rollback + `internal_error`).
 */
export const signUp = createAction(
  signUpSchema,
  async ({ email, password, username, fullName, lastName }) => {
    const service = createServiceClient();
    const { data: createData, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
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
      // Now a genuine unexpected error — the account was created confirmed, so
      // signInWithPassword() should succeed deterministically (empirically verified). Log it
      // and roll back the orphaned auth user (no session, can't retry sign-up — the email is
      // taken) so the visitor can simply try signing up again instead of getting permanently
      // stuck on a `conflict` error with no way in.
      console.error('[auth.signUp] post-create signInWithPassword failed:', {
        status: signInError?.status,
        code: signInError?.code,
        message: signInError?.message,
      });
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

    return { email };
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
 *
 * Also resets the caller's 14-day verification clock (`profiles.verification_deadline`) and
 * clears `access_restricted` if set — mitigation for `signUp()`'s email-squatting tradeoff
 * (see that function's doc comment): since signup now auto-confirms with zero proof of email
 * ownership, someone could register a victim's address before the real owner ever does. A
 * completed password-reset IS a strong "you actually control this inbox" proof (Supabase's
 * own recovery-link flow), so it's the right moment to restart the clock from here rather than
 * leaving it dated to whenever the account was originally (possibly maliciously) created —
 * otherwise a reclaiming victim could already be `access_restricted` on day one.
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

    // `access_restricted` is staff-/service-role-only (`guard_profiles_protected_columns()`),
    // so this reset needs the service-role client — narrow and justified here: it only ever
    // touches the caller's own row (`user.id`), resolved from their own just-verified recovery
    // session, never arbitrary input.
    const service = createServiceClient();
    const { error: profileError } = await service
      .from('profiles')
      .update({
        verification_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        access_restricted: false,
      })
      .eq('id', user.id);
    if (profileError) {
      // Non-fatal: the password change itself already succeeded — don't fail the whole action
      // over this courtesy reset.
      console.error('[auth.updatePassword] verification_deadline reset failed:', profileError);
    }

    // End the temporary recovery session so the user must sign in with the new password.
    // This also lets the client land on /login (an auth-only route) to show the success
    // banner — otherwise the middleware auth-gate would bounce a still-signed-in user to /.
    await supabase.auth.signOut();
    return null;
  },
  { rateLimit: { key: 'auth:reset-update', limit: 10, window: '15 m' } },
);
