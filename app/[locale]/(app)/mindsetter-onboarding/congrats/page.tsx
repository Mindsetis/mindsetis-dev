import { getTranslations, setRequestLocale } from 'next-intl/server';

import { finalizeMindsetterOnboarding } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { MindsetterCongratsCtas } from '@/components/mindsetter-onboarding/MindsetterCongratsCtas';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';

type MindsetterCongratsPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * One core step's route per `mindsetter_profiles.onboarding_step` value the caller could be
 * sitting at (0 = nothing saved yet, …, 4 = "Shine" picker not yet submitted) — used only to
 * send a caller who lands here before finishing the core wizard back to wherever they left off,
 * mirroring `finalizeMindsetterOnboarding`'s guard
 * (`docs/mindsetter-extended-onboarding.md` section B/8).
 *
 * Reordered per product decision D9 (ROADMAP stage 1.9 follow-up) — "Personal session" is now
 * the LAST core step: roles(0) → superpowers(1) → help(2) → shine(3) → session(4), so this
 * array's index order changed from `[roles, superpowers, help, session, shine]` to
 * `[roles, superpowers, help, shine, session]`.
 */
const CORE_STEP_ROUTES = [
  '/mindsetter-onboarding/roles',
  '/mindsetter-onboarding/superpowers',
  '/mindsetter-onboarding/help',
  '/mindsetter-onboarding/shine',
  '/mindsetter-onboarding/session',
] as const;

function coreStepRedirectRoute(onboardingStep: number): string {
  const index = Math.min(Math.max(onboardingStep, 0), CORE_STEP_ROUTES.length - 1);
  return CORE_STEP_ROUTES[index] ?? CORE_STEP_ROUTES[0];
}

/**
 * Extended Mindsetter onboarding — Mindsetter Congrats screen
 * (`docs/mindsetter-extended-onboarding.md` section 8, `CONGRATS_ROUTE` in
 * `lib/mindsetter-onboarding/blocks.ts`). Reached once the core wizard (Roles → Superpowers →
 * Help → Shine picker → [optional blocks] → Personal session, reordered per decision D9) is
 * done — `SessionForm`'s own "Save and continue" is what actually lands here now.
 *
 * Unlike every earlier step, this page doesn't just render a form — on load it calls
 * `finalizeMindsetterOnboarding()` (section B's resolved decision D1: completing the core wizard
 * flips `profiles.account_type` to `'mindsetter'`, via a narrowly-scoped service-role write; see
 * that action's own doc comment). If the guard there reports the core wizard isn't actually done
 * (`finalized: false` — e.g. someone hand-navigates straight to this URL), this page redirects
 * back to whichever core step `onboardingStep` says is next, instead of showing congrats
 * prematurely. A same-shape `ok: false` (unexpected internal error) falls back to the last core
 * step ("Personal session") rather than rendering a broken congrats screen.
 *
 * Distinct from the Member congrats screen (`/welcome`, `WelcomeCtas`) — no "Who is Mindsetter?"
 * info modal, no dismiss/swap-after-confirm button; see `MindsetterCongratsCtas`'s own doc
 * comment.
 *
 * Renders a `RegistrationBackLink` back to `/mindsetter-onboarding/session` (product fix, stage
 * 1.9 follow-up), same chrome convention every core step's own page.tsx already uses. Going back
 * is safe even though `account_type` has already flipped to `'mindsetter'` by the time this page
 * renders — `saveSession`'s write path uses the service-role client and stays idempotent, so
 * revisiting/resubmitting that step doesn't undo the flip or duplicate anything.
 */
export default async function MindsetterOnboardingCongratsPage({
  params,
}: MindsetterCongratsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mindsetterOnboarding');
  const tAuth = await getTranslations('auth');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const result = await finalizeMindsetterOnboarding({});

  if (!result.ok) {
    redirect({ href: '/mindsetter-onboarding/session', locale });
    return null;
  }

  if (!result.data.finalized) {
    redirect({ href: coreStepRedirectRoute(result.data.onboardingStep), locale });
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[28px]">
        <RegistrationBackLink
          href="/mindsetter-onboarding/session"
          label={tAuth('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">{t('congrats.title')}</h1>
        <MindsetterCongratsCtas username={session.profile.username} />
      </div>
    </div>
  );
}
