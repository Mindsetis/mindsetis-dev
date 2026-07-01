import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SignUpForm } from '@/components/auth/SignUpForm';

type SignUpPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t('signUp.title')}</h1>
        <p className="text-sm text-muted">{t('signUp.subtitle')}</p>
      </div>

      <SignUpForm />
    </div>
  );
}
