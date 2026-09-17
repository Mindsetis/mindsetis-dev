'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { WelcomeMindsetterPitchCard } from '@/components/auth/WelcomeMindsetterPitchCard';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';

import { WhoIsMindsetterDialog } from './WhoIsMindsetterDialog';

/**
 * Congrats-screen ("/welcome") body — Figma "Congrats screen" `387:3000` (desktop) /
 * `421:3523` (mobile), the frame confirmed correct 2026-08-18 after two prior misreads that
 * targeted a different, same-named "Congrats screen" frame (`421:3798`/`387:3288`) — see
 * `/welcome/page.tsx`'s own doc comment.
 *
 * Everything is on screen at once, no phases: the "What's the difference between Member and
 * Mindsetter?" white pill (Figma "Frame 659", `1182:36162`) opens `WhoIsMindsetterDialog`;
 * `WelcomeMindsetterPitchCard` is the dark feature card below it; then "Apply for Mindsetter"
 * full-width, then "Continue as Member" / "Learn more" side by side (stacked on mobile).
 *
 * Spacing measured off both Figma frames (desktop `y`s in `387:3000`, absolute page coords):
 * pill→card 32px, card→"Apply" 32px, "Apply"→the two-button row 16px (mobile: 24 / 24 / 16 —
 * same 16px for the last gap at both breakpoints). `gap-6 md:gap-8` covers the first two;
 * the "Apply"+row group nests its own constant `gap-4`.
 *
 * No Figma prototype reactions exist anywhere on this frame (`get_reactions` returned empty for
 * every button, including the pill) — so button destinations below are inferred from copy/
 * context, not confirmed by a click-through. Flagged per-button below; also called out in the
 * handoff report.
 *
 * - "Apply for Mindsetter" → `/mindsetter-onboarding/roles`, same destination as the dialog's
 *   own "Cool, I want to become a Mindsetter" (both are entry points into the same flow, no
 *   conflict in having two).
 * - "Continue as Member" (Figma "Secondary - 2a", gradient border → `primaryOutline`) does not
 *   navigate: it swaps this screen for the OTHER congrats frame (`421:3798` — the three Member
 *   CTAs and the profile-preview button, `WelcomeMemberCtas`), which is what someone who
 *   declines the Mindsetter upgrade is meant to land on. The swap is owned by `WelcomeScreen`,
 *   since the heading changes with it too.
 * - "Learn more" (Figma "Secondary - 2b", grey border → `outline`) and the card's "See example"
 *   have no destination anywhere either and no obvious existing-route stand-in — `NotYetAvailable`
 *   disabled, per the same precedent as every other dead-end CTA on this screen.
 */
export function WelcomeCtas({ onContinueAsMember }: { onContinueAsMember: () => void }) {
  const t = useTranslations('auth.welcome');
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Figma: white bg, black text, Cal Sans 22px on desktop but plain Manrope 16px/bold on
          mobile (the shared `Button` base classes already give `text-base font-bold`, which IS
          Manrope 16px/bold — so only the `md:` override is needed here). No variant matches a
          white pill (per the task's "don't invent a variant" instruction) — `ghost` is the
          closest neutral base (no border/no fill of its own to fight), fully reskinned locally;
          `h-auto` + local padding override the fixed-height `size` classes since this pill's
          height is content-driven (2-line wrap on mobile vs 1 line on desktop, neither matches a
          fixed `size`). `whitespace-normal` is required for that wrap to happen at all — the
          shared button base sets `whitespace-nowrap`, which kept this long label on one line and
          pushed it out of the pill on narrow screens. No hover/active state exists in Figma for
          this control (no
          reactions, no alternate frame) — `hover:bg-white active:bg-white` just pins it inert
          rather than inheriting `ghost`'s built-in color transitions, which would otherwise fade
          the black text toward grey/primary on hover/active for no documented reason. */}
      <Button
        type="button"
        variant="ghost"
        className="h-auto justify-start rounded-xl bg-white px-4 py-3 text-left font-sans text-base font-bold whitespace-normal text-black hover:bg-white hover:text-black active:bg-white active:text-black md:px-6 md:py-4 md:font-display md:text-[22px] md:font-normal"
        onClick={() => setExplainerOpen(true)}
      >
        {t('whoIsMindsetter.trigger')}
      </Button>

      <WelcomeMindsetterPitchCard />

      <div className="flex flex-col gap-4">
        <Button asChild variant="primary" size="lg" className="w-full">
          {/* Extended Mindsetter onboarding, step 1/5 "Your roles" (ROADMAP stage 1.9). */}
          <Link href="/mindsetter-onboarding/roles">{t('ctas.applyForMindsetter')}</Link>
        </Button>

        {/* `md:grid-cols-2`, NOT `md:flex-row` + `flex-1` on each: the two are structurally
            asymmetric — "Continue as Member" is the button itself (so `size="lg"`'s `px-8` sits
            ON the flex item), while "Learn more" is wrapped by `NotYetAvailable`, whose padding-less
            span is the flex item instead. `flex-1` resolves to `flex-basis: 0%`, which excludes
            padding, so the free space split evenly (280px each) and only the first one then
            added its own 64px — measured 344 vs 280 at 1440px. Grid columns are sized before
            any of that, so both land on exactly (640 − 16) / 2 = 312px. */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
          <Button
            type="button"
            variant="primaryOutline"
            size="lg"
            className="w-full"
            onClick={onContinueAsMember}
          >
            {t('ctas.continueAsMember')}
          </Button>

          <NotYetAvailable feature="learnMore" className="w-full">
            <Button type="button" variant="outline" size="lg" disabled className="w-full">
              {t('ctas.learnMore')}
            </Button>
          </NotYetAvailable>
        </div>
      </div>

      <WhoIsMindsetterDialog open={explainerOpen} onOpenChange={setExplainerOpen} />
    </div>
  );
}
