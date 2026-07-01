import { getTranslations, setRequestLocale } from 'next-intl/server';

import { FormBanner } from '@/components/auth/FormBanner';
import { SignInForm } from '@/components/auth/SignInForm';
import { safeRedirectPath } from '@/lib/validation/common';

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string; error?: string; reset?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { redirectTo, error, reset } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t('signIn.title')}</h1>
        <p className="text-sm text-muted">{t('signIn.subtitle')}</p>
      </div>

      {error === 'invalid_link' ? <FormBanner>{t('errors.invalidLink')}</FormBanner> : null}
      {reset === 'success' ? (
        <FormBanner variant="success">{t('signIn.resetSuccess')}</FormBanner>
      ) : null}

      <SignInForm redirectTo={safeRedirectPath(redirectTo)} />
    </div>
  );
}
