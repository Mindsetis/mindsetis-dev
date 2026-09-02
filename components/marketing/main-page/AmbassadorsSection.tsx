import { getTranslations } from 'next-intl/server';

import {
  type AmbassadorApplicationCopy,
  AmbassadorApplicationDialog,
} from './AmbassadorApplicationDialog';
import { type AmbassadorCard, AmbassadorsRegionCarousel } from './AmbassadorsRegionCarousel';
import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';

/* One photo per card, by index. Only four ambassador portraits were exported from Figma, so the
   extra sample cards (added 2026-09-01 so the carousel and the region filter have enough rows to
   exercise) reuse the mindsetter portraits — placeholder art either way, and all of it goes when
   real ambassador data exists. */
const PHOTOS = [
  '/images/main-page/ambassador-1.jpg',
  '/images/main-page/ambassador-2.jpg',
  '/images/main-page/ambassador-3.jpg',
  '/images/main-page/ambassador-4.jpg',
  '/images/main-page/mindsetter-1.jpg',
  '/images/main-page/mindsetter-2.jpg',
  '/images/main-page/mindsetter-3.jpg',
  '/images/main-page/mindsetter-4.jpg',
  // Ninth card reuses the first portrait: the project has eight portrait assets and this row was
  // padded to nine purely so the carousel has something to scroll. It previously pointed at
  // `event-chew-chat.jpg`, an EVENT illustration — a group scene, not a headshot — which read as
  // a broken avatar next to eight real portraits.
  '/images/main-page/ambassador-1.jpg',
];

/**
 * "Mindsetis Ambassadors" — Figma `1235:17759` (heading/subtitle) + the region tab row
 * (`1235:17672`) + four cards (`1235:6791` etc., "Frame 680"…).
 *
 * STAGE 1.13 REBUILD: the tabs and card row are now genuinely wired together (previous pass
 * left the tabs as a static, visual-only row — the four sample cards carried no region data
 * to filter by). Fixed by giving each card a `regions` tag and lifting both the tab row and
 * the `CardSlider` into one client component, `AmbassadorsRegionCarousel` (state has to live
 * above both, since which cards the slider shows depends on which tab is active — the
 * server/client split `WhatIsMindsetisVideo` uses for a single self-contained widget doesn't
 * fit two widgets sharing one piece of state). Figma's own 4 sample cards are still
 * placeholder/marketing content (not real catalog data — there's no "Ambassador" role in this
 * app's data model, see the note at the bottom of this comment), but are now four genuinely
 * different people/locations instead of one shared `sample` object copy-pasted ×4, so the tabs
 * have something real to filter. Region assignment: `usa` (Miami), `europe` (Berlin), `latam`
 * (São Paulo), `asia` (Singapore) — one per non-"All" tab — plus the Miami card is ALSO tagged
 * `northAmerica` (a genuine geographic superset, not an arbitrary duplication) so that fifth
 * tab isn't empty with only 4 total cards to distribute across 5 regions. `messages/en.json`/
 * `messages/es.json` `tabs` changed shape from `string[]` to `{ id, label }[]` — filtering
 * matches on the stable English `id`, never the translated `label`, so switching locale can't
 * silently break which cards a tab shows.
 *
 * Corrections against a fresh re-read of Figma made in the same pass (not just the new
 * filtering logic):
 * - Heading was `text-l` (32px) on mobile — Figma's own mobile heading here is a flat 40px
 *   (`1253:23553`, fontSize 40), the same one-off `text-[40px]` (not the shared `text-l`
 *   token) precedent `TopMindsettersSection`/`MindsetisEventsSection` already established.
 * - Subtitle was flat `text-body` (16px Manrope Regular) at both breakpoints. Figma's own
 *   subtitle (`1235:6784` desktop / `1253:23554` mobile) is Manrope BOLD 16/22 on mobile,
 *   swapping to Cal Sans Regular 22/29 ("M (PC)") on desktop — a real per-breakpoint
 *   typeface/weight change, not a mistake.
 * - The heading→subtitle→button→tabs→cards vertical rhythm was a flat `gap-4`/`mt-10` at
 *   every step. Re-measured off the raw node `y`/`height` values at both breakpoints, the
 *   real gaps are NOT uniform: heading→subtitle 16px mobile / 24px desktop, subtitle→button
 *   16px / 32px, button→tabs 24px / 50px, tabs→cards 24px / 42px — encoded below as distinct
 *   `gap-*`/`mt-*` steps instead of one repeated value.
 * - The glow behind the heading (`Ellipse 25`, `1235:17692` desktop / `1253:23738` mobile —
 *   `rgba(43,184,229,0.3)`, blurred 150px desktop / 60px mobile — a real per-breakpoint blur
 *   radius in the source file, not the same value scaled) didn't exist in the previous build
 *   at all. Added as an absolutely-positioned decorative div inside the heading/subtitle/
 *   button wrapper (which is `relative` for it), positioned relative to that wrapper's own top
 *   edge (= the heading's own top edge, since the heading is the wrapper's first child) rather
 *   than to the page: desktop the ellipse starts 101px above the heading and is 394px tall/
 *   702px wide; mobile it starts 31px above the heading and is 196px tall/343px wide. Both
 *   breakpoints' Figma numbers are declared as `left: calc(50% - width/2)` (centered on
 *   whatever contains it), reproduced as `left-1/2 -translate-x-1/2` rather than a fixed
 *   offset so it stays centered across the whole mobile viewport range, not just exactly
 *   375px.
 *
 * See `AmbassadorsRegionCarousel`'s own doc comment for the card-level Figma corrections
 * (gradient badge pill, 12px photo radius vs. the previous 16px, per-breakpoint text
 * insets/gaps) and for why the card row needs no full-window bleed (unlike
 * `MindsetisEventsSection`) — it fits its own `max-w-[1440px]` content column almost exactly.
 *
 * "Apply for Ambassadorship" opens `AmbassadorApplicationDialog` (Figma's standalone
 * "Ambassador Application - Steps" frame, `1261:16826`) instead of the `ComingSoon`-wrapped
 * disabled stub every other unbuilt CTA on this page uses — STAGE 1.13 explicitly scoped this
 * popup as visual + step-navigation only (no persistence, no backend), so it's real and
 * clickable rather than a placeholder. The trigger button + dialog live together in one client
 * component (parallel to `AmbassadorsRegionCarousel`'s own trigger-lives-with-its-state shape)
 * since this RSC has nowhere to hold `open` state itself; every string the dialog needs is
 * fetched here via `getTranslations` and passed down as `copy`, same as `tabs`/`cards` below.
 *
 * "Ambassador" isn't a role that exists in this app's data model (`account_type`/`staff_roles`)
 * — this section is illustrative marketing content, matching the visitor-facing/pre-signup
 * framing of the rest of this page, not a feature being built here.
 */
