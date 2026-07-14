import 'server-only';

/**
 * Absolute URL for auth email redirect links (must be a real, reachable origin).
 *
 * Extracted from `app/[locale]/(auth)/actions.ts` (stage 0.6) so the registration wizard's
 * later steps — e.g. `app/[locale]/build-profile/actions.ts` (stage 1.2), which re-sends the
 * sign-up confirmation email via `supabase.auth.resend()` — can build the same
 * `/api/auth/confirm?next=…` links without duplicating this helper.
 */
export function siteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    // Misconfiguration, not a user error — fail loudly in the server log.
    throw new Error('NEXT_PUBLIC_SITE_URL is not set; cannot build auth redirect links.');
  }
  return `${base.replace(/\/$/, '')}${path}`;
}
