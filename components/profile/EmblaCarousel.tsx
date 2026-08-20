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
   * undefined by the only remaining call site (My Way). Kept as an escape hatch for a future
   * section that genuinely does need a narrower-than-parent viewport; note that padding on this
   * element breaks embla's own measurement, which is part of why Reviews and My WINS both left
   * this component (see the file doc comment below). */
  viewportClassName?: string;
  /** Per-section track gap override, same `trackClassName` naming precedent as
   * `CardSlider.tsx`'s own prop — merged (via `cn`/`tailwind-merge`) onto the internal
   * `gap-4` track div, so a caller only needs to pass the ONE class it wants to change (e.g.
   * `gap-5`) rather than the whole className. */
  trackClassName?: string;
  /** `useEmblaCarousel`'s own `align` option (`'start' | 'center' | 'end' | ((viewSize,
   * snapSize, index) => number)`, re-exported from `embla-carousel`) — defaults to `'center'`
   * (single centered active slide). My Way passes `'start'` for a flush-left row with a peek. */
  align?: EmblaOptionsType['align'];
  /**
   * Infinite wrap-around, default `true` (what My Way uses). Both sections that previously set
   * this to `false` have since moved off this component entirely: with looping there is no first
   * or last card, so the arrows never disable and the row silently re-orders itself as you page,
   * but turning it off exposed that embla mis-measures fixed-width `shrink-0` slides (see the
   * file doc comment below).
   */
  loop?: boolean;
  /** Extra classes for this component's own root `flex flex-col gap-8` wrapper (the direct
   * child of the caller's own outer `relative` positioning div) — merged via `cn`. Left
   * undefined by Reviews/My WINS; My Way passes `pl-[30px]` (explicit request) since that's
   * the only "div with a `flex` class" directly inside its `relative` wrapper. */
  className?: string;
}

/**
 * Shared `embla-carousel-react` carousel. Its one remaining caller is My Way; `CardSlider.tsx`
 * (native CSS scroll-snap) drives every other row on the page.
 *
 * Originally built as `ReviewsCarousel.tsx`, then generalized here when My WINS wanted the same
 * loop/one-slide-per-click behavior. Both of those sections have since moved to `CardSlider`
 * (Reviews and then My WINS, 2026-08-06) for the same two reasons, worth recording so this
 * component isn't reached for again by default:
 *   · embla sizes slides as a fraction of its track, so a row of FIXED-width `shrink-0` cards
 *     overflows the track it measures — with `loop: true` that stays hidden (the loop path never
 *     consults the scroll limit), but turning the loop off derives a nearly-zero travel and
 *     disables the next arrow with cards still off-screen;
 *   · it positions slides by transform, so a zero-width gutter spacer counts as a real slide
 *     (breaking slide count and arrow-visibility), while padding on its viewport breaks its own
 *     measurement — leaving no clean way to inset a full-bleed row to the content grid.
 * It is still the right tool where slides are sized as a fraction of the viewport and a seamless
 * infinite loop is wanted, which is exactly My Way.
 */
export function EmblaCarousel({
  children,
  prevLabel,
  nextLabel,
  viewportClassName,
  trackClassName,
  align = 'center',
  loop = true,
  className,
}: EmblaCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop,
    align,
    // `slidesInView()` counts a slide as visible at embla's default threshold of ~0, so a card
    // with a single pixel showing at the edge is "in view". That made the arrow-visibility test
    // below report "everything fits" for a carousel that was visibly clipped on both sides.
    // Near-1 means only a slide that is essentially fully visible counts, which is what "no
    // need to scroll" actually means. Affects `slidesInView` only, nothing else.
    inViewThreshold: 0.99,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  /**
   * Whether any slide is currently out of view — i.e. whether there is anything to scroll TO.
   *
   * `canScrollPrev`/`canScrollNext` cannot answer this here: `loop: true` makes both true
   * whenever embla considers the carousel scrollable at all, so the arrows stayed live even
   * when every slide already fit on screen. Comparing slides-in-view against the total is the
   * honest test, and it is inherently viewport-aware — four cards can all fit on a desktop
   * (arrows hidden) and overflow on a phone (arrows shown) with no breakpoint hardcoded
   * anywhere.
   */
  const [hasHiddenSlides, setHasHiddenSlides] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    function updateState() {
      if (!emblaApi) return;
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
      setHasHiddenSlides(emblaApi.slidesInView().length < emblaApi.slideNodes().length);
    }

    updateState();
    // `resize` and `slidesInView` matter as much as `select`/`reInit` here: the first fires when
    // the viewport changes (which is exactly when "does this overflow?" flips), the second when
    // scrolling brings different slides into view.
    emblaApi.on('select', updateState);
    emblaApi.on('reInit', updateState);
    emblaApi.on('resize', updateState);
    emblaApi.on('slidesInView', updateState);
    return () => {
      emblaApi.off('select', updateState);
      emblaApi.off('reInit', updateState);
      emblaApi.off('resize', updateState);
      emblaApi.off('slidesInView', updateState);
    };
  }, [emblaApi]);

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <div className={cn('overflow-hidden', viewportClassName)} ref={emblaRef}>
        <div className={cn('flex gap-4', trackClassName)}>{children}</div>
      </div>
      {/* Nothing off-screen → nothing to page through, so the whole arrow row goes rather than
          sitting there permanently disabled. Recomputed on resize, so it comes back the moment
          the viewport narrows enough for slides to overflow. */}
      <div className={cn('flex items-center justify-center gap-3', !hasHiddenSlides && 'hidden')}>
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
