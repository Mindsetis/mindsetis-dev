'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import styles from './MindsetterProfileView.module.css';

export interface CardSliderProps {
  /** Already-keyed card elements — this component only owns the scroll track + prev/next
   * controls, never the card markup/content itself (kept in the caller so Reviews / My WINS /
   * My F*ckUp(s) can each size their own cards per their own Figma measurements). */
  children: ReactNode;
  prevLabel: string;
  nextLabel: string;
  /** Per-section card width/gap tuning (e.g. `gap-4` + each card's own `w-[…]` class lives on
   * the card itself, not here) — merged onto the scrollable track. */
  trackClassName?: string;
  /** Disables `snap-x snap-mandatory` on the track. Default `true` (every existing caller —
   * Reviews/My WINS/My F*ckUp(s) — keeps native per-card scroll-snap). REEL LIFE (stage 1.12)
   * passes `false`: its track holds ONE two-row staggered block (see that section's own comment
   * in `MindsetterProfileView.tsx`), not a flat list of same-width cards, so there's no single
   * clean per-child snap point to align to — plain `scrollBy` + free scroll/touch is used
   * instead for that section, same "standard carousel UX, not literal pixel-matching" precedent
   * the file's own doc comment already established for the enabled/disabled arrow states. */
  snap?: boolean;
  /** Gap between the two arrow buttons — defaults to `gap-3` (12px, every other caller's value).
   * Superpower(s) needs 16px (claude.txt 2026-07-23 "1. Блок Superpower(s)" item 9). */
  arrowGapClassName?: string;
  /** Classes merged onto the arrow-row wrapper — e.g. Superpower(s) hides it at `lg:` (its cards
   * never overflow past a 3-up desktop layout, so there's nothing to scroll to there). */
  arrowRowClassName?: string;
  /** Fully self-contained enabled/disabled icon pairs for the prev/next buttons — when given,
   * REPLACES the default `ArrowLeft`/`ArrowRight` + outline/filled circular chrome entirely
   * (the SVG already draws its own circle/border/fill, and gets no hover treatment), used by
   * Superpower(s)' bespoke arrows (claude.txt item 10). Omitted → falls back to the existing
   * look every other `CardSlider` caller already relies on. */
  arrows?: {
    prevEnabled: ReactNode;
    prevDisabled: ReactNode;
    nextEnabled: ReactNode;
    nextDisabled: ReactNode;
  };
  /** Rest-state (pre-interaction) horizontal scroll alignment. Default `'start'` — every
   * existing caller (Reviews/My WINS/My F*ckUp(s)) keeps the browser's native `scrollLeft: 0`
   * behavior unchanged. REEL LIFE (STAGE 1.12 precision fix, 2026-07-23) passes `'center'` at
   * BOTH breakpoints (this prop is intentionally not breakpoint-gated — see why below).
   *
   * Desktop math: re-measuring Figma's own `552:4642`-`552:4649` rectangles shows BOTH the
   * 4-tile top row and the 3-tile bottom row are centered on the exact same point — the 1440px
   * frame's own center (`x=720`; row 1 spans -370..1810, row 2 spans -95..1535, and
   * `(-370+1810)/2 === (-95+1535)/2 === 720 === 1440/2`, exactly, not approximately). Figma's
   * captured snapshot is therefore NOT an arbitrary mid-scroll frame — it's already the
   * frame-centered rest state; it only *looks* scrolled-past because the 1440px mock frame is
   * itself narrower than the bottom row's own total width (3×530px tiles + 2×20px Figma gaps =
   * 1630px), so even dead-center the frame can't avoid clipping ~95px off each side of row 2.
   *
   * Mobile math: re-measuring Figma's `401:7881`-`401:7886` mobile rectangles gives row 1 (3
   * tiles) centered at x=179 and row 2 (2 tiles) at x=183 against a 375px frame (center 187.5)
   * — close to center but not the exact coincidence desktop has (that exactness only happens
   * when the two rows differ by exactly 1 tile AND the stagger margin is exactly half a
   * tile-step; mobile's Figma mock happens to also satisfy the "differ by 1" part here, so the
   * ~4-8px gap from true-center is just Figma's own manual-placement rounding, not a different
   * design intent). Same conclusion as desktop: Figma's mobile snapshot is *also* a
   * (near-)centered rest state constrained by its own 375px frame, not a distinct "different
   * intended arrangement" — so the same centering mechanism is the right generalization at
   * this breakpoint too.
   *
   * Why NOT breakpoint-gated: `reelLifePhotoRows` (`MindsetterProfileView.tsx`) splits photos
   * via `ceil(total/2)` top / remainder bottom — the SAME split at every breakpoint, driven by
   * however many photos a real profile actually has, not a fixed "4 top/3 bottom" tied to one
   * screen size. The existing static `ml-[148px] lg:ml-[273px]` row-2 stagger already encodes
   * this: each value is exactly half of that breakpoint's own real tile-width-plus-gap step
   * (mobile `(280+16)/2 = 148`; desktop `(530+16)/2 = 273`) — the general formula being
   * `margin = (topCount - bottomCount) * step / 2`, which only lands both rows on the same
   * center when `topCount - bottomCount === 1` (true for an odd total photo count; an even
   * count would leave the rows' centers a half-step apart — a pre-existing approximation this
   * fix doesn't change). Because the split is data-driven, not viewport-driven, there is no
   * fixed per-breakpoint pixel offset that's "correct" in general — measuring the real,
   * currently-rendered DOM (`scrollWidth`/`clientWidth`) at mount and centering on it is the
   * only mechanism that stays correct regardless of breakpoint or photo count.
   *
   * Where each breakpoint lands: desktop's own numbers (`gap-4`/`w-[530px]`) put bottom-row-
   * fully-visible at any viewport ≳1622px (3×530 + 2×16), which is common on real desktop
   * monitors (1680/1920/2560px) though not on a literal 1440px or 1536px browser window — those
   * still get a symmetric, minimized (not eliminated) crop, a hard geometric floor from the
   * tile/gap sizes themselves, not a bug (Figma's own 1440px mock hits the identical floor).
   * Mobile is more constrained: `SLIDER_ITEM_BASE`'s shared 280px tile width (used by every
   * `CardSlider` caller, not just Reel Life — see that constant's own site) is wider than
   * Figma's mobile-specific 212px mock, so a 2-tile bottom row alone already needs 280*2+16 =
   * 576px — more than essentially any real phone viewport (~320-480px). "Fully fit, zero crop"
   * is therefore not achievable on phones with the current shared tile width; centering still
   * gives the best available (symmetric, minimized-crop) rest state and is right generalization
   * of Figma's own near-centered mobile mock, but closing the mobile gap fully would mean
   * shrinking Reel Life's own tile width below the shared 280px `SLIDER_ITEM_BASE` — out of
   * scope here since that constant is shared with Reviews/My WINS/My F*ckUp(s).
   *
   * Implemented as a mount-only `useLayoutEffect` (fires before paint, so there's no visible
   * flash of the native start-aligned position before jumping to center) — unconditional on
   * breakpoint, since the runtime `scrollWidth`/`clientWidth` measurement is already
   * breakpoint-correct by construction. */
  initialScrollAlign?: 'start' | 'center';
  /**
   * How far one prev/next press travels.
   *
   * `'page'` (default, unchanged for Superpower(s) and REEL LIFE) scrolls 90% of the visible
   * width, so a wide desktop row advances by however many cards happen to fit in that distance —
   * usually two or three.
   *
   * `'item'` advances to the NEIGHBOURING snap position instead: exactly one card per press at
   * every width (2026-08-06 request, "щоб скролились по 1 слайду і на десктопі теж"). Opted into
   * by the four full-bleed sections — Reviews, My WINS, My Way, My F*ckUp(s) — rather than made
   * the default, so the two sections that were not part of that pass keep the paging feel they
   * have today. Has no effect when `snap` is `false`: without snap positions there is nothing to
   * step between, so those callers fall back to the proportional scroll.
   */
  scrollStep?: 'page' | 'item';
}

