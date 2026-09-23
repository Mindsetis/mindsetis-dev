import 'server-only';

/**
 * Absolute URL for auth email redirect links (must be a real, reachable origin).
 *
 * Extracted from `app/[locale]/(auth)/actions.ts` (stage 0.6). Used there for the
 * password-reset `/api/auth/confirm?next=/reset-password` link, and by
 * `lib/auth/send-welcome-email.ts` to build the informational welcome email's `/welcome` link.
 * The sign-up confirmation link also routes through here (`signUp()` +
 * `resendConfirmationEmail()` pass it as `emailRedirectTo`).
 *
 * What consumes it: our own auth email templates (`supabase/templates/`) build their href from
 * `{{ .RedirectTo }}` — the value passed here — and append the token. So this string IS the
 * link, and its length is visible to the reader: the templates print the full URL as a
 * copy-paste fallback under the button.
 *
 * INVARIANT — any path passed here FOR AN EMAIL LINK must contain a `?`.
 *
 * The templates append the token as `{{ .RedirectTo }}&token_hash=…`, and that `&` is
 * unconditional: Supabase's template language has no way to choose a separator. Hand this
 * function a bare `/api/auth/confirm` and every recipient gets
 * `…/api/auth/confirm&token_hash=…`, which is not a URL — it 404s, and neither typecheck nor
 * lint nor the template itself says a word. That is not hypothetical: it shipped on
 * 2026-09-23 and was caught only by sending a real email and clicking it.
 *
 * So the signup call passes `?next=/` even though `/api/auth/confirm` ignores `next` for
 * signup (it re-resolves the destination from stored progress — Release-1 A1). The parameter
 * is there to keep this invariant true, not to steer anything. The recovery link passes
 * `?next=/reset-password`, which that route DOES honour.
 */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}
