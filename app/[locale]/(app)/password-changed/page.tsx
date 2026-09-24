import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';

type PasswordChangedPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PasswordChangedPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth.passwordChanged');
}

/**
 * Password changed — Figma `680:9123` (desktop) / `1057:9112` (mobile). Terminal screen of the
 * recovery flow; `ResetPasswordForm` lands here after `updatePassword` has ended the recovery
 * session, so the visitor arrives signed out and the "Log in" button is the only way on.
 *
 * NOT added to `middleware.ts`'s `AUTH_ONLY_PREFIXES` even though a signed-in visitor has no
 * business here: the sign-out and this navigation happen back to back, and gating the page on
 * "must be signed out" would race the cookie clearing and could bounce the user off the very
 * confirmation they just earned.
 *
 * The check disc is GREEN here (`--color-success`, #08d6ad) while "Check your email" keeps brand
 * blue — the frames disagreed (desktop blue, mobile green) and the designer settled it as green at
 * both widths on 2026-08-13. This is also the only mobile frame of the four that shrinks its
 * heading, which IS reproduced (24px → 32px at `lg`).
 */
export default async function PasswordChangedPage({ params }: PasswordChangedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.passwordChanged');

  return (
    <AuthScreen
      icon
      iconTone="success"
      align="center"
      compactTitleOnMobile
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <Button asChild variant="primaryOutline" size="lg" className="w-full">
        <Link href="/login">{t('submit')}</Link>
      </Button>
    </AuthScreen>
  );
}
