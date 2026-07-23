'use client';

import type { EmblaOptionsType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import styles from './MindsetterProfileView.module.css';

export interface EmblaCarouselProps {
  /** Already-keyed slide elements (one per card) — this component only owns the embla
   * viewport/track + prev/next controls, never the card markup itself, same separation-of-
   * concerns precedent as `CardSlider.tsx`. */
  children: ReactNode;
  prevLabel: string;
  nextLabel: string;
  /** Optional extra classes for the embla viewport div (the `ref={emblaRef}` element) — left
   * undefined by both current call sites (Reviews and, as of the 2026-07-23 correction, My
   * WINS too — see that call site's own comment for why the earlier "cap+center to a narrower
   * peek width" idea was wrong and reverted). Kept as an escape hatch for a future section that
   * genuinely does need a narrower-than-parent viewport. */
  viewportClassName?: string;
  /** Per-section track gap override, same `trackClassName` naming precedent as
   * `CardSlider.tsx`'s own prop — merged (via `cn`/`tailwind-merge`) onto the internal
   * `gap-4` track div, so a caller only needs to pass the ONE class it wants to change (e.g.
   * `gap-5`) rather than the whole className. Left undefined by Reviews (stays `gap-4`,
   * unaffected); My WINS passes `gap-5` (20px, confirmed against Figma node `327:1080`). */
  trackClassName?: string;
  /** `useEmblaCarousel`'s own `align` option (`'start' | 'center' | 'end' | ((viewSize,
   * snapSize, index) => number)`, re-exported from `embla-carousel`) — defaults to `'center'`,
   * Reviews' existing behavior (single centered active slide, unaffected if it doesn't pass
   * this). My WINS passes `'start'` (flush-left pairs — see that call site's own comment for
   * why `'center'` was wrong for a "show 2 full cards, zero peek" row). */
  align?: EmblaOptionsType['align'];
}

/**
 * Shared `embla-carousel-react` carousel — used by BOTH the Reviews section and My WINS (unlike
 * `CardSlider.tsx`, native CSS scroll-snap, still used by My F*ckUp(s) / Reel Life), since these
 * two need genuine Swiper-like behavior (seamless infinite loop, exactly one slide per click,
 * centered active slide with no empty space ever visible) that hand-rolled scroll-snap + manual
 * spacer/boundary-jump math couldn't reliably deliver after several rounds of edge-case bugs.
 * `loop: true` (always on) + a configurable `align` (`'center'` by default, matching Reviews'
 * single-centered-slide behavior; My WINS overrides to `'start'` for flush "2 full cards, zero
 * peek" pairs — see the `align` prop doc above) are embla's built-in equivalents of what
 * `CardSlider.tsx` had to hand-roll (and kept getting subtly wrong) via spacer divs + `scrollTo`
 * boundary jumps.
 *
 * Originally built as `ReviewsCarousel.tsx` for Reviews only, then renamed/generalized here once
 * My WINS needed the identical full-bleed/loop/one-slide-per-click behavior — this component was
 * already 100% generic (no Reviews-specific styling inside it), so it was renamed rather than
 * duplicated.
 */
export function EmblaCarousel({
  children,
  prevLabel,
  nextLabel,
  viewportClassName,
  trackClassName,
  align = 'center',
}: EmblaCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    function updateState() {
      if (!emblaApi) return;
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    }

    updateState();
    emblaApi.on('select', updateState);
    emblaApi.on('reInit', updateState);
    return () => {
      emblaApi.off('select', updateState);
      emblaApi.off('reInit', updateState);
    };
  }, [emblaApi]);

  return (
    <div className="flex flex-col gap-8">
      <div className={cn('overflow-hidden', viewportClassName)} ref={emblaRef}>
        <div className={cn('flex gap-4', trackClassName)}>{children}</div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={prevLabel}
          disabled={!canScrollPrev}
          onClick={scrollPrev}
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
            styles.sliderArrowOutline,
          )}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={!canScrollNext}
          onClick={scrollNext}
          className={cn(
            'flex size-12 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-40',
            styles.sliderArrowFilled,
          )}
        >
          <ArrowRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
