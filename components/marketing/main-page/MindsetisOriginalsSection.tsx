import { getTranslations } from 'next-intl/server';

import { ForwardEndFillIcon, PlayFillIcon } from '@/components/icons/main-page-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/** Card photo per card, in the same order as the `originals.cards` translation array. STAGE 1.13,
 * FOURTH CUSTOMER PASS: all three of these previously "confirmed absent from Figma" — that
 * conclusion was WRONG, caused by looking in the wrong place. Every earlier pass (including the
 * four-method re-verification this comment used to document at length) only ever inspected the
 * CARD's own subtree (`1234:6230`/`1255:24036` for card 3, and their card-1/2 siblings) — real
 * photo rectangles that render as `RECTANGLE` nodes with no populated `fills` in this API and no
 * exportable pixels, because the actual artwork isn't attached to those nodes at all.
 *
 * The customer pointed at the real location directly: a SEPARATE, unrelated top-level frame also
 * named "Frame 702" (id `3054:23128`, bounds `x:6771,y:5488, w:2287,h:350`, found via `search_nodes`
 * across the whole document — this file has multiple frames sharing the name "Frame 702", most of
 * which are unrelated UI, e.g. a footer-links frame and a different "event formats" card row; only
 * this one holds the Originals artwork). It contains three ready-made card mockups laid out exactly
 * in `REALITY SHOW → INTERVIEW → BREAKDOWN` order, each a 749×350 "Frame 66x" holding its own
 * 309×350 `Rectangle 3` photo (`3054:23130` / `3054:23156` / `3054:23182`) plus a 48×48 circular
 * avatar `Rectangle 3` (`3054:23144` / `3054:23170` / `3054:23196`) — i.e. this is a hand-assembled
 * preview mock of the finished cards, not the live component instances the actual card row uses,
 * which is exactly why searching only inside the card row's own subtree never found it. All three
 * photo rectangles export real pixels (609 KB/739 KB/616 KB PNG at 2× — 618×700, exactly double the
 * rendered 309×350 slot). Cards 1–2's exports are byte-identical to the images already saved here
 * from an earlier pass (re-diffed directly), so only card 3 needed a new asset:
 * `originals-breakdown.jpg` (same 618×700 crop, sourced from `3054:23182`) replaces the
 * `event-brain-lab.jpg` stand-in borrowed from `MindsetisEventsSection.tsx`. Note the image's own
 * baked-in caption still reads "WTF: Who is The Founder / INTERVIEW" even though this card's copy
 * is "BREAKDOWN" / "BUILT NOT BORN..." — that mismatch is IN THE SOURCE FRAME itself (a reused
 * production still), not a mis-pick on this end; used as-is per "take Figma content verbatim". */
const PHOTOS = [
  '/images/main-page/originals-reality-show.jpg',
  '/images/main-page/originals-interview.jpg',
  '/images/main-page/originals-breakdown.jpg',
];

/** Card 1–3's Figma avatar instances ("Anastasia Kondratska") are the exact same photo — confirmed
 * directly this pass by exporting all three `Rectangle 3` avatar nodes from `Frame 702`
 * (`3054:23144`/`3054:23170`/`3054:23196`, see the `PHOTOS` doc comment above for where that frame
 * is) and comparing their bytes: identical (MD5-matched), not just visually similar. So all three
 * cards, including the third, genuinely share one avatar image in the source file itself — this
 * isn't a placeholder-for-a-missing-asset, it's the real content, and `originals-avatar.jpg` (saved
 * from that same shared node in an earlier pass) is correct for all three slots as-is. */
const AVATAR_PHOTOS = [
  '/images/main-page/originals-avatar.jpg',
  '/images/main-page/originals-avatar.jpg',
  '/images/main-page/originals-avatar.jpg',
];

/** Card 2's own Figma title node ("WTF: \nWho is The Founder") carries a real `\n` break ONLY in
 * the mobile mock (`1255:23935`) — the desktop node (`1234:6199`) is the byte-identical text
 * WITHOUT a break ("WTF: Who is The Founder"), confirmed by reading both `characters` fields
 * directly. Card 1's break ("MINDSETTERS - Building Reality \nfrom Within") is present at BOTH
 * breakpoints (`1189:6139` desktop / `1255:24003` mobile, byte-identical). So the translation
 * carries the mobile (superset) string with `\n`, and only card 2's title element additionally
 * gets `md:whitespace-normal` (which collapses the `\n` back into a single line) — see the
 * `whitespace-pre-line` + per-index override on the title element below. */
