import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

type VerifyEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

/** Static "check your inbox" confirmation screen after sign-up. No form — just a link back. */
export default async function VerifyEmailPage({ params, searchParams }: VerifyEmailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t('verifyEmail.title')}</h1>
      <p className="text-sm text-muted-foreground">
        {email ? t('verifyEmail.subtitle', { email }) : t('verifyEmail.subtitleGeneric')}
      </p>
      <p className="text-sm text-muted-foreground">{t('verifyEmail.description')}</p>
      <Link
        href="/login"
        className="mt-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t('verifyEmail.backToLogin')}
      </Link>
    </div>
  );
}
