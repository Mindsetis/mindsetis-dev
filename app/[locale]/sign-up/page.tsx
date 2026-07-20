import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { SignUpForm } from '@/components/auth/SignUpForm';
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
 * The form now collects two separate, required name fields ("First name" / "Second name"),
 * matching `signUpSchema.fullName` / `signUpSchema.lastName` and the desktop Figma frame's
 * two-field composition.
 */
export default async function SignUpPage({ params, searchParams }: SignUpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const { email } = await searchParams;
  const parsedEmail = emailSchema.safeParse(email);
  // The onboarding tour is a popup now, not a page (reworked 2026-07-18) — "Back" just
  // returns to the homepage it was opened from, rather than reopening that popup.
  const backHref = '/';

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      {/* Same max-width + padding as the Header, so "Back" lines up under the logo. On
          desktop Back is absolutely pinned to that left edge while the step bar is centered
          over the form and spans the form width; on mobile the bar renders above Back. */}
      <RegistrationStepHeader
        backHref={backHref}
        step={1}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 1, total: TOTAL_STEPS })}
      />

      {/* Centered form column. `text-h1`/`text-h3` are paired font-size+line-height tokens
          (globals.css): mobile 32px/1, `md:text-h3` 48px/0.9 — matches Figma "MOB/H1" vs
          "H3 (PC)" exactly, no manual `leading-*` override needed. */}
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          {/* Stage 1.6: the "Let's start" eyebrow and "Your info is saved right away…"
              subtitle were removed per the user's copy tweaks — only the heading remains. */}
          <h1 className="font-display text-h1 text-foreground md:text-h3">{t('signUp.title')}</h1>
        </div>

        <SignUpForm initialEmail={parsedEmail.success ? parsedEmail.data : undefined} />
      </div>
    </div>
  );
}