const MOBILE_ONLY_TITLE_BREAK_INDEXES = new Set([1]);

/**
 * "MINDSETIS ORIGINALS" — Figma `1188:5990` (heading, desktop) / `1253:23743`+parent (mobile) +
 * `1235:6526` "Frame 672" (the three cards, desktop) / `1255:24045` "Frame 718" (mobile).
 *
 * SCOPE (stage 1.13): this is the ONE section `MainPageSection.tsx`'s own doc comment previously
 * flagged as deliberately skipped — its third card is literally titled "BUILT NOT BORN |
 * MasterClass — The De-Risking Playbook", the Figma working name for the Phase-2/out-of-scope
 * "BUILT NOT BURN" feature CLAUDE.md says not to build unless asked. The customer has now
 * EXPLICITLY asked for this section by name ("Давай тепер зробимо блок The people you'll actually
 * talk to"), so it's built here on that direct instruction — see `MainPageSection.tsx`'s own doc
 * comment for the updated scope note. Nothing else about the Phase-2 "BUILT NOT BURN" feature
 * (payouts, standalone masterclass catalog, etc.) is implied or built — this is only the one
 * static video-teaser card Figma happens to have grouped under this section.
 *
 * HEADING TEXT IS A VERBATIM DUPLICATE OF `TopMindsettersSection`'s OWN HEADING. Both this
 * section's `1188:5996` and Top Mindsetters' `1187:5886`/`552:5684` carry the byte-identical
 * string "The people you'll actually talk to" (re-read directly off both nodes' `characters`
 * field, not assumed) — a genuine Figma content duplication, not a build mistake here (same
 * category of duplication already documented elsewhere in this file tree — Top Mindsetters' own
 * four identical "Anastasia Kondratska" cards, every Ambassador-adjacent placeholder, etc.). Used
 * verbatim per instruction to take copy from Figma as-is, under this section's OWN i18n key
 * (`home.main.originals.title`) rather than reusing Top Mindsetters' key — the two sections are
 * logically distinct even though Figma gave them matching copy.
 *
 * KEY POINTS LABEL: every card's Figma `Frame 583` contains a "KEY POINTS" text node
 * (`1189:6131`/`1234:6189`/`1234:6232` desktop, `1255:24006` etc. mobile) whose raw CSS dump
 * carries `display: none` — confirmed against the actual rendered `get_screenshot` output (not
 * just the dump): the label is genuinely invisible in every card, at both breakpoints, so it is
 * not rendered here. The topic PILLS below it (`Frame 582`) ARE visible, so those ARE rendered.
 *
 * TOPIC PILLS — CONTENT AND WRAPPING. Every card's `Frame 582` holds five "topic" component
 * instances, but only the first two occupy distinct, non-overlapping positions; the other three
 * sit stacked exactly on top of each other/off the visible pair (`1189:6135`/`6136`/`1228:6153`
 * for card 1, same pattern for cards 2–3) — a duplicate-instance leftover, not real content, so
 * only the two genuinely-positioned pills render. Their copy ("#Finding my first paying
 * customers", "#Raising a seed round") is IDENTICAL across all three cards in Figma itself (same
 * duplicate-placeholder pattern as the shared avatar name below), so one shared
 * `home.main.originals.topics` pair is used for every card instead of tripling identical JSON.
 * Figma declares each pill a FIXED width (220px/150px) that would fit side by side in the 400px
 * row, but the live `get_screenshot` render shows them stacked one-per-line instead — the actual
 * glyph width of "#Finding my first paying customers" at 12px Manrope exceeds its declared 220px
 * frame, pushing the wrap past 400px. Built with real `flex-wrap` and content-hugging pill widths
 * (not the stale fixed-width numbers) so the browser reproduces that same genuine wrap instead of
 * a pixel-matched-but-wrong side-by-side row.
 *
 * SHARED AVATAR: all three cards' avatar photo and "Anastasia Kondratska" name are the exact same
 * Figma content (not just similar — MD5-identical exports, see `AVATAR_PHOTOS`'s own doc comment)
 * — same "one shared entry, not N duplicate i18n entries" precedent as `TopMindsettersSection`'s
 * own `sample` object.
 *
 * MOBILE-ONLY IMAGE NOTE: Figma ships a mobile-specific crop for card 1's photo (a valid, well-
 * composed 320×180 landscape reframe with its own baked-in "MINDSETTERS." title lockup) and for
 * card 2 (`1255:23960`) — but card 2's mobile crop exports as a ~7 KB degenerate sliver (a few
 * repeated horizontal bands, re-verified at both 1x and 2x export scale, not an export glitch) —
 * genuinely broken source content, not something to reproduce. Rather than mixing per-breakpoint
 * image sources for card 1 only, every card reuses its single DESKTOP crop at both breakpoints via
 * `object-cover` — the same one-photo-per-card precedent `MindsetisEventsSection`/
 * `TopMindsettersSection` already use, and the only option that doesn't invent a fix for card 2's
 * broken mobile source.
 *
 * LAYOUT: mobile/tablet cards stack (photo on top, content below, Figma `1255:24045`); `md:`+ they
 * switch to Figma's desktop recipe (309px-wide photo beside a content column, Figma `1235:6526`) —
 * same breakpoint convention `MindsetisEventsSection`/`TopMindsettersSection` already use for their
 * own card-size switch, since Figma only ships a 375px and a 1440px mock (no distinct tablet
 * frame). The avatar+CTA row (and, desktop-only, the `#2a2a2a` divider above it — Figma has no
 * matching divider on the mobile card, `1255:23998` has no such child) is pushed to the bottom of
 * the card via `mt-auto`, so it stays pinned to the same edge regardless of how many lines a given
 * card's description wraps to — same technique `MindsetisEventsSection` uses to align its own
 * per-card CTA.
 *
 * SLIDER: Figma's own row is far wider than its content column at every breakpoint (desktop
 * `1235:6526` 3×749px cards + 2×20px gaps = 2287px vs. a 1300px column; mobile `1255:24045` 3×320px
 * + 2×16px = 992px vs. 343px) — reuses `CardSlider`. STAGE 1.13, SECOND CUSTOMER PASS (2026-09-01):
 * the track must bleed to the FULL WINDOW at every breakpoint (mobile included), not just stop at
 * the 1440px content column — copied `MindsetisEventsSection.tsx`'s own full-bleed recipe verbatim
 * (see that file's doc comment item 3 for the full derivation), replacing an earlier CONTAINED-
 * column pass here that kept the track capped at `lg:mx-auto lg:max-w-[1440px] lg:px-[70px]`
 * (measurably wrong per the customer: the row must run to the screen edge, not stop at the 1440px
 * grid). Concretely: the track wrapper is now a PLAIN sibling of the heading's own
 * `mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[70px]` column (no width cap of its own at any
 * breakpoint) — `left: 0`/`right: <track's own clientWidth>` on every width, exactly matching
 * Events. The FIRST/LAST card still parks on the 1440px content grid line (16px mobile/tablet,
 * `max(70px, calc((100% - 1440px) / 2 + 70px))` desktop — `100%` is the track's own now-full-width
 * box, so the formula lands on the same grid line the heading sits on even past 1440px) via a
 * margin on those two cards plus a matching `scroll-pl-*` on the track (so a snapped card still
 * parks ON the grid, not flush against the bled screen edge) — same split as Events'
 * `.reviewsFirstCard`/`.winsFirstCard`-style formula. Deliberately in `%`, never `vw` — `vw` counts
 * the scrollbar gutter but the content box doesn't, which is exactly the 7.5px/8px
 * `scrollWidth`-vs-`clientWidth` overflow bug Events' own doc comment already documents and rules
 * out for this same pattern.
 *
 * RADIUS: the per-pill (`Frame 582` "topic") and duration-badge (`Frame 424`) corners are Figma's
 * own 8px — neither this codebase's overridden `rounded-lg` (12px) nor `rounded-md` (9px) lands on
 * that value (see `app/styles/tokens/radius.css`), so both use the explicit arbitrary
 * `rounded-[8px]` rather than the nearest token.
 *
 * DURATION BADGE ("32 min", `Frame 424`) POSITION — STAGE 1.13, SECOND CUSTOMER PASS: re-measured
 * on all three cards, both breakpoints, relative to the CARD (not the page) — identical on every
 * card at a given breakpoint, but different PER BREAKPOINT, which the previous build missed (it
 * used one flat `top-2 left-2` everywhere):
 *   - mobile (`1255:23891` card 1 / `1255:24031` card 2 / `1255:24040` card 3, badge frame itself
 *     e.g. `1255:23891`'s own parent `Frame 424`): `x=8, y=8` relative to the 320×180 photo box
 *     (the badge's own direct parent IS the photo wrapper on mobile) → `top-2 left-2` (8px), kept;
 *   - desktop (`1229:6173`/`1234:6206`/`1234:6249`): `x=20, y=20` — but relative to the 749×350
 *     CARD frame, not a photo sub-wrapper (the badge is a direct sibling of the photo rectangle at
 *     the card's own top level on desktop) — since the photo starts at `x:0, y:0` inside the card,
 *     this still lands 20px from the photo's own top-left corner, just a bigger inset than mobile's
 *     8px. The previous build never added a desktop override, so it rendered 8px in on desktop too
 *     — fixed to `md:top-5 md:left-5` (20px). Badge internals (icon 16×16, `gap-2` 8px, `px-2 py-1`
 *     padding, `rounded-[8px]`, white 1px border, 12px/16px text) were already correct at both
 *     breakpoints — Figma's own padding (4px/8px/4px/8px), icon-to-text gap (8px), and `MOB/tiny
 *     simple` 12px text style don't change per breakpoint either, confirmed against all three
 *     cards' badge nodes directly.
 *
 * TYPE: per-card eyebrow ("REALITY SHOW" etc., "micro spacing (PC)") and description ("tiny simple
 * (PC)") are a flat 11px/14px at BOTH breakpoints in Figma (re-checked the mobile card nodes
 * directly — they carry the SAME style names, not `MOB/`-prefixed variants), so both use explicit
 * pixel values rather than the auto-shrinking `text-tiny`/`text-body` tokens — same "explicit value
 * over token" precedent as `TopMindsettersSection`'s "Verified" pill and job-title line. Card
 * title/name switch style per breakpoint for real (`MOB/button text` 16/22 Manrope Bold mobile →
 * `M (PC)` 22/29 Cal Sans desktop for titles; the avatar name stays the flat Manrope Bold 16/22 at
 * both).
 *
 * STAGE 1.13, THIRD CUSTOMER PASS (2026-09-01) — four fixes:
 *
 * 1. "ALL VIDEOS" BUTTON — genuinely present in Figma and previously missed. Its parent frame
 *    ("Secondary - 2a") IS present under this section's own heading block at both breakpoints —
 *    mobile `1253:23746` (inside `Frame 713`, `1255:23923`, right after the eyebrow+title block,
 *    24px gap, full 343px width, matching the raw dump's `Secondary - 2a` at line 289) and desktop
 *    `1188:6020`. The dump's own label ("Book a Session") is the INSTANCE's default/component name,
 *    not the override — read the node's real `characters` field directly instead (`I1253:23746;
 *    261:3408` / `I1188:6020;261:3408`): both say **"All videos"**, not "All events" (that string
 *    belongs to a different button, `1258:24054`/`1229:6179`, under the Events section — confirmed
 *    by cross-checking both node IDs and their siblings). Desktop bounds (`1188:6020`:
 *    `x:1220,y:5408,w:150,h:56`) sit exactly bottom-aligned with the heading block (`1188:5990`:
 *    `x:70,y:5283,w:674,h:181` → bottom edge `y:5464`, matching the button's own `5408+56=5464`)
 *    and right-flush with the 1300px content column (`70..1370` on a 1440px canvas, button right
 *    edge `1220+150=1370`) — i.e. the exact same "heading left, 150px CTA bottom-right" recipe
 *    `MindsetisEventsSection.tsx` already uses for its own (Figma-absent) "All events" button, so
 *    the header row switches to that same `md:flex-row md:items-end md:justify-between` split.
 *    Styling matches the dump: transparent fill, gradient border, `#79B9E3` text, `border-radius:
 *    12px`, `padding: 15px 20px` — i.e. `Button`'s `primaryOutline` variant at `default` size,
 *    same as Events' own CTA. No `/originals` or video-catalog route exists yet, so it's wrapped in
 *    `NotYetAvailable` and kept live-looking via `aria-disabled` + `pointer-events-none` rather than the
 *    `disabled` attribute — `disabled` flattens `primaryOutline`'s gradient border to a plain grey
 *    (see `button.tsx`'s `disabled:` variants), which is exactly the regression already hit and
 *    fixed on Events' own "All events" button.
 *
 * 2. THIRD CARD PLACEHOLDER IMAGES — SUPERSEDED, see the FOURTH CUSTOMER PASS note below and the
 *    `PHOTOS`/`AVATAR_PHOTOS` doc comments above: the "no image in Figma" conclusion this item
 *    originally recorded was wrong (looked in the wrong subtree), and the temporary
 *    `event-brain-lab.jpg` stand-in it describes has since been replaced with the real asset. Left
 *    in place, not deleted, so the history of what was tried and why stays legible.
 *
 * 3. MOBILE PHOTO CROP — `object-top` on mobile, `md:object-center` on desktop. The saved asset
 *    files (`originals-reality-show.jpg`/`originals-interview.jpg`, 618×700 px, confirmed via a
 *    direct JPEG-header read) are exactly the DESKTOP 309×350 crop Figma ships (350/309 ≈ 700/618),
 *    so `object-cover` in the `md:h-full md:w-[309px]` box never crops at all on desktop — position
 *    is moot there, `object-center` is correct (and harmless) by construction. On mobile the box is
 *    320×180 (a much wider, shorter aspect than the 618×700 portrait asset); a default center crop
 *    keeps the vertical MIDDLE of the image — which is roughly collarbone/shoulder height on both
 *    photos (confirmed by rendering both crops directly, see the stage-1.13 report) — cutting off
 *    the subjects' faces entirely, exactly the customer's complaint. `object-top` instead keeps the
 *    photo's own top edge (where both faces sit), matching the intent of Figma's own dedicated
 *    mobile crop for card 1 (a top-weighted 320×180 reframe) even though that specific mobile asset
 *    isn't reused here (see the `MOBILE-ONLY IMAGE NOTE` doc comment above for why).
 *
 * 4. DURATION BADGE SHADOW ON MOBILE — re-checked directly on the mobile card nodes (`Frame 424`
 *    inside `Frame 715`/`Frame 716`, the mobile equivalents of cards 1–2): both carry
 *    `filter: drop-shadow(0px 4px 12.3px rgba(111, 186, 237, 0.8))`, BYTE-IDENTICAL to the desktop
 *    badge's own shadow value. The badge `<div>` below already applies `shadow-glow-primary-outline`
 *    (`0 4px 12px 0 rgba(111, 186, 237, 0.8)`, effectively the same value — the codebase already
 *    treats 12px/12.3px as the same number, see this same badge's own desktop-position precedent)
 *    with NO `md:` prefix gating it to desktop-only — so this fix was already in place from the
 *    prior pass; re-verified rather than re-applied, nothing to change here.
 *
 * STAGE 1.13, FOURTH CUSTOMER PASS (2026-09-01): the customer supplied the missing pointer directly
 * — "Frame 702 has all the slide images" — after item 2 above concluded (across four independent
 * export methods) that the third card's photo/avatar didn't exist in the source file. That
 * conclusion was a false negative caused by scope, not a real gap: every method only ever looked
 * INSIDE the card row's own component subtree, where the photo is a `RECTANGLE` node whose artwork
 * genuinely isn't attached there. The actual images live in a completely separate, unrelated-by-
 * position top-level frame that happens to share the name "Frame 702" with several other unrelated
 * frames in this file (a footer-links block, a different "event formats" card row) — found only by
 * `search_nodes`-ing the whole document for that literal name and checking every match's actual
 * content. See the `PHOTOS`/`AVATAR_PHOTOS` doc comments above for the resolved node IDs and what
 * was replaced. LESSON FOR THE NEXT PASS: when a "no image in Figma" conclusion is reached, treat it
 * as provisional until a whole-document name search has been tried — this file's node-naming reuses
 * generic names ("Frame 702", "Rectangle 3", "Frame 676") liberally, so a card's own subtree not
 * having art doesn't mean the art doesn't exist elsewhere under the same or a similar name.
 */
