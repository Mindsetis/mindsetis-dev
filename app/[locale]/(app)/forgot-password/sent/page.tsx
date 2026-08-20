import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ResendResetLinkButton } from '@/components/auth/ResendResetLinkButton';
import { redirect } from '@/i18n/navigation';
import { emailSchema } from '@/lib/validation/common';

type CheckEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

/**
 * Check your email — Figma `680:8880` (desktop) / `1057:9013` (mobile). Reached from
 * `/forgot-password` once the reset mail has been requested.
 *
 * The address rides in the query string because that is the only thing this screen needs and the
 * visitor is NOT signed in, so there's no session to read it from. It is re-validated here rather
 * than trusted: the value is echoed back into the page and handed to `requestPasswordReset` on
 * resend, so a junk or missing value goes back to the form instead of rendering a sentence about
 * an address nobody entered.
 *
 * Saying "we sent a link to X" for any well-formed address leaks nothing — `requestPasswordReset`
 * already answers identically whether or not an account exists.
 */
export default async function CheckEmailPage({ params, searchParams }: CheckEmailPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const { email } = await searchParams;
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    redirect({ href: '/forgot-password', locale });
    return null;
  }

  return (
    <AuthScreen
      icon
      align="center"
      title={t('checkEmail.title')}
      subtitle={t('checkEmail.subtitle', { email: parsed.data })}
      backToLogin={t('forgotPassword.backToLogin')}
    >
      <div className="flex w-full flex-col items-center gap-6">
        <p className="text-tiny text-muted-foreground">{t('checkEmail.hint')}</p>
        <ResendResetLinkButton email={parsed.data} />
      </div>
    </AuthScreen>
  );
}