/**
 * Minimal horizontal card carousel — native CSS scroll-snap + `scrollBy` on the prev/next
 * buttons, no carousel library (none exists in this project's dependencies; Figma's own
 * slider — My F*ckUp(s) `552:4700`"Frame 453", REEL LIFE `552:4610` — is reproduced with plain
 * browser primitives instead of adding `embla-carousel-react`/`swiper`/etc. directly here).
 * Reviews and My WINS moved here from `EmblaCarousel.tsx` on 2026-08-06 — see that file's doc
 * comment for why embla can't drive a row of fixed-width cards that bleeds to the window edge.
 * My Way is the one section still on embla, for its seamless infinite loop.
 *
 * My F*ckUp(s)' and REEL LIFE's Figma card rows are both wider than their content column (My
 * F*ckUp(s) 1964px across 3×641px cards) — i.e. genuinely overflowing carousels, not grids — each
 * paired with an identical circular prev/next control pinned centered below the row
 * (`552:4625`/`552:4620` "Frame 277"/"246", each a pair of 48px circular buttons). Reused here as
 * one small client-component wrapper (the `'use client'` boundary `RolesAccordion.tsx` already
 * established as this file's precedent for isolated interactivity — everything else on the page
 * stays a Server Component).
 *
 * Buttons disable at the scroll boundaries (not verified against a specific Figma
 * enabled/disabled state pair — this is standard carousel UX, not literal pixel-matching) rather
 * than always being clickable no-ops.
 */
