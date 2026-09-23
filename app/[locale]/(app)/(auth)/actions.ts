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
import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';
import { siteUrl } from '@/lib/auth/site-url';
import { assertWithinRateLimit, emailBucket } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/auth';

/**
 * Create an account. The profile row (with the 14-day verification deadline) is created by
 * the `handle_new_user` DB trigger (an `AFTER INSERT on auth.users` trigger — fires no matter
 * which API path inserted the row, admin or anon), which reads `username` / `full_name` /
 * `last_name` from the user metadata passed here.
 *
 * Account creation goes through the **ordinary anon-client `signUp()`** (stage 1.5 rework —
 * this used to auto-confirm via the service-role Admin API + an immediate
 * `signInWithPassword()`; that hack is gone now that email verification is a real, blocking
 * step of the wizard):
 *
 *   - With the hosted project's "Confirm email" toggle ON (re-enabled for this stage), `signUp()`
 *     creates an **unconfirmed** user and returns `{ user, session: null }` — no session is
 *     established here on purpose. Supabase emails the visitor a confirmation link; clicking it
 *     hits `/api/auth/confirm`, whose `verifyOtp()` call both confirms the account AND
 *     establishes the real session in one step (distinct from `signInWithPassword()`, which was
 *     the mechanism that forced the old auto-confirm workaround). By the time the visitor lands
 *     back in the wizard (step 3, `/member-profile`), they have a real, confirmed session.
 *   - This function itself therefore returns `{ email }` only — no session/cookies to report.
 *     The caller (`SignUpForm`) redirects to `/verify-email?email=…` unconditionally on success.
 *   - No service-role client is needed here anymore — `signUp()` is a plain anon-client call,
 *     so there's no orphaned-user rollback case either (nothing partially succeeds: either the
 *     anon `signUp()` call creates the user, or it doesn't).
 */
export const signUp = createAction(
  signUpSchema,
  async ({ email, password, username, fullName, lastName }) => {
    // Per-email ceiling (holds across IPs) on top of createAction's per-IP limit below.
    // `signUp()` is a plain anon-client call now (stage 1.5 rework), and GoTrue re-triggers the
    // confirmation email when `signUp()` is called again for an address with an existing
    // pending, unconfirmed signup — without this, the per-IP limit alone is trivially bypassed
    // with multiple IPs, making this an unthrottled mail-bombing vector against any address.
    await assertWithinRateLimit(emailBucket('auth:sign-up:email', email), {
      limit: 4,
      window: '1 h',
    });

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Where the confirmation link points. Our own "Confirm signup" template
        // (`supabase/templates/`) builds its href from `{{ .RedirectTo }}` — i.e. from exactly
        // this value — and appends the token, so this is the whole link a signup email carries.
        // Mirrors `requestPasswordReset`.
        //
        // MUST KEEP A QUERY STRING. The templates append the token as
        // `{{ .RedirectTo }}&token_hash=…`, so whatever is passed here has to already contain
        // a `?` or the result is `…/confirm&token_hash=…` — one flat, dead URL. Dropping the
        // parameter entirely was tried on 2026-09-23 and produced exactly that; a real signup
        // email caught it.
        //
        // `?next=/` rather than the old `?next=/member-profile`: `/api/auth/confirm` throws
        // this value away for signup anyway. `destinationFor()` honours `next` only for the
        // password-recovery link and otherwise asks `resolveOnboardingRedirect()` where the
        // visitor actually left off (Release-1 A1). `/` is also exactly what
        // `safeRedirectPath()` falls back to, so behaviour is identical to both earlier
        // versions — it just stops printing a 22-character promise the handler never keeps, in
        // a URL the email shows in full as its copy-paste fallback.
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
      console.error('[auth.signUp] signUp failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });

      // Supabase signals throttling via HTTP 429 and/or an `over_*_rate_limit` code.
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

      // Treat identity-collision signals as a conflict. `user_already_exists` / `email_exists`
      // are shared `ErrorCode`s across every Supabase Auth API path (Admin and anon alike, per
      // `@supabase/auth-js`'s `error-codes.ts`), so this mapping is unchanged from the old
      // Admin-API call.
      if (
        error.code === 'user_already_exists' ||
        error.code === 'email_exists' ||
        /already registered|already exists/i.test(error.message)
      ) {
        throw new ActionError('conflict', 'An account with this email already exists.');
      }
      throw new ActionError('internal_error', 'Could not create your account. Please try again.');
    }

    // `signUp()`'s own doc comment (`@supabase/auth-js`): when the project has BOTH "Confirm
    // email" and "Confirm phone" enabled and the address already belongs to a *confirmed*
    // account, Supabase deliberately returns NO error — instead an obfuscated/fake `user` is
    // returned to avoid leaking existence via an error message. The one detectable signal is an
    // EMPTY `identities` array (a genuinely new signup always has at least one identity). Catch
    // that here so a duplicate signup still surfaces the same `conflict` the explicit-error path
    // above handles (matches this project's existing signup UX, which never treated "email
    // already registered" as an enumeration concern the way password-reset does).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new ActionError('conflict', 'An account with this email already exists.');
    }

    // Best-effort: flip the matching `leads` row (spec §5.2, reworked stage 1.7 — homepage
    // hero "signup intent" capture, `recordSignupIntent` in `app/[locale]/actions.ts`) to
    // `registered = true`, now that this email has actually completed account registration.
    // Service-role client is required — `leads` has no anon/authenticated UPDATE policy at
    // all (the `registered` flip is deliberately server-only). Non-fatal and expected to be a
    // no-op most of the time: most sign-ups never went through the homepage hero field, so
    // there's usually no matching row to update.
    const leadsService = createServiceClient();
    const { error: leadError } = await leadsService
      .from('leads')
      .update({ registered: true })
      .eq('email', email);
    if (leadError) {
      console.error('[auth.signUp] leads.registered update failed:', leadError);
    }

    return { email };
  },
  { rateLimit: { key: 'auth:sign-up', limit: 5, window: '10 m' } },
);

