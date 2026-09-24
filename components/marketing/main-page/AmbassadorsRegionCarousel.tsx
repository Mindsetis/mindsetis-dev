'use client';

import { useState } from 'react';

import { LanguageBubbleIcon, LocationPinIcon } from '@/components/icons/profile-meta-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { cn } from '@/lib/utils';

export type AmbassadorRegionTab = {
  /** Stable, locale-independent key ("all" | "usa" | "europe" | "latam" | "northAmerica" |
   *  "asia") — filtering matches on this, never on the translated `label`, so switching
   *  locale can never silently break which cards a tab shows. */
  id: string;
  label: string;
};

export type AmbassadorCard = {
  name: string;
  title: string;
  location: string;
  languages: string;
  /** ISO 3166-1 alpha-2, lowercase — resolves to `/images/flags/<code>.svg`. */
  countryCode: string;
  /** One or more `AmbassadorRegionTab.id`s this ambassador matches. A plain string (not
   *  `region`) because Figma's own 4 sample cards don't carry region data to begin with —
   *  see `AmbassadorsSection.tsx`'s doc comment for how these were assigned. Miami is
   *  tagged `["usa", "northAmerica"]` (a real geographic superset, not an arbitrary
   *  duplication) so all 5 non-"All" tabs have at least one card with only 4 total cards. */
  regions: string[];
  photo: string;
};

type AmbassadorsRegionCarouselProps = {
  tabs: AmbassadorRegionTab[];
  cards: AmbassadorCard[];
  prevLabel: string;
  nextLabel: string;
  /** Shared "Ambassador" pill label — the per-card flag is an SVG chosen by `countryCode`. */
  badgeLabel: string;
};

const ALL_TAB_ID = 'all';

/**
 * Region tabs (Figma `1235:17672`, "Tabs") + the ambassador card row (`1235:6791`, "Frame
 * 680" ×4) as one client island: the CardSlider's card list depends on which tab is active,
 * so the two can't be split across the server/client boundary the way `WhatIsMindsetisVideo`
 * splits a single self-contained widget — the state has to live above both.
 *
 * Tabs are plain `<button>`s with `aria-pressed` (toggle-button pattern, not a full
 * `role="tablist"`/roving-tabindex implementation — Figma's own "Tab" component is a simple
 * single-select filter row, not a tabbed-panel widget with distinct panel semantics) — every
 * `<button>` is independently focusable/operable by keyboard by default, satisfying "keyboard
 * operable" without the added complexity of arrow-key roving focus a real ARIA tablist needs.
 */
