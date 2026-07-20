import 'server-only';

/**
 * Absolute URL for auth email redirect links (must be a real, reachable origin).
 *
 * Extracted from `app/[locale]/(auth)/actions.ts` (stage 0.6). Used there for the
 * password-reset `/api/auth/confirm?next=…` link, and by `lib/auth/send-welcome-email.ts` to
 * build the informational welcome email's `/welcome` link. The sign-up confirmation link also
 * routes through here now (`signUp()` + `resendConfirmationEmail()` pass it as
 * `emailRedirectTo`): with custom SMTP OFF on the hosted project, Supabase sends its default,
 * non-editable "Confirm signup" template, whose `{{ .ConfirmationURL }}` redirects to whatever
 * `emailRedirectTo` we supply — so `/api/auth/confirm?next=/member-profile` must come from code,
 * not from a dashboard template override.
 */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}
