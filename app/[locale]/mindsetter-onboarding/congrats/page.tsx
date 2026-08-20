import { getTranslations, setRequestLocale } from 'next-intl/server';

import { finalizeMindsetterOnboarding } from '@/app/[locale]/mindsetter-onboarding/actions';
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
 * "Personal session" left the wizard on 2026-08-13 — 1:1 settings moved to the cabinet
 * (`/dashboard/sessions`), so the Shine picker is the last core step and this array ends there.
 */
const CORE_STEP_ROUTES = [
  '/mindsetter-onboarding/roles',
  '/mindsetter-onboarding/superpowers',
  '/mindsetter-onboarding/help',
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
 * Help → Shine picker → [optional blocks]) is done — either the last optional block's "Save and
 * continue" or the picker's own "Skip" lands here.
 *
 * Unlike every earlier step, this page doesn't just render a form — on load it calls
 * `finalizeMindsetterOnboarding()` (section B's resolved decision D1: completing the core wizard
 * flips `profiles.account_type` to `'mindsetter'`, via a narrowly-scoped service-role write; see
 * that action's own doc comment). If the guard there reports the core wizard isn't actually done
 * (`finalized: false` — e.g. someone hand-navigates straight to this URL), this page redirects
 * back to whichever core step `onboardingStep` says is next, instead of showing congrats
 * prematurely. A same-shape `ok: false` (unexpected internal error) falls back to the last core
 * step (the Shine picker) rather than rendering a broken congrats screen.
 *
 * Distinct from the Member congrats screen (`/welcome`, `WelcomeCtas`) — no "Who is Mindsetter?"
 * info modal, no dismiss/swap-after-confirm button; see `MindsetterCongratsCtas`'s own doc
 * comment.
 *
 * Renders a `RegistrationBackLink` back to the Shine picker, same chrome convention every core
 * step's own page.tsx already uses. Going back is safe even though `account_type` has already
 * flipped to `'mindsetter'` by the time this page renders — every step's write path is idempotent,
 * so revisiting one doesn't undo the flip or duplicate anything.
 *
 * Figma: "Mindsetter profile 6/6 - 1440 px" (`400:5587`, desktop) / "Congrats screen"
 * (`261:4319`, mobile) — re-verified 2026-08-18 against a fresh selection (this frame family's
 * name is reused across many unrelated step-preview frames in the file, so the node-id is the
 * only reliable anchor). Back→title gap is 52px desktop in the Figma layer tree; kept the
 * mobile `mb-8` this page already had (Figma's mobile frame has no Back element to measure
 * against at all — same "keep the shared Back link on both breakpoints anyway" call already
 * made for `/welcome`, see `RegistrationStepHeader`'s doc comment).
 *
 * The heading's "Congratulations!" is gradient-filled — same exact stops as `/welcome`'s own
 * accent span (`WelcomeScreen.tsx`), not the `--gradient-primary` button token (per that
 * component's doc comment, the two gradients differ slightly by design). Unlike `/welcome`,
 * this heading has no manual line breaks at all in Figma (desktop AND mobile both wrap the same
 * single continuous string naturally), so the `t.rich` call only needs the `accent` tag.
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
    redirect({ href: '/mindsetter-onboarding/shine', locale });
    return null;
  }

  if (!result.data.finalized) {
    redirect({ href: coreStepRedirectRoute(result.data.onboardingStep), locale });
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[52px]">
        <RegistrationBackLink
          href="/mindsetter-onboarding/shine"
          label={tAuth('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 md:gap-8">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t.rich('congrats.title', {
            accent: (chunks) => (
              <span className="bg-[linear-gradient(91.2deg,#c3e4fa_1.66%,#79b9e3_50.18%,#21b8e6_99.72%)] bg-clip-text text-transparent">
                {chunks}
              </span>
            ),
          })}
        </h1>
        <MindsetterCongratsCtas username={session.profile.username} />
      </div>
    </div>
  );
}
