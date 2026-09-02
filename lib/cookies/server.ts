import { cookies } from 'next/headers';

import { COOKIE_CONSENT_NAME, type CookieConsent, parseCookieConsent } from './consent';

/**
 * Reads the stored consent during SSR so the first painted HTML already knows whether the banner
 * belongs on the page — see `lib/cookies/consent.ts` for why this is a cookie at all.
 *
 * Separate from `consent.ts` because `next/headers` can't be imported from a Client Component;
 * keeping the import here lets the provider share the types and parser without dragging a
 * server-only module into the client bundle.
 */
export async function getCookieConsent(): Promise<CookieConsent | null> {
  const cookieStore = await cookies();
  return parseCookieConsent(cookieStore.get(COOKIE_CONSENT_NAME)?.value);
}
