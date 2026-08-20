import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SignInForm } from '@/components/auth/SignInForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { safeRedirectPath } from '@/lib/validation/common';

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

/**
 * Log in — Figma `679:8779` (desktop 1440) / `1056:8939` (mobile 375), page "Admin Panel".
 *
 * Moved out of the `(auth)` route group (2026-08-12) for the same reason `/sign-up` never joined
 * it: that group's layout wraps its children in a bordered card with its own brand wordmark, and
 * this frame is full-bleed on the page background under the ordinary site header. The route is
 * still `/login` — only the shell changed. `/forgot-password` and `/reset-password` keep the old
 * card until their own frames (`679:8913`, `680:8987`) get built.
 *
 * The design's own header shows a "Log In" link and an "Apply to Join" CTA, and its footer is
 * still Relume placeholder content ("Link One"… "© 2024 Relume"); both are the global chrome this
 * page doesn't own, so neither is reproduced here.
 */
export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { redirectTo, error } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-20 sm:px-6 lg:px-[70px] lg:pt-[120px] lg:pb-[150px]">
      {/* 639px in the frame; the form column is centered in the page, not in a card. */}
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        {/* Heading only — the frames' subtitle ("Log in to manage your profile, sessions and
            events.") was dropped on request, 2026-08-13. */}
        <h1 className="font-display text-[32px] leading-none text-foreground">
          {t('signIn.title')}
        </h1>

        {error === 'invalid_link' ? (
          <Alert variant="destructive">
            <AlertDescription>{t('errors.invalidLink')}</AlertDescription>
          </Alert>
        ) : null}
        <SignInForm redirectTo={safeRedirectPath(redirectTo)} />
      </div>
    </div>
  );
}
