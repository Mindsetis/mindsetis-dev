import { setRequestLocale } from 'next-intl/server';

import { LegalPage } from '@/components/legal/LegalPage';
import { pageTitle } from '@/i18n/page-metadata';

type TermsOfUsePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TermsOfUsePageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'legal.termsOfUse');
}

/**
 * Terms of Use — Figma "Terms of Use" (`1112:27066`, desktop only, no mobile frame in the
 * file). Slug `/terms-of-use` matches this frame's own name and its breadcrumb ("Home / Legal /
 * Terms of Use") rather than the footer's "Terms of Service" label — the footer link label is
 * unchanged from Figma (see `Footer.tsx`'s doc comment), only its destination points here.
 * Header/Footer come from `app/[locale]/layout.tsx`; see `LegalPage`'s own doc comment for the
 * shared design-source breakdown.
 */
export default async function TermsOfUsePage({ params }: TermsOfUsePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalPage namespace="legal.termsOfUse" />;
}
