import { getTranslations } from 'next-intl/server';

import { ChatVoiceAiFillIcon } from '@/components/icons/main-page-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/** Card photo per event, in the same order as the `events.cards` translation array. STAGE 1.13,
 * FIFTH CUSTOMER PASS (2026-09-01): the prior conclusion above (Sensession has no image; 1×1 blank
 * export) was WRONG, the same category of mistake already made twice on this page
 * (`MindsetisOriginalsSection.tsx`'s own doc comment) — looking only inside the live card row's own
 * subtree instead of searching the whole document by name first.
 *
 * `search_nodes` for "Frame 701" scoped to the whole "Design" page (`0:1`) returns exactly TWO
 * matches, both top-level frames sharing that name:
 *   - `1241:18098` — the LIVE card row this section's markup is actually built from (same frame the
 *     rest of this file's doc comments already reference for layout/copy/type). Exporting its own
 *     photo rectangles: Mastermind/Anakondra Tank/Brain Lab (`1241:18004`/`1241:18026`/`1241:18084`)
 *     all export real pixels, but Chew & Chat's rectangle (`1241:18030`) exports a degenerate 100×500
 *     sliver and Sensession's (`1241:18028`) exports a blank 149-byte PNG — i.e. genuinely broken
 *     fills on THIS copy for exactly those two cards, not an export-tool limitation (every other
 *     rectangle on the same frame exports fine);
 *   - `1249:18181` — a separate, unrelated-by-position duplicate of the exact same 5-card row
 *     (identical child structure/names: `Frame 695/698/700/699/697`, same "Mastermind"/"Anakondra
 *     Tank"/"Brain Lab"/"Chew & Chat"/"Sensession" copy) sitting far off-canvas (`x:7117,y:4458` vs.
 *     the live frame's `x:70,y:4603`) — a hand-placed reference copy, same pattern as Originals'
 *     own stray "Frame 702" mockup. CRITICALLY, this copy's Chew & Chat card has an EXTRA rectangle
 *     layered on top (`1253:20172` "image 66", on top of the same `1249:18208` "image 65" the live
 *     copy also has) that actually carries a fill, and its Sensession rectangle (`1249:18216`, same
 *     420×250 slot/bounds as the live copy's broken one) exports a real 710 KB photo — so this
 *     duplicate frame is the one with COMPLETE, working art for all five cards, confirming the
 *     customer's pointer ("Frame 701 has all the slide images for this block").
 *
 * Compared the 4 already-saved files against this duplicate frame's exports: Mastermind and
 * Anakondra Tank are byte-identical (same rectangle bounds on both copies, `607 881`/`654 298` bytes
 * at 2× PNG) — left as-is. Brain Lab's rectangle sits at a slightly different vertical offset between
 * the two copies (`y:-105` live vs. `y:-142` duplicate, both 476px-tall on a 250px window) but reads
 * as the same "BRAIN LAB EVENT" title-card crop either way — left as-is per "same content, don't
 * replace". Chew & Chat WAS broken (the saved `event-chew-chat.jpg` was the 100×500 sliver from the
 * live copy's incomplete render) — replaced with a fresh export from the duplicate's complete
 * layered version. Sensession never had a saved file — added `event-sensession.jpg`, sourced from
 * the duplicate frame's `1249:18216`. Every file here is a 2× export of its 420×250 (mobile
 * 200px-tall slot at 320px, desktop 250px-tall slot at 420px — i.e. ~840×500 is already ≥2× either
 * rendered size) container frame, cropped by the container's own bounds exactly like the four
 * originally-saved files, so `object-cover` behaves the same way for all five.
 *
 * LESSON FOR THE NEXT PASS (does not need repeating a third time): when a card's own rectangle
 * exports blank/degenerate, that is NOT proof the source has no art for it — this file keeps
 * duplicate, off-canvas copies of whole card rows under the same frame name, and a duplicate can
 * have a working fill where the "live" copy's own is broken. Always `search_nodes` the WHOLE page
 * for every match of the frame's name before concluding an image is genuinely absent. */
const PHOTOS = [
  '/images/main-page/event-mastermind.jpg',
  '/images/main-page/event-anakondra-tank.jpg',
  '/images/main-page/event-brain-lab.jpg',
  '/images/main-page/event-chew-chat.jpg',
  '/images/main-page/event-sensession.jpg',
];

/**
 * "Networking formats we offer" (Mindsetis Events) — Figma `572:5555`/`1258:24047` (heading,
 * desktop/mobile) + `1241:18098`/`1258:24063` (the five cards, "Frame 701"/"Frame 702").
 *
 * STAGE 1.13 CUSTOMER PASS (2026-08-31): four fixes on top of the stage-1.13 re-verification pass
 * above (this section's own history — see git blame for the removed prior comment block).
 *
 * 1. "ALL EVENTS" BUTTON RESTORED. Re-searched Figma again for this pass specifically —
 *    `search_nodes` for "All events" across the WHOLE document returns zero matches, and a
 *    `search_nodes` for "Primary" button instances scoped to the entire Main Page frame
 *    (`572:5427`) finds none near this section's heading (the only nearby "Primary" instance is
 *    Top Mindsetters' own `1187:5880`). So the button genuinely still isn't in this Figma file —
 *    the previous pass's conclusion was correct. It's added anyway now on EXPLICIT customer
 *    instruction ("замовник каже, що вона потрібна"), reusing `home.main.events.viewAllCta`
 *    (never removed from `messages/en.json`) and copying `TopMindsettersSection`'s exact recipe:
 *    the header row becomes `md:flex-row md:items-end md:justify-between`; the CTA is full-width
 *    on mobile and a fixed 150px bottom-aligned box on desktop (customer, 2026-08-31), wrapped in
 *    `NotYetAvailable` — there is no `/events` route yet, same as Top Mindsetters' own CTA. Its STYLING
 *    is the hero's "How it works" button: `primaryOutline` at `default` size. ITS DISABLED
 *    TREATMENT WAS REVISED IN THE SIXTH CUSTOMER PASS (2026-09-01, see the call site's own comment):
 *    originally kept "live"-looking via `aria-disabled` + `pointer-events-none` (that reasoning is
 *    superseded, not deleted, so the history stays legible) — the customer's later call was the
 *    opposite, a Coming Soon control should read as visibly unavailable, so it now uses a plain
 *    `disabled` button matching `MindsetisOriginalsSection.tsx`'s own "All videos" CTA.
 * 2. HEADING LINE BREAK IS EXPLICIT, NOT WIDTH-DRIVEN. Re-read the raw `characters` field on both
 *    the desktop (`572:5560`) and mobile (`1258:24053`) heading text nodes directly (not the
 *    user's CSS dump) — both are byte-identical: `"Networking \nformats we offer"`, i.e. a real
 *    `\n` after "Networking" at EVERY breakpoint, not a width-driven wrap. `messages/en.json`/
 *    `messages/es.json` now encode that literally (`"Networking\nformats we offer"`, no space
 *    before the break — same convention `home.main.hero.title` already uses for its own explicit
 *    break), and the `<h2>` gained `whitespace-pre-line` (same precedent as `HeroBand.tsx`'s H1
 *    and `AiSearchPreview.tsx`'s subtitle). `md:max-w-[750px]` is KEPT, but only as a width guard
 *    matching Figma's own heading-block width (`Frame 534` is exactly 750px wide on desktop) —
 *    it is no longer the wrapping mechanism (the `\n` is), and 750px is wide enough that it can
 *    never force an extra break beyond the explicit one.
 *
 * 3. CARD TRACK BLEEDS TO THE FULL WINDOW, not just to this section's own `max-w-[1440px]` column
 *    — same technique `MindsetterProfileView.tsx` uses for Reviews/My WINS/REEL LIFE (see that
 *    file's own doc comments for the full derivation). Concretely:
 *      - the heading+CTA row stays in a `mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-[70px]` column
 *        (unchanged gutter math), while the track's wrapper is a PLAIN sibling of that column
 *        inside a `w-full` `<section>` — so the track is already the full content width and needs
 *        no break-out at all. An earlier pass used the usual `left-1/2 right-1/2 w-screen
 *        -mx-[50vw]` trick here and it was measurably wrong: `vw` counts the scrollbar gutter but
 *        the document's own content box does not, so the track sat 7.5px left of the viewport
 *        (half a 15px scrollbar) and the page's `scrollWidth` ran 8px past `clientWidth` at every
 *        width — hidden only by `body`'s `overflow-x: hidden`. Mixing `vw` (window) with `%`
 *        (element) in one layout is the bug; keeping everything in `%` removes it;
 *      - the gutter (visual inset of the first/last card to the 1440px content grid) lives on the
 *        two edge cards' own margin, exactly like `.reviewsFirstCard`/`.winsFirstCard`:
 *        `lg:ml-[max(70px,calc((100%_-_1440px)/2_+_70px))]` (mobile/tablet stay flat `ml-4`/
 *        `ml-6`, since below 1440px the gutter is just the fixed page padding). `100%` here is the
 *        track's own width — now genuinely the viewport content width — which is what makes the
 *        formula land on the same grid line as the heading;
 *        itself is untouched, per the brief;
 *      - the track's own `scroll-pl-*` mirrors the same formula so a snapped card still parks ON
 *        the content grid rather than flush against the bled screen edge, at every breakpoint
 *        (mobile/tablet flat `scroll-pl-4`/`scroll-pl-6`, desktop the same `max()` formula via
 *        `lg:scroll-pl-[…]`) — identical purpose to `.reviewsTrack`'s `scroll-padding-inline-start`.
 *      - `CardSlider`'s own `hasScrollableContent` check (`!hasScrollableContent && 'hidden'`)
 *        measures the TRACK's own `scrollWidth`/`clientWidth` via a ref — a DOM measurement that
 *        doesn't care how its ancestor is positioned relative to the viewport, so switching the
 *        wrapper from a capped column to a full-width sibling changes nothing there; re-verified
 *        live in-browser (see the report) that the arrow row still auto-hides once five cards fit
 *        a wide-enough window and reappears once they don't.
 *
 * 4. FULL RE-DIFF AGAINST FIGMA (`1241:18098`/`1258:24063`, both breakpoints, every card):
 *      - eyebrow, heading type, card title/description type, per-card button, all still match —
 *        no changes beyond items 1–3 above;
 *      - ONE mismatch found and fixed: the gap between each card's photo and its text/button
 *        block was a flat `gap-5` (20px) at every width. Figma's own numbers are different per
 *        breakpoint — mobile `Frame 696` has the photo (ends y=200) then `Frame 688` starting at
 *        y=216, a 16px gap; desktop `Frame 696` has the photo (ends y=250) then `Frame 676`
 *        starting at y=270, a 20px gap. Changed to `gap-4 md:gap-5` (16px mobile, 20px desktop),
 *        matching the same breakpoint the card width already switches at.
 *
 * Cards (`1241:18098` desktop / `1258:24063` mobile): the row genuinely overflows its own content
 * column at EVERY breakpoint (desktop 5×420px cards + 4×20px gaps = 2180px vs. a 1300px column;
 * mobile 5×320px + 4×16px = 1664px vs. 343px) — a real horizontal carousel at `lg:` too, unlike Top
 * Mindsetters (which only barely overflows on some desktop widths). Card width switches at `md:`
 * (320→420px) — Figma only ships a 375px and a 1440px mock, no distinct tablet frame, so `md:`/
 * `lg:` is a judgment call kept consistent with `TopMindsettersSection`.
 *
 * Per-card "Join Waitlist" button (`Secondary - 2b` instance, every card): transparent fill, 1px
 * WHITE border, bold white label — the `outline` `Button` variant (transparent + border), NOT
 * `secondary` (which is a filled `#1a1a1a` card + gray `border-border`, the wrong Figma
 * component). Card title/description type: mobile is Manrope Bold 16/22 title + Manrope Regular
 * 14/19 body ("MOB/button text" + "tiny simple (PC)"), desktop swaps to Cal Sans 22/29 title
 * ("M (PC)") + Manrope Regular 16/22 body ("body (PC)", overridden with an explicit
 * `leading-[22px]` rather than the shared `text-body` token's 24px line-height — same "explicit
 * line-height over the token's own value" precedent as `HeroBand.tsx`/`TopMindsettersSection.tsx`).
 *
 * "All events" and "Join Waitlist" both have no backend yet (no `/events` route, no waitlist
 * signup flow), so both stay visually-complete but `disabled`+`NotYetAvailable` controls.
 */
export async function MindsetisEventsSection() {
  const t = await getTranslations('home.main.events');
  const cards = t.raw('cards') as { name: string; description: string }[];

  return (
    <section className="w-full py-16 md:py-20 lg:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-[70px]">
        <div className="flex flex-col gap-6 md:gap-8">
          <SectionEyebrow
            icon={<ChatVoiceAiFillIcon className="size-3 md:size-4" />}
            label={t('eyebrow')}
          />
          {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
              comment. Negative margin cancels the padding out of flow so the parent `gap-6
              md:gap-8` to the CTA button stays exactly as measured. */}
          <h2
            className={`font-display text-[40px] leading-[0.9] font-normal whitespace-pre-line md:max-w-[750px] md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
        </div>
        {/* Not in Figma (see doc comment item 1) — restored on explicit customer instruction,
            reusing Top Mindsetters' own header-CTA treatment 1:1.
            STAGE 1.13, SIXTH CUSTOMER PASS (2026-09-01): switched from the "live-looking"
            `aria-disabled` + `pointer-events-none` treatment to a plain `disabled` button — the
            customer's call was that a Coming Soon control should read as unavailable at a glance,
            not merely refuse the click (the opposite of this file's own item-1 reasoning above,
            which is now superseded). Copied `MindsetisOriginalsSection.tsx`'s "All videos" button
            verbatim: same `primaryOutline` variant, same `default` size, but with `disabled` doing
            the work instead of `aria-disabled` — `button.tsx`'s `disabled:` variants flatten the
            gradient border to a plain one and mute the label/drop the glow, which is now the
            intended look, not a regression to work around. Same project convention
            `WelcomeMemberCtas.tsx` already uses for its own `primaryOutline` inside `NotYetAvailable`. */}
        <NotYetAvailable feature="events" className="w-full md:w-[150px] md:shrink-0">
          <Button variant="primaryOutline" size="default" disabled className="w-full">
            {t('viewAllCta')}
          </Button>
        </NotYetAvailable>
      </div>

      {/* Figma gap from the heading block to the card row: 32px mobile / 50px desktop — same
          measured values (and same shared-nothing, section-own-spacing status) as
          `TopMindsettersSection`'s identical gap. The track wrapper spans the full content width
          (see doc comment item 3), unlike the heading column above it. */}
      <div className="mt-8 md:mt-[50px]">
        <CardSlider
          prevLabel={t('prevCta')}
          nextLabel={t('nextCta')}
          // No padding/negative-margin/width-compensation on the track itself — the gutter comes
          // back purely from `scroll-pl-*` (snap alignment) plus a margin on the first/last card
          // below, same split as `.reviewsTrack`/`.winsTrack` on the Mindsetter Profile page.
          trackClassName="gap-4 scroll-pl-4 sm:scroll-pl-6 md:gap-5 lg:scroll-pl-[max(70px,calc((100%_-_1440px)/2_+_70px))]"
          scrollStep="item"
        >
          {cards.map((card, index) => {
            const photo = PHOTOS[index];
            // The gutter is supplied by the track's `scroll-padding` plus a margin on the first and
            // last card — NOT by zero-width spacer items. `MindsetterProfileView.module.css`
            // records why (2026-08-06, `.reviewsTrack`): spacers carry their own snap point a
            // gutter away from the card grid, so one press travelled a card-pitch-PLUS-a-gutter
            // and parked middle cards flush against the edge. With `scroll-padding`, every card
            // snaps onto the gutter line and every stop is exactly one pitch from the next. The
            // `lg:` value is the same `max(70px, calc((100% - 1440px) / 2 + 70px))` formula
            // `.winsFirstCard`/`.reviewsFirstCard` use, reproduced as a Tailwind arbitrary value
            // since the profile's own CSS module isn't touched by this section.
            const isFirst = index === 0;
            const isLast = index === cards.length - 1;
            return (
              <div
                key={card.name}
                className={cn(
                  'flex w-[320px] shrink-0 snap-start flex-col gap-4 md:w-[420px] md:gap-5',
                  isFirst && 'ml-4 sm:ml-6 lg:ml-[max(70px,calc((100%_-_1440px)/2_+_70px))]',
                  isLast && 'mr-4 sm:mr-6 lg:mr-[max(70px,calc((100%_-_1440px)/2_+_70px))]',
                )}
              >
                <div className="h-[200px] w-full overflow-hidden rounded-3xl bg-card md:h-[250px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </div>
                {/* `flex-1` + `mt-auto` on the CTA pin every card's button to the same baseline:
                    Figma gives all five cards a fixed 441px height ("Frame 696"), so their buttons
                    line up regardless of how many lines the description runs to. The track is a
                    plain `flex` row (default `align-items: stretch`), so the cards are already
                    equal height — only the CTA needed pushing down. */}
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal">
                      {card.name}
                    </h3>
                    <p className="text-[14px] leading-[19px] text-foreground md:text-body md:leading-[22px]">
                      {card.description}
                    </p>
                  </div>
                  <NotYetAvailable feature="events" className="mt-auto w-full">
                    <Button variant="outline" size="lg" className="w-full" disabled>
                      {t('joinWaitlistCta')}
                    </Button>
                  </NotYetAvailable>
                </div>
              </div>
            );
          })}
        </CardSlider>
      </div>
    </section>
  );
}
