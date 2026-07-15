import 'server-only';

/**
 * Absolute URL for auth email redirect links (must be a real, reachable origin).
 *
 * Extracted from `app/[locale]/(auth)/actions.ts` (stage 0.6). Used there for the
 * password-reset `/api/auth/confirm?next=…` link, and by `lib/auth/send-welcome-email.ts` to
 * build the informational welcome email's `/welcome` link. The sign-up confirmation link itself
 * (stage 1.5, also served by `/api/auth/confirm`) is built by Supabase's own "Confirm signup"
 * email template (a dashboard config, not code), so it doesn't route through this helper.
 */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}
