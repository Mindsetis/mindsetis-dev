import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { pageTitle } from '@/i18n/page-metadata';
import { emailSchema } from '@/lib/validation/common';

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

export async function generateMetadata({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth.forgotPassword');
}

/**
 * Reset your password — Figma `679:8913` (desktop) / `1056:9007` (mobile).
 *
 * `?email=` is the address from a refused log-in ("Incorrect email or password. Forgot
 * password?"). It is user-controlled, so it is re-validated with the normalizing `emailSchema`
 * and silently dropped if it fails.
 */
export default async function ForgotPasswordPage({
  params,
  searchParams,
}: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.forgotPassword');
  const { email } = await searchParams;
  const parsedEmail = emailSchema.safeParse(email);

  return (
    <AuthScreen title={t('title')} subtitle={t('subtitle')} backToLogin={t('backToLogin')}>
      <ForgotPasswordForm initialEmail={parsedEmail.success ? parsedEmail.data : undefined} />
    </AuthScreen>
  );
}
