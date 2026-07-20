import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { WelcomeCtas } from '@/components/auth/WelcomeCtas';

type WelcomePageProps = {
  params: Promise<{ locale: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard "Congrats screen" (Figma "Congrats screen" frame) — the destination
 * *after* the 4-step wizard completes. Reached via step 4's (`/build-profile`) submit handler
 * (`BuildProfileForm.tsx`) once its save succeeds, and linked from the informational
 * "Welcome to Mindsetis" email (`lib/auth/send-welcome-email.ts`'s `actionUrl`) — by this point
 * the visitor has a real, confirmed session (established back at step 2's `/api/auth/confirm`
 * link-click, stage 1.5), so this page needs no session check of its own; nothing here reads
 * from that session either. Not part of the wizard's own step sequence — it's what comes after
 * step 4 — but the Figma frame still shows the (now-full) progress bar at 4/4, with no Back
 * link (there's nowhere to go back to from here); added in stage 1.4 (was missing from the
 * original stage 1.2 build).
 *
 * CTA scope: stage 1.2 shipped only "Browse the community" (home page) since the other
 * suggested CTAs (Find Mindsetter / Invite to event / Find event / "Find out who a
 * Mindsetter is") had no real destination anywhere in the codebase — no catalog/events/invite
 * routes, no Mindsetter-info page. Stage 1.6 (user-requested copy/UI pass) replaced that single
 * CTA with the four buttons + info modal from `WelcomeCtas.tsx` — all four still link to `/`
 * as an explicit placeholder (see that component's doc comment); wire up their real
 * destinations once those pages exist. Untouched by the stage 1.4 pass below — only the
 * progress indicator + a left-aligned shell tweak (matching the other three steps) were added;
 * note `items-center` alone doesn't left-align a flex-col's children (it still centers each
 * block), so dropping it entirely (not just `text-center`) was the actual fix.
 */
export default async function WelcomePage({ params }: WelcomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px]">
      {/* Same margin-bottom below the step indicator as the other three steps'
          `RegistrationStepHeader` (32px mobile / 100px desktop) — this page has no Back link,
          so it doesn't use that shared component, just matches its spacing here. */}
      <div className="mb-8 md:mb-[100px]">
        <RegistrationProgress
          step={4}
          total={TOTAL_STEPS}
          label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
          complete
        />
      </div>
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">{t('welcome.title')}</h1>
        <WelcomeCtas />
      </div>
    </div>
  );
}
