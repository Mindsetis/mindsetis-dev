'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { useCookieConsent } from './CookieConsentProvider';

/**
 * Reopens `CookiePreferencesDialog` — the way back to the cookie choice after it has been made.
 *
 * CURRENTLY NOT MOUNTED ANYWHERE (2026-09-02). It has had two homes in one day: the footer's
 * "Cookies Settings" slot, then the bottom of `/cookies-policy`, and the customer asked for it to
 * be hidden for now in both cases. Kept rather than deleted because it is wanted again — see
 * `app/[locale]/(app)/cookies-policy/page.tsx` for what is missing while it is off, namely that
 * consent currently cannot be changed once given.
 *
 * Styled as a real `Button` (`outline`, tuned for this app's dark surfaces) rather than the bare
 * footer-link text it used to be. That styling was inherited from the footer's legal row and
 * would read as body text here, on a page whose own content sits in a light panel above it —
 * the one control on the page has to look like a control.
 *
 * Reuses the footer's own `footer.legal.cookies` string so the label stays identical to the link
 * that leads here; a second key would let the two drift apart for no reason.
 */
export function CookieSettingsTrigger() {
  const t = useTranslations('footer');
  const { openPreferences } = useCookieConsent();

  return (
    <Button type="button" variant="outline" onClick={openPreferences}>
      {t('legal.cookies')}
    </Button>
  );
}
