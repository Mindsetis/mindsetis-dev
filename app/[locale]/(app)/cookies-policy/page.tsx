import { setRequestLocale } from 'next-intl/server';

import { LegalPage } from '@/components/legal/LegalPage';

type CookiesPolicyPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Cookies Policy — Figma "Cookies Policy" (`1112:27271`, desktop only, no mobile frame in the
 * file). Its "Contact"-style callout is titled "Questions about this document?" rather than
 * "Contact Us" (still the same `#f4f4f4`/16px-radius card component as the other two documents
 * — see `LegalPage`'s doc comment). Header/Footer come from `app/[locale]/layout.tsx`.
 *
 * A "Cookie settings" trigger (`components/cookies/CookieSettingsTrigger.tsx`) was rendered here
 * for part of 2026-09-02 and is hidden again at the customer's request — temporarily, hence the
 * component being left in place rather than deleted; restoring it is one import and one element.
 *
 * What that costs while it is off, so it isn't rediscovered as a bug: the consent preferences now
 * have NO entry point once a decision exists. The banner carries "Manage", but it only renders
 * while the choice is still open, and the footer's "Cookies Settings" link points at this
 * document. So a visitor who has already accepted or rejected cannot reach the dialog to change
 * their mind. That matters beyond convenience — withdrawing consent is supposed to be as easy as
 * giving it — so this wants a real home before launch, here or in the footer.
 */
export default async function CookiesPolicyPage({ params }: CookiesPolicyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="legal.cookiesPolicy" />;
}
