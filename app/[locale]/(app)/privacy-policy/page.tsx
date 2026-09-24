import { setRequestLocale } from 'next-intl/server';

import { LegalPage } from '@/components/legal/LegalPage';
import { pageTitle } from '@/i18n/page-metadata';

type PrivacyPolicyPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PrivacyPolicyPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'legal.privacyPolicy');
}

/**
 * Privacy Policy — Figma "Privacy Policy" (`1112:26877`, desktop) / "Privacy Policy - Mobile -
 * 375" (`1152:16559`, mobile). Header/Footer come from `app/[locale]/layout.tsx`; this page
 * only renders the body via the shared `LegalPage` (see its own doc comment for the full
 * design-source breakdown, shared across all three legal routes).
 */
export default async function PrivacyPolicyPage({ params }: PrivacyPolicyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="legal.privacyPolicy" />;
}
