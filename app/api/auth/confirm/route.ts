import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { localePath, routing } from '@/i18n/routing';
import { resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/validation/common';

/**
 * Email link handler — establishes the session for BOTH of this project's Supabase Auth email
 * links:
 *
 *   • Password resets: `requestPasswordReset` (`app/[locale]/(auth)/actions.ts`) points
 *     `redirectTo` here with `?next=/reset-password`.
 *   • Sign-up confirmation (stage 1.5): `signUp()` / `resendConfirmationEmail()` pass
 *     `emailRedirectTo = …/api/auth/confirm?next=/` (that `?next=/` is load-bearing but not for
 *     routing — see below). Custom SMTP is now ON, so
 *     our own "Confirm signup" template (`supabase/templates/`) builds the link as
 *     `{{ .RedirectTo }}&token_hash=…&type=signup`, which lands on the `verifyOtp` branch.
 *     Establishing the session here is what makes `/verify-email` (step 2) a real blocking gate
 *     rather than the informational screen it used to be. The `exchangeCodeForSession` branch
 *     stays supported: that is what Supabase's own default template produces, and what this
 *     received before the templates were ours to edit.
 *
 *     Verified live 2026-09-23 against a real inbox: the token arrives `pkce_`-prefixed and
 *     `verifyOtp` accepts it server-side, 307 straight through to the wizard.
 *
 * Lives under `/api` so the i18n middleware doesn't rewrite it (see `middleware.ts` matcher).
 * Supports both Supabase link styles:
 *
 *   • `?token_hash=…&type=…`  → verifyOtp (recommended email-template style)
 *   • `?code=…`               → exchangeCodeForSession (PKCE / default ConfirmationURL)
 *
 * On success it redirects to `next` (a safe relative path). The link carries no locale, so
 * we resolve it against the default locale — which under `localePrefix: 'as-needed'` means
 * the bare, unprefixed path (`/member-profile`, not `/en/member-profile`).
 */

function localized(path: string, origin: string): URL {
  return new URL(localePath(routing.defaultLocale, path), origin);
}

/**
 * Where a caller goes once the link has established their session.
 *
 * `next` used to be obeyed verbatim, and the signup confirmation carried a hardcoded
 * `/member-profile` — so everyone landed on wizard step 3/4 regardless of how far they had
 * actually got, and a returning visitor who had already finished the wizard was dropped back
 * into it. That is Release-1 item 1. The stored progress is the honest answer, so we ask for it.
 *
 * Since this branch ignores `next` anyway, the signup link no longer spells out a destination
 * it cannot promise: it sends `?next=/` (2026-09-23), which `safeRedirectPath()` would have
 * produced regardless. Dropping the parameter ENTIRELY was tried the same day and broke every
 * signup link — the templates append the token with an unconditional `&`, so the redirect URL
 * must already carry a `?`. See the invariant in `lib/auth/site-url.ts` before touching either
 * call site. Recovery sends a real `next` and this function honours it.
 *
 * The password-recovery link is the one case that must NOT be re-resolved: `/reset-password`
 * needs the recovery session it was just handed, and its own page decides what happens after.
 * It keeps its literal target.
 */
async function destinationFor(next: string): Promise<string> {
  if (next === '/reset-password' || next.startsWith('/reset-password?')) return next;
  return resolveOnboardingRedirect();
}

/** What `/link-expired` should say happened. */
type LinkFailureReason = 'expired' | 'invalid';

/**
 * Sort a failed link into the two states we can actually tell apart.
 *
 * "Expired" and "already used" are deliberately ONE state. Supabase burns a one-time token the
 * moment it is verified, so a second click on a working link and a click on a three-day-old one
 * arrive here identically — same `otp_expired`, nothing left to distinguish them. Guessing
 * between the two would mean telling some visitors something false, so `/link-expired` names
 * both possibilities in its copy instead (see that page's doc comment).
 *
 * Everything else — a truncated, hand-edited or forged token — is `invalid`, which reads
 * differently and deliberately does not imply "just ask for another one".
 */
function classifyLinkFailure(error: { code?: string; message?: string }): LinkFailureReason {
  if (error.code === 'otp_expired') return 'expired';
  // Older SDK/gateway responses carry no `code`, only prose. Checked second so a real `code`
  // always wins.
  return error.message?.toLowerCase().includes('expired') ? 'expired' : 'invalid';
}

/**
 * Same question, but for the case where SUPABASE already rejected the link and bounced the
 * visitor here, handing us its verdict as `?error_code=` / `?error=` instead of a token.
 */
function classifyErrorCode(code: string): LinkFailureReason {
  // `access_denied` is what the hosted gateway pairs with an expired one-time link; anything
  // else (a malformed request, a bad grant) reads as a broken link rather than a stale one.
  return code === 'otp_expired' || code === 'access_denied' ? 'expired' : 'invalid';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get('next'));
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  const supabase = await createClient();

  /**
   * What to tell `/link-expired`, or `null` for "we genuinely don't know from here".
   *
   * `null` is not a fallback for laziness — it is the single most common real case. The live
   * confirmation email points at Supabase's own `/auth/v1/verify`, and when that rejects a dead
   * link it 303s to us with NO token and NO query error: the detail rides in the URL FRAGMENT
   * (`#error=access_denied&error_code=otp_expired`), which a server never receives. Guessing
   * "invalid" here is what put "Confirmation link invalid" in front of the very people this
   * screen was built for. So we say nothing and let the page read the fragment on the client.
   */
  let reason: LinkFailureReason | null = null;
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(localized(await destinationFor(next), origin));
    }
    reason = classifyLinkFailure(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(localized(await destinationFor(next), origin));
    }
    reason = classifyLinkFailure(error);
  } else if (errorCode) {
    reason = classifyErrorCode(errorCode);
  }

  // A dead link gets its own screen now, not the sign-in page with a red banner pinned over
  // a "Welcome back" heading (Release-1 A2 — the client's complaint was exactly that).
  const errorUrl = localized('/link-expired', origin);
  if (reason) errorUrl.searchParams.set('reason', reason);
  return NextResponse.redirect(errorUrl);
}