export async function MindsetisOriginalsSection() {
  const t = await getTranslations('home.main.originals');
  const cards = t.raw('cards') as { eyebrow: string; title: string; description: string }[];
  const topics = t.raw('topics') as string[];
  const personName = t('personName');

  return (
    <section className="w-full py-16 md:py-20 lg:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-[70px]">
        <div className="flex flex-col gap-6">
          <SectionEyebrow
            icon={<ForwardEndFillIcon className="size-3 md:size-4" />}
            label={t('eyebrow')}
          />
          {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
              comment. Negative margin cancels the padding out of flow so the parent `gap-6` to
              the CTA button stays exactly as measured. */}
          <h2
            className={`font-display text-[40px] leading-[0.9] font-normal md:max-w-[674px] md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
        </div>
        {/* "All videos" — real Figma button (`1188:6020` desktop / `1253:23746` mobile), see the
            top-level doc comment item 1 for the node-level proof of its real label. No video-catalog
            route exists yet, so it is a plain `disabled` button inside `NotYetAvailable` — the project's
            own convention for an unbuilt gradient-border CTA (`WelcomeMemberCtas.tsx` does exactly
            this with the same `primaryOutline` variant). `disabled` deliberately flattens the
            gradient border, mutes the label and drops the glow: a coming-soon control should read
            as unavailable at a glance, not merely refuse the click. */}
        <NotYetAvailable feature="originals" className="w-full md:w-[150px] md:shrink-0">
          <Button variant="primaryOutline" size="default" disabled className="w-full">
            {t('viewAllCta')}
          </Button>
        </NotYetAvailable>
      </div>

      {/* Figma gap from the heading block to the card row: 32px mobile / 50px desktop — same
          measured pattern as the sibling Main Page sections' own (section-own, not shared) gap.
          The track wrapper is a plain full-width sibling of the heading's own capped column (see
          the SLIDER doc comment above) — no width cap of its own at any breakpoint. */}
      <div className="mt-8 md:mt-[50px]">
        <CardSlider
          prevLabel={t('prevCta')}
          nextLabel={t('nextCta')}
          // No padding/negative-margin/width-compensation on the track itself — the gutter comes
          // purely from `scroll-pl-*` (snap alignment) plus a margin on the first/last card below,
          // same split as `MindsetisEventsSection.tsx`'s own track.
          trackClassName="gap-4 scroll-pl-4 sm:scroll-pl-6 md:gap-5 lg:scroll-pl-[max(70px,calc((100%_-_1440px)/2_+_70px))]"
          scrollStep="item"
        >
          {cards.map((card, index) => {
            const photo = PHOTOS[index];
            const avatarPhoto = AVATAR_PHOTOS[index];
            const isFirst = index === 0;
            const isLast = index === cards.length - 1;
            return (
              <div
                key={card.eyebrow}
                className={cn(
                  'flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-card md:w-[749px] md:flex-row md:rounded-3xl',
                  isFirst && 'ml-4 sm:ml-6 lg:ml-[max(70px,calc((100%_-_1440px)/2_+_70px))]',
                  isLast && 'mr-4 sm:mr-6 lg:mr-[max(70px,calc((100%_-_1440px)/2_+_70px))]',
                )}
              >
                <div className="relative h-[180px] w-full shrink-0 bg-card md:h-full md:w-[309px]">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local static asset
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-cover object-top md:object-center"
                    />
                  ) : null}
                  <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-[8px] border border-white px-2 py-1 shadow-glow-primary-outline md:top-5 md:left-5">
                    <PlayFillIcon className="size-4" />
                    <span className="text-[12px] leading-4 text-white">{t('durationLabel')}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4 md:py-5 md:pr-5 md:pl-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] leading-[1.2] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                        {card.eyebrow}
                      </span>
                      <h3
                        className={cn(
                          'whitespace-pre-line text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal',
                          MOBILE_ONLY_TITLE_BREAK_INDEXES.has(index) && 'md:whitespace-normal',
                        )}
                      >
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-[14px] leading-[19px] text-foreground">{card.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center rounded-[8px] border border-border bg-card px-3 py-2 text-[12px] leading-4 text-white"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-col gap-4">
                    <div className="hidden h-px w-full bg-[#2a2a2a] md:block" />
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-full bg-card md:size-12">
                          {avatarPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element -- local static asset
                            <img src={avatarPhoto} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <span className="whitespace-pre-line text-base leading-[22px] font-bold text-foreground">
                          {personName}
                        </span>
                      </div>
                      <NotYetAvailable feature="originals">
                        <Button disabled>{t('watchCta')}</Button>
                      </NotYetAvailable>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardSlider>
      </div>
    </section>
  );
}