export function AmbassadorsRegionCarousel({
  tabs,
  cards,
  prevLabel,
  nextLabel,
  badgeLabel,
}: AmbassadorsRegionCarouselProps) {
  const [activeTabId, setActiveTabId] = useState(ALL_TAB_ID);

  const filteredCards =
    activeTabId === ALL_TAB_ID ? cards : cards.filter((card) => card.regions.includes(activeTabId));

  // Below `lg:` this whole block is full-bleed — the section is `w-full` and the row runs to the
  // screen edge, matching Figma's mobile frames. At `lg:` it is contained again: the wrapper takes
  // the page column and its 70px padding, and the per-card margins + `scroll-padding` below switch
  // off, so the row starts and ends on the content grid instead of the viewport edge.
  return (
    <div className="lg:mx-auto lg:max-w-[1440px] lg:px-[70px]">
      {/* STAGE 1.13 RE-VERIFICATION FIX (customer-requested full re-check): the previous build
          got this row structurally wrong on every axis — re-measured directly off the raw
          Figma nodes (`1235:17672` "Tabs" + `1235:17673`-`1235:17689` "Tab" x6, confirmed live
          via `get_nodes_info`, not just the CSS dump) rather than approximating with a
          wrapping pill row:
          - each `Tab` is a FIXED-width column (120px desktop / 100px mobile — not
            content-width), `padding: 4px 4px 0` + `8px` gap between the label and a SEPARATE
            "Indicator" element — not a `<button>` sized to its own text with a `text-decoration`
            underline. 6 tabs × (120 + 16 gap) − 16 = 800px desktop / 6 × (100 + 16) − 16 = 680px
            mobile — exactly the "Tabs" frame's own measured width at both breakpoints, so the
            row's width is left to size itself from its fixed-width children (`w-max`) rather
            than being hardcoded, which also means it stays correct if a tab is ever added or
            removed.
          - the Indicator is present on EVERY tab, active or not (confirmed on all 6 instances,
            not just the active one) — active is `#79b9e3` (`bg-primary`) at 2px tall, inactive is
            a flat `#2a2a2a` (no matching design token, kept as an arbitrary value like this
            file's other one-off Figma hexes) at 1.5px tall. It has `align-self: stretch` in
            Figma's own auto-layout (i.e. it spans the tab's content width, tab-width minus the
            4px+4px horizontal padding) — reproduced as `w-full` inside the padded column rather
            than a second hardcoded 112px/92px constant, so it can never drift out of sync with
            the tab width above it.
          - Figma's own mobile "Tabs" frame (`left: calc(50% - 680px/2 + 168.5px)`, which resolves
            to exactly `16px` — i.e. flush at the page's own standard mobile gutter) is 680px wide
            against a 375px frame: the row is a genuine horizontal carousel on mobile, not a
            wrapping grid. `flex-wrap` (which broke it onto multiple rows) is gone; the outer div
            is `overflow-x-auto` instead, scrollbar hidden via Tailwind arbitrary variants (no new
            CSS module — `MindsetterProfileView.module.css`'s `.sliderTrack` hides it the same way
            for a different component, but isn't reused across files). No `vw` anywhere (the
            `MindsetisEventsSection` scrollbar-gutter lesson): this row never bleeds past the
            section's own `px-4 sm:px-6 lg:px-[70px]` column the way the card track does, so it
            never needs one — the scrollable area is simply `w-full` of its already-padded parent.
          - centering behavior falls out of the CSS itself rather than being branched per
            breakpoint: `mx-auto` on the fixed-width (`w-max`) inner row centers it whenever the
            padded column is wider than the row (desktop, 800px row in a ≥1160px-wide 1300px
            column) and safely resolves to 0 (flush-left, scrollable) whenever the column is
            narrower than the row (mobile, 680px row in a 343px visible column after the 16px×2
            gutter) — which is exactly Figma's own two states (centered desktop / flush-left-then-
            overflowing mobile) with no extra logic. */}
      {/* The section itself is now `w-full` (only its heading column is capped), so this row
          supplies its own LEFT page gutter and simply runs off the right edge below `lg:` —
          matching Figma, whose mobile `Tabs` frame starts at 16px and is 680px wide inside a
          375px screen, leaving the 4th tab cut by the screen. That sliver is the affordance
          telling you the row scrolls; a symmetric gutter hides it and the row reads as static.
          At `lg:` the padding is symmetric again so `mx-auto` can centre the row, which is what
          Figma does there. Scrollbar hidden via arbitrary variants — no new CSS module, and
          `MindsetterProfileView.module.css` (another section's file) stays untouched. */}
      <div className="overflow-x-auto pl-4 sm:pl-6 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max items-start gap-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveTabId(tab.id)}
                className="flex w-[100px] shrink-0 flex-col items-center gap-2 px-1 pt-1 transition-colors md:w-[120px]"
              >
                <span
                  className={cn(
                    'text-body leading-[22px] whitespace-nowrap',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </span>
                {/* "Indicator" — a real 2px/1.5px bar, not a text underline (see doc comment). */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-0.5 w-full rounded-full',
                    isActive ? 'bg-primary' : 'h-[1.5px] bg-[#2a2a2a]',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 md:mt-[42px]">
        <CardSlider
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          trackClassName="scroll-pl-4 gap-4 sm:scroll-pl-6 md:gap-5 lg:scroll-pl-0"
          // Figma "Frame 684"/"Frame 231" (the prev/next arrow pair below the card row): 16px
          // gap between the two 48px circular buttons — `CardSlider`'s own default is 12px
          // (`gap-3`, correct for every OTHER caller, but not this one).
          arrowGapClassName="gap-4"
          scrollStep="item"
        >
          {/* The row runs to the true screen edge at every width: the section is `w-full` and only
              its heading column is capped at 1440px, so this track is already full-width and needs
              no break-out (and no `vw`, which counts the scrollbar and shifted MindsetisEvents by
              7.5px). The page gutter comes back as `scroll-padding` on the track plus a margin on
              the first/last card — the same shape Events uses, and the same one that replaced the
              spacer-item approach on the Mindsetter profile on 2026-08-06 (spacers carry their own
              snap point a gutter away from the card grid, which made one press travel a
              card-pitch-plus-a-gutter). Figma's mobile row starts at the 16px gutter and simply
              continues off-frame, so the next card is meant to be cut by the screen, not by a
              padded container. */}
          {filteredCards.map((card, index) => (
            <div
              key={card.name}
              className={cn(
                'flex w-[275px] shrink-0 snap-start flex-col gap-3 rounded-2xl bg-card pt-2 pr-2 pb-4 pl-2 md:w-[310px] md:gap-4',
                index === 0 && 'ml-4 sm:ml-6 lg:ml-0',
                index === filteredCards.length - 1 && 'mr-4 sm:mr-6 lg:mr-0',
              )}
            >
              {/* `aspect-[3/4]` comes from the client's Release-1 list (H5), NOT from a Figma
                  node: the design pins a fixed photo height, which made the ratio drift between
                  breakpoints (275×220 ≈ 1.25:1 on mobile vs. 310×300 ≈ 1.03:1 from `md`) and
                  cropped faces. A single portrait ratio was the requested fix, so the height now
                  follows the card width instead of the other way round. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
              <img
                src={card.photo}
                alt=""
                className="aspect-[3/4] w-full rounded-lg object-cover"
              />
              {/* Figma `Frame 558`: `padding: 0 16px` / `gap: 16px` desktop vs. `padding-left:
                  8px` (no right padding) / `gap: 8px` mobile — a real per-breakpoint difference
                  in the source file, not an approximation. */}
              <div className="flex flex-col gap-2 pl-2 md:gap-4 md:px-4">
                {/* Figma `Frame 229`: gradient pill (`#1a1a1a` → `#bf9720`), not a flat
                    translucent yellow — `84px` corner radius is visually a full pill at this
                    height, so `rounded-full` reproduces it without a numeric mismatch. */}
                {/* The flag is a real SVG asset, NOT the regional-indicator emoji Figma uses
                    (`🇺🇲 Ambassador`). Windows has no colour flag glyphs — Chrome there falls back
                    to drawing the two letters of the country code ("UM", "EU"), verified in-browser
                    via a canvas ligature-width test. The SVGs come from `flag-icons` (MIT); only
                    the eight countries actually used are vendored into `public/images/flags/`, so
                    there is no runtime dependency. Figma's own emoji were also wrong — 🇺🇲 is the
                    U.S. Minor Outlying Islands, not the USA, and Berlin carried 🇪🇺. */}
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#fbf286] bg-[linear-gradient(90deg,_#1a1a1a_25.77%,_#bf9720_100%)] px-2 py-0.5 text-tiny text-[#fbf286]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
                  <img
                    src={`/images/flags/${card.countryCode}.svg`}
                    alt=""
                    className="h-3 w-4 shrink-0 rounded-[1px] object-cover"
                  />
                  {badgeLabel}
                </span>
                {/* `Frame 556`: 8px gap desktop, 4px mobile (`1253:23709`'s `y: 26` against its
                    22px-tall name block above it) between the name block and the location/
                    language row. */}
                <div className="flex flex-col gap-1 md:gap-2">
                  {/* Name: mobile is Manrope Bold 16/22 ("MOB/button text"), desktop swaps to
                      Cal Sans 22/29 ("M (PC)") — same per-breakpoint typeface/weight switch as
                      `TopMindsettersSection`'s own card name.
                      `card.title` (the "CEO, TechFlow Agency, Event Industry" job-line) is
                      deliberately NOT rendered here: re-verified against the raw Figma node —
                      that text layer is explicitly `display: none` at BOTH breakpoints, and
                      `Frame 556`'s own declared height (56px desktop / 42px mobile) only adds up
                      when it's excluded from the layout (`29(name)+8(gap)+19(geo row)=56`;
                      `22+4+16=42` — including the hidden ~19/16px title line would overshoot
                      both). So the card design genuinely has no job-title line under the name —
                      the field stays on `AmbassadorCard`/in `messages/*.json` (harmless, not
                      rendered) rather than being deleted, in case a future pass re-enables it. */}
                  <span className="text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal">
                    {card.name}
                  </span>
                  <div className="flex items-center gap-3 text-tiny text-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LocationPinIcon className="size-3.5 text-primary" />
                      {card.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LanguageBubbleIcon className="size-3.5 text-primary" />
                      {card.languages}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardSlider>
      </div>
    </div>
  );
}