/**
 * Sign in with email + password. On success the session cookie is set and the action returns
 * `next` — where this particular caller belongs, read from their stored onboarding progress.
 *
 * The client used to fall back to `/` when there was no explicit `redirectTo`, which is how
 * someone with a half-finished registration ended up on the homepage with no way back into the
 * wizard (Release-1 items 1-2: the same complaint applies after a password change, since that
 * flow deliberately ends in a fresh sign-in). Deciding here rather than in the form keeps the
 * DB read on the server and gives every caller of `signIn` the same answer.
 */
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
    // The session cookie is set on `supabase` above, so this resolver — which calls
    // `getUser()` on a fresh server client reading the same cookie jar — sees the user that
    // just signed in.
    return { next: await resolveOnboardingRedirect() };
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
 * clears `access_restricted` if set. This predates stage 1.5's real-verification rework (it
 * used to mitigate signup's old auto-confirm-with-zero-proof-of-ownership tradeoff — see
 * `signUp()`'s doc comment history); now that `signUp()` requires a clicked confirmation link
 * before a session ever exists, session/account-takeover via email squatting is gone (an
 * attacker can never obtain a session for an email they don't own). That said, this doesn't
 * fully close the door on the underlying scenario: `handle_new_user()` is an `AFTER INSERT on
 * auth.users` trigger that still fires at `signUp()` time, before any confirmation, inserting a
 * `profiles` row from attacker-supplied `full_name`/`last_name` metadata — and that row is
 * publicly readable pre-confirmation per the existing `profiles_read` RLS policy. That's a
 * separate, still-open, pre-existing consideration this action isn't trying to fix. Left in
 * place anyway as harmless defense-in-depth: a completed password-reset is still a strong "you
 * actually control this inbox" proof (Supabase's own recovery-link flow), so restarting the
 * clock here rather than leaving it dated to account-creation time is still a reasonable
 * courtesy for someone reclaiming/recovering access.
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
