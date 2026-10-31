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
import { cookies } from 'next/headers';
import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { confirmRedirectUrl } from '@/lib/auth/confirm-link';
import { resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';
import { isValidRecoveryMarker, RECOVERY_MARKER_COOKIE } from '@/lib/auth/recovery-marker';
import { assertWithinRateLimit, emailBucket } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  EMAIL_ALREADY_REGISTERED,
  forgotPasswordSchema,
  resetPasswordSchema,
  SIGN_IN_EMAIL_NOT_CONFIRMED,
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
        //
        // Built by `confirmRedirectUrl`, which adds `&locale=…` for a non-default UI language so
        // the confirmation lands back in it (Release 2 П2). English stays exactly as above.
        emailRedirectTo: await confirmRedirectUrl('/'),
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
        throw new ActionError('conflict', 'An account with this email already exists.', {
          email: [EMAIL_ALREADY_REGISTERED],
        });
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
      throw new ActionError('conflict', 'An account with this email already exists.', {
        email: [EMAIL_ALREADY_REGISTERED],
      });
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
      // An unconfirmed address gets its own answer so the form can offer to resend the
      // confirmation email instead of a dead-end "invalid" (verification finding, 2026-09-30).
      // Safe to reveal: GoTrue only reports `email_not_confirmed` AFTER the password matched,
      // so it tells nothing to someone who doesn't already hold the credentials.
      if (error.code === 'email_not_confirmed') {
        throw new ActionError('forbidden', 'Please confirm your email address first.', {
          _form: [SIGN_IN_EMAIL_NOT_CONFIRMED],
        });
      }
      // Don't distinguish "wrong password" from "no such user" (enumeration). The sentence here
      // is only a server-side fallback: `SignInForm` recognises the `unauthenticated` code and
      // shows its own localized copy ("Incorrect email or password.") plus a Forgot-password link
      // (Release 2 Т2, variant A — the same wording for an unregistered address).
      throw new ActionError('unauthenticated', 'Incorrect email or password.');
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
 *
 * That neutrality is for the VISITOR. The server log still gets the real reason when Supabase
 * refuses (Release 2 П2): before this the error was dropped on the floor, so a hit on the
 * project's email-send limit looked exactly like a delivered mail and nobody could tell why a
 * reset never arrived. No address is logged — only Supabase's own status/code/message.
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: await confirmRedirectUrl('/reset-password'),
    });
    if (error) {
      console.error('[auth.requestPasswordReset] resetPasswordForEmail failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }
    return null;
  },
  { rateLimit: { key: 'auth:reset-request', limit: 5, window: '15 m' } },
);

/**
 * Set a new password. Requires the recovery session established by clicking the reset link
 * (the `/api/auth/confirm` handler exchanges the token before redirecting here). Returns
 * `{ next }` — the locale-less path the form should navigate to; the session is kept (see the end
 * of the handler).
 *
 * A session alone is not enough: it must carry the signed recovery marker `/api/auth/confirm`
 * issues only for a verified reset link (`lib/auth/recovery-marker.ts`). Otherwise any signed-in
 * session could set a new password without the old one — the cabinet's "Change password" asks for
 * it on purpose (security audit, 30.10.2026).
 *
 * It used to also restart the 14-day verification clock and clear `access_restricted` through the
 * service-role client — a courtesy left over from the old auto-confirm signup. Removed in the same
 * audit: those columns change only through staff paths, and a reset link let anyone lift a staff
 * restriction or push their own deadline back indefinitely.
 */
export const updatePassword = createAction(
  resetPasswordSchema,
  async ({ password }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    if (!user || !isValidRecoveryMarker(cookieStore.get(RECOVERY_MARKER_COOKIE)?.value, user.id)) {
      throw new ActionError(
        'unauthenticated',
        'Your reset link is invalid or has expired. Please request a new one.',
      );
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error?.code === 'same_password') {
      // Supabase refuses to "change" a password to itself; say so instead of a generic failure.
      throw new ActionError(
        'conflict',
        'Your new password must be different from your current one.',
      );
    }
    if (error) {
      throw new ActionError('internal_error', 'Could not update your password. Please try again.');
    }

    // One reset link, one password change.
    cookieStore.delete(RECOVERY_MARKER_COOKIE);

    // Release 2 П3 (replaces the Release-1 decision): the caller STAYS signed in. The recovery
    // link already proved they own the inbox, so making them type the password they just chose
    // into a login form added nothing. What does still matter is that someone who reset because
    // the account may be compromised must not leave an old session alive elsewhere — so every
    // OTHER session is revoked (`scope: 'others'` keeps the one making this request). A failure
    // here is logged but does not undo the password change that already succeeded.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
    if (signOutError) {
      console.error('[auth.updatePassword] revoking other sessions failed:', {
        status: signOutError.status,
        code: signOutError.code,
        message: signOutError.message,
      });
    }

    // Where this person belongs now — the cabinet, or the wizard step they never finished.
    // Same resolver the sign-in and email-confirmation paths use.
    return { next: await resolveOnboardingRedirect() };
  },
  { rateLimit: { key: 'auth:reset-update', limit: 10, window: '15 m' } },
);
