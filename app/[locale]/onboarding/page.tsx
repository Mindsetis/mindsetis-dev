import { setRequestLocale } from 'next-intl/server';

import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { emailSchema } from '@/lib/validation/common';

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

/**
 * Onboarding flow — Figma "Onboarding - 1..4" (mobile) / "Onboarding - 1..3 - 1440 px"
 * (desktop). Reached from the Welcome-screen "Continue" CTA (`HeroEmailCta`); the final
 * step's CTA hands off to `/sign-up`, carrying the email along if one was captured.
 */
export default async function OnboardingPage({ params, searchParams }: OnboardingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { email } = await searchParams;
  // Defensive validation at this boundary (Zod-at-every-boundary) — a malformed/garbage
  // query value is simply dropped rather than prefilled downstream.
  const parsedEmail = emailSchema.safeParse(email);

  return <OnboardingFlow initialEmail={parsedEmail.success ? parsedEmail.data : undefined} />;
}