export function CardSlider({
  children,
  prevLabel,
  nextLabel,
  trackClassName,
  arrowGapClassName,
  arrowRowClassName,
  arrows,
  snap = true,
  initialScrollAlign = 'start',
  scrollStep = 'page',
}: CardSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Mount-only, breakpoint-agnostic (see `initialScrollAlign`'s own doc comment for why):
  // runs as a layout effect so the jump to center happens before first paint, not as a visible
  // post-render flash from the native start-aligned position.
  useLayoutEffect(() => {
    if (initialScrollAlign !== 'center') return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = (track.scrollWidth - track.clientWidth) / 2;
  }, [initialScrollAlign]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function updateScrollState() {
      if (!track) return;
      setCanScrollPrev(track.scrollLeft > 4);
      setCanScrollNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
    }

    updateScrollState();
    track.addEventListener('scroll', updateScrollState, { passive: true });

    // A `ResizeObserver` on the track rather than a `window` resize listener: the track's own
    // width can change without the window doing anything (a font finishing loading, an image
    // settling, a sibling section reflowing), and each of those flips whether the content
    // actually overflows. Window resize catches only the narrowest of those cases.
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(track);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [children]);

  /**
   * Nothing to scroll in either direction means the content already fits — so the arrow row is
   * removed rather than left permanently disabled.
   *
   * Deliberately derived from live scroll measurements, not from a child count: whether three
   * cards overflow depends entirely on the viewport, and the `ResizeObserver` above re-runs
   * this on every width change, so the arrows reappear on a narrow screen without a single
   * breakpoint being hardcoded.
   */
  const hasScrollableContent = canScrollPrev || canScrollNext;

  function scrollByPage(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const scrollProportionally = () =>
      track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });

    // Without snapping there are no positions to step between, so `'item'` has nothing to aim at.
    if (scrollStep !== 'item' || !snap) return scrollProportionally();

    // Move by exactly one card PITCH (card width + the track's gap) and let the browser's own
    // snapping settle the sub-pixel remainder. Every caller of `scrollStep: 'item'` lays out
    // uniformly sized cards, so one pitch is always precisely the distance between two adjacent
    // snap positions — which means the destination lands ON the next one rather than short of it.
    //
    // Deliberately NOT computed from absolute snap positions: those need the track's
    // `scroll-padding`, and `getComputedStyle().scrollPaddingLeft` hands back the UNRESOLVED
    // declaration (these tracks use `max(70px, calc((100% - 1440px) / 2 + 70px))`, which only
    // resolves at used-value time), so parsing it yields NaN. Pitch is a pure layout measurement
    // and sidesteps the whole problem — and because it is a delta, any constant padding cancels
    // out of it anyway.
    //
    // Gutter spacers are skipped. They are real flex items but not cards, so measuring from one
    // gives a gutter-sized "pitch" instead of a card-sized one. `aria-hidden` is the reliable
    // test, not width: Reviews' spacers are zero-width on a phone but 54px from `lg` up, which is
    // exactly where a width-based filter would quietly let them through.
    const cards = Array.from(track.children).filter(
      (child) => child.getAttribute('aria-hidden') !== 'true',
    );
    if (cards.length < 2) return scrollProportionally();

    const pitch = (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
    if (!(pitch > 0)) return scrollProportionally();

    track.scrollBy({ left: direction * pitch, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={trackRef}
        className={cn(
          'flex scroll-smooth overflow-x-auto pb-2',
          snap && 'snap-x snap-mandatory',
          styles.sliderTrack,
          trackClassName,
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'flex items-center justify-center',
          arrowGapClassName ?? 'gap-3',
          arrowRowClassName,
          !hasScrollableContent && 'hidden',
        )}
      >
        <button
          type="button"
          aria-label={prevLabel}
          disabled={!canScrollPrev}
          onClick={() => scrollByPage(-1)}
          className={
            arrows
              ? 'flex size-12 items-center justify-center disabled:cursor-not-allowed'
              : cn(
                  'flex size-12 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
                  styles.sliderArrowOutline,
                )
          }
        >
          {arrows ? (
            canScrollPrev ? (
              arrows.prevEnabled
            ) : (
              arrows.prevDisabled
            )
          ) : (
            <ArrowLeft className="size-5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={!canScrollNext}
          onClick={() => scrollByPage(1)}
          className={
            arrows
              ? 'flex size-12 items-center justify-center disabled:cursor-not-allowed'
              : cn(
                  'flex size-12 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
                  styles.sliderArrowFilled,
                )
          }
        >
          {arrows ? (
            canScrollNext ? (
              arrows.nextEnabled
            ) : (
              arrows.nextDisabled
            )
          ) : (
            <ArrowRight className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
