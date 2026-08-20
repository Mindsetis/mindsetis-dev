import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

type ResetPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Set a new password — Figma `680:8987` (desktop) / `1057:9048` (mobile). Reached from the emailed
 * recovery link, which `/api/auth/confirm` exchanges for a recovery session before redirecting
 * here. Deliberately NOT in `AUTH_ONLY_PREFIXES` (see `middleware.ts`): that session makes the
 * visitor "signed in", so gating it on being signed out would lock the page against itself.
 *
 * No "Back to log in" here — the frame has none, and unlike the two screens before it this one is
 * mid-flow with a live recovery session rather than a dead end.
 */
export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.resetPassword');

  return (
    <AuthScreen title={t('title')} subtitle={t('subtitle')}>
      <ResetPasswordForm />
    </AuthScreen>
  );
}
