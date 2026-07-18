import { getTranslations, setRequestLocale } from 'next-intl/server';

import { finalizeMindsetterOnboarding } from '@/app/[locale]/mindsetter-onboarding/actions';
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
 */
const CORE_STEP_ROUTES = [
  '/mindsetter-onboarding/roles',
  '/mindsetter-onboarding/superpowers',
  '/mindsetter-onboarding/help',
  '/mindsetter-onboarding/session',
  '/mindsetter-onboarding/shine',
] as const;

function coreStepRedirectRoute(onboardingStep: number): string {
  const index = Math.min(Math.max(onboardingStep, 0), CORE_STEP_ROUTES.length - 1);
  return CORE_STEP_ROUTES[index] ?? CORE_STEP_ROUTES[0];
}

/**
 * Extended Mindsetter onboarding — Mindsetter Congrats screen
 * (`docs/mindsetter-extended-onboarding.md` section 8, `CONGRATS_ROUTE` in
 * `lib/mindsetter-onboarding/blocks.ts`). Reached once the core wizard (Roles → Superpowers →
 * Help → Personal session → Shine picker) is done and every picked optional block's own "Save
 * and continue" has run out of blocks (`nextBlockHref`) — or directly from the Shine picker if
 * no optional blocks were picked.
 *
 * Unlike every earlier step, this page doesn't just render a form — on load it calls
 * `finalizeMindsetterOnboarding()` (section B's resolved decision D1: completing the core wizard
 * flips `profiles.account_type` to `'mindsetter'`, via a narrowly-scoped service-role write; see
 * that action's own doc comment). If the guard there reports the core wizard isn't actually done
 * (`finalized: false` — e.g. someone hand-navigates straight to this URL), this page redirects
 * back to whichever core step `onboardingStep` says is next, instead of showing congrats
 * prematurely. A same-shape `ok: false` (unexpected internal error) falls back to the last core
 * step ("Shine") rather than rendering a broken congrats screen.
 *
 * Distinct from the Member congrats screen (`/welcome`, `WelcomeCtas`) — no "Who is Mindsetter?"
 * info modal, no dismiss/swap-after-confirm button; see `MindsetterCongratsCtas`'s own doc
 * comment.
 */
export default async function MindsetterOnboardingCongratsPage({
  params,
}: MindsetterCongratsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mindsetterOnboarding');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const result = await finalizeMindsetterOnboarding({});

  if (!result.ok) {
    redirect({ href: '/mindsetter-onboarding/shine', locale });
    return null;
  }

  if (!result.data.finalized) {
    redirect({ href: coreStepRedirectRoute(result.data.onboardingStep), locale });
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px]">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">{t('congrats.title')}</h1>
        <MindsetterCongratsCtas />
      </div>
    </div>
  );
}
