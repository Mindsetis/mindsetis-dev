import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

type WelcomePageProps = {
  params: Promise<{ locale: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard "Congrats screen" (Figma "Congrats screen" frame) — the destination
 * *after* the 4-step wizard completes. Reached via step 4's (`/verify-email`) always-available
 * "Continue" button, and linked from the informational "Welcome to Mindsetis" email
 * (`lib/auth/send-welcome-email.ts`'s `actionUrl`) — neither is a confirmation-link handoff
 * (the account is already auto-confirmed/signed-in by step 1, see
 * `(auth)/actions.ts#signUp`'s doc comment), so this page needs no session check of its own;
 * `/api/auth/confirm` is unrelated to this flow (it still only serves the password-reset
 * link, see that route's doc comment). Not part of the wizard's own step sequence — it's what
 * comes after step 4 — but the Figma frame still shows the (now-full) progress bar at 4/4,
 * with no Back link (there's nowhere to go back to from here); added in stage 1.4 (was
 * missing from the original stage 1.2 build).
 *
 * CTA scope (stage 1.2): only "Browse the community" (home page). The ROADMAP's other
 * suggested CTAs (Find Mindsetter / Invite to event / Find event / "Find out who a
 * Mindsetter is") don't have a real destination anywhere in the codebase yet — no
 * catalog/events/invite routes, and no Mindsetter-info page — so wiring them now would just
 * be dead links; add them once those pages exist (future stage, per ROADMAP 1.2's own scope
 * note). Untouched by the stage 1.4 pass below — only the progress indicator + a left-aligned
 * shell tweak (matching the other three steps) were added; note `items-center` alone doesn't
 * left-align a flex-col's children (it still centers each block), so dropping it entirely
 * (not just `text-center`) was the actual fix.
 */
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-16 sm:px-6 md:py-24">
      <RegistrationProgress
        step={4}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
      />
      <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
      <h1 className="font-display text-h1 text-foreground md:text-h3">{t('welcome.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('welcome.subtitle')}</p>
      <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
        <Link href="/">{t('welcome.browseCta')}</Link>
      </Button>
    </div>
  );
}