export async function AmbassadorsSection() {
  const t = await getTranslations('home.main.ambassadors');
  const tabs = t.raw('tabs') as { id: string; label: string }[];
  const rawCards = t.raw('cards') as Omit<AmbassadorCard, 'photo'>[];
  const cards: AmbassadorCard[] = rawCards.map((card, index) => ({
    ...card,
    photo: PHOTOS[index] ?? PHOTOS[0]!,
  }));
  const applicationCopy = t.raw('application') as AmbassadorApplicationCopy;

  return (
    <section className="w-full py-16 md:py-20 lg:py-24">
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center px-4 text-center sm:px-6 lg:px-[70px]">
        {/* Decorative glow only — excluded from layout/hit-testing and screen readers. It is
            ABSOLUTELY positioned while the copy below is static, and in CSS paint order a
            positioned element paints above non-positioned siblings regardless of DOM order — so
            without `relative z-10` on the two content blocks the blur washes over the heading and
            subtitle. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-31px] left-1/2 h-[196px] w-[343px] -translate-x-1/2 rounded-full bg-[#2bb8e5]/30 blur-[60px] md:top-[-101px] md:h-[394px] md:w-[702px] md:blur-[150px]"
        />
        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6">
          {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
              comment. Negative margin cancels the padding out of flow so the parent `gap-4
              md:gap-6` to the subtitle stays exactly as measured. */}
          <h2
            className={`font-display text-[40px] leading-[0.9] font-normal md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
          <p className="max-w-2xl text-body font-bold text-foreground md:font-display md:text-m md:font-normal">
            {t('subtitle')}
          </p>
        </div>
        <div className="relative z-10 mt-4 md:mt-8">
          <AmbassadorApplicationDialog triggerLabel={t('applyCta')} copy={applicationCopy} />
        </div>
      </div>

      <div className="mt-6 md:mt-[50px]">
        <AmbassadorsRegionCarousel
          tabs={tabs}
          cards={cards}
          prevLabel={t('prevCta')}
          nextLabel={t('nextCta')}
          badgeLabel={t('badgeLabel')}
        />
      </div>
    </section>
  );
}
