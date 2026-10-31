import 'server-only';

import { getLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/auth/site-url';

/**
 * The `redirectTo` / `emailRedirectTo` every Supabase Auth email link is built from: our
 * `/api/auth/confirm` handler, with the visitor's UI language riding along.
 *
 * WHY THE LOCALE TRAVELS IN THE LINK (Release 2 П2)
 *   The email link carries no locale of its own, so `/api/auth/confirm` used to answer every
 *   visitor in the default language — a Spanish visitor who clicked "Reset password" landed on
 *   English `/reset-password`, and a dead link sent them to English `/link-expired`. The
 *   `NEXT_LOCALE` cookie next-intl keeps is only a partial answer: it is written solely when the
 *   browser's `Accept-Language` disagrees with the URL, so a Spanish-language browser on `/es`
 *   never gets one. Putting the locale in the link itself is the only version that always works,
 *   and the route reads the cookie only as a fallback.
 *
 * ONLY NON-DEFAULT LOCALES ADD A PARAMETER. English links stay byte-identical to what they were
 * before this existed, so the main flow cannot regress through a changed redirect URL.
 *
 * `next` is a fixed, trusted value chosen by the caller (`/` for sign-up confirmation,
 * `/reset-password` for recovery), never user input. It keeps the `?` that the email templates'
 * unconditional `&token_hash=…` depends on — see the INVARIANT in `lib/auth/site-url.ts`.
 */
export async function confirmRedirectUrl(next: '/' | '/reset-password'): Promise<string> {
  const locale = await getLocale();
  const isNonDefault =
    locale !== routing.defaultLocale && (routing.locales as readonly string[]).includes(locale);
  return siteUrl(`/api/auth/confirm?next=${next}${isNonDefault ? `&locale=${locale}` : ''}`);
}
