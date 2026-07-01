import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Link } from '@/i18n/navigation';
import { emailSchema } from '@/lib/validation/common';

type SignUpPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Sign-up screen — Figma "Registration" (mobile, node `165:2853`) / "Registration 1/4 -
 * 1440 px" (desktop, node `387:1725`), the OAuth-buttons variant.
 *
 * This route lives outside the `(auth)` group (unlike /login, /forgot-password, etc.) on
 * purpose: that group's shared layout wraps every page in a bordered card, but this Figma
 * frame is full-bleed on the page background with no card — giving sign-up its own route
 * keeps that shared shell untouched for the other auth screens instead of changing their
 * look too. The global `Header`/`Footer` (root `[locale]` layout) still wrap this page.
 *
 * Per the mobile frame being the layout source of truth: the desktop Figma frame shows two
 * separate name fields ("First Name" / "Second name"), but that conflicts with the mobile
 * frame's single name field, which matches `signUpSchema.fullName` — the desktop layout here
 * reuses the mobile structure (one name field) scaled into a wider, centered column, not the
 * desktop frame's own two-field composition.
 */
export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const { email } = await searchParams;
  const parsedEmail = emailSchema.safeParse(email);
  const backHref = parsedEmail.success
    ? `/onboarding?email=${encodeURIComponent(parsedEmail.data)}`
    : '/onboarding';

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10 sm:px-6 md:py-16">
      <div className="flex items-center justify-between gap-4 md:justify-end">
        {/* Back is only in the mobile Figma frame — desktop has no back link. */}
        <Link
          href={backHref}
          className="flex w-fit shrink-0 items-center gap-2 text-sm font-bold text-foreground hover:text-muted-foreground md:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('signUp.back')}
        </Link>

        <RegistrationProgress
          step={1}
          total={TOTAL_STEPS}
          label={t('signUp.stepLabel', { step: 1, total: TOTAL_STEPS })}
        />
      </div>

      {/* `text-h1`/`text-h3` are paired font-size+line-height tokens (globals.css): mobile
          renders at 32px/1.1, `md:text-h3` switches to 48px/0.9 — matches the Figma "MOB/H1"
          (mobile) vs "H3 (PC)" (desktop, 90% line-height) text styles exactly, no manual
          `leading-*` override needed. */}
      <h1 className="font-display text-h1 text-foreground md:text-h3">{t('signUp.title')}</h1>

      <SignUpForm initialEmail={parsedEmail.success ? parsedEmail.data : undefined} />
    </div>
  );
}
