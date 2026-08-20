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
 */
export default async function CookiesPolicyPage({ params }: CookiesPolicyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="legal.cookiesPolicy" />;
}
