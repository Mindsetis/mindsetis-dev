'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

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
}

/**
 * Minimal horizontal card carousel — native CSS scroll-snap + `scrollBy` on the prev/next
 * buttons, no carousel library (none exists in this project's dependencies; Figma's own
 * slider — Reviews `552:4496`"Frame 448", My WINS `552:5069`"Frame 446", My F*ckUp(s)
 * `552:4700`"Frame 453" — is reproduced with plain browser primitives instead of adding
 * `embla-carousel-react`/`swiper`/etc.).
 *
 * All three Figma card rows are wider than the ~1300px content column (Reviews 1740px across
 * 4×420px cards, My WINS 4600px across 7×640px cards, My F*ckUp(s) 1964px across 3×641px
 * cards) — i.e. genuinely overflowing carousels, not grids — each paired with an identical
 * circular prev/next control pinned centered below the row (`552:4605`/`552:4625`/`552:4620`
 * "Frame 56"/"277"/"246", each a pair of 48px circular buttons). Reused here as one small
 * client-component wrapper (the `'use client'` boundary RolesAccordion.tsx already established
 * as this file's precedent for isolated interactivity — everything else on the page stays a
 * Server Component).
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
}: CardSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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
    window.addEventListener('resize', updateScrollState);
    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [children]);

  function scrollByPage(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={trackRef}
        className={cn(
          'flex snap-x snap-mandatory scroll-smooth overflow-x-auto pb-2',
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
