'use client';

import { useTranslations } from 'next-intl';

import { WelcomeMindsetterPitchCard } from '@/components/auth/WelcomeMindsetterPitchCard';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';

/**
 * Congrats-screen ("/welcome") body — Figma "Congrats screen" `387:3000` (desktop) /
 * `421:3523` (mobile), the frame confirmed correct 2026-08-18 after two prior misreads that
 * targeted a different, same-named "Congrats screen" frame (`421:3798`/`387:3288`) — see
 * `/welcome/page.tsx`'s own doc comment.
 *
 * Everything is on screen at once, no phases: the "What's the difference between Member and
 * Mindsetter?" white pill (Figma "Frame 659", `1182:36162`) is a plain caption over the card;
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
 * - The white pill used to open `WhoIsMindsetterDialog` ("Who is Mindsetter?"). Per the owner's
 *   call on 2026-09-19 it must no longer open a popup, so it is now static text with the same
 *   look — not a button, not focusable, no pointer cursor. `WhoIsMindsetterDialog.tsx` is kept
 *   (nothing renders it) in case the explainer comes back; its `auth.welcome.whoIsMindsetter.*`
 *   keys stay too, and `trigger` is still the caption below.
 * - "Apply for Mindsetter" → `/mindsetter-onboarding/roles`, the only remaining entry point into
 *   the flow on this screen.
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

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Figma: white bg, black text, Cal Sans 22px on desktop but plain Manrope 16px/bold on
          mobile. Was a `Button` (ghost, fully reskinned) while it opened the explainer dialog;
          now that it opens nothing it is a paragraph, which drops the button's interactive
          affordances (cursor, focus ring, hover/active color shifts, screen-reader "button"
          role) while keeping the pill's exact box: the flex parent stretches a block-level `p`
          to the same full width the `inline-flex` button got, and the height stays
          content-driven off the same paddings (2-line wrap on mobile vs 1 line on desktop). */}
      <p className="rounded-xl bg-white px-4 py-3 text-left font-sans text-base font-bold text-black md:px-6 md:py-4 md:font-display md:text-[22px] md:font-normal">
        {t('whoIsMindsetter.trigger')}
      </p>

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
    </div>
  );
}
