import 'server-only';

/**
 * Absolute URL for auth email redirect links (must be a real, reachable origin).
 *
 * Extracted from `app/[locale]/(auth)/actions.ts` (stage 0.6). Used there for the
 * password-reset `/api/auth/confirm?next=…` link (the sign-up wizard no longer depends on that
 * route — signup auto-confirms, see `signUp()`'s doc comment), and by
 * `lib/auth/send-welcome-email.ts` to build the informational welcome email's `/welcome` link.
 */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}
