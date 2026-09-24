import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SignInForm } from '@/components/auth/SignInForm';
import { pageTitle } from '@/i18n/page-metadata';
import { isSafeRedirectPath } from '@/lib/validation/common';

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
};

export async function generateMetadata({ params }: LoginPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth', 'signIn.title');
}

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
  const { redirectTo } = await searchParams;
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

        {/* The "Your link is invalid or expired" banner that used to sit here is gone: a dead
            confirmation link now has its own screen, `/link-expired` (Release-1 A2). Nothing in
            the codebase sends anyone to `?error=invalid_link` any more, and leaving an
            unreachable second copy of that message around only invites the two wordings to
            drift apart. */}
        {/* Deliberately NOT `safeRedirectPath(redirectTo)`: that helper falls back to `'/'`,
            and a truthy `'/'` here overrides the server's "continue where you left off" answer
            for every visitor who simply opened /login — the dead end Release-1 A1 is about. An
            absent or unsafe value must arrive as `undefined` so the form asks the server. */}
        <SignInForm redirectTo={isSafeRedirectPath(redirectTo) ? redirectTo : undefined} />
      </div>
    </div>
  );
}
