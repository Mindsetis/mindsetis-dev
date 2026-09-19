import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { pageTitle } from '@/i18n/page-metadata';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth.forgotPassword');
}

/** Reset your password — Figma `679:8913` (desktop) / `1056:9007` (mobile). */
export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.forgotPassword');

  return (
    <AuthScreen title={t('title')} subtitle={t('subtitle')} backToLogin={t('backToLogin')}>
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
