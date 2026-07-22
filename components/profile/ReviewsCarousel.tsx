'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import styles from './MindsetterProfileView.module.css';

export interface ReviewsCarouselProps {
  /** Already-keyed slide elements (one per review card) — this component only owns the embla
   * viewport/track + prev/next controls, never the card markup itself, same separation-of-
   * concerns precedent as `CardSlider.tsx`. */
  children: ReactNode;
  prevLabel: string;
  nextLabel: string;
}

/**
 * Reviews-only carousel built on `embla-carousel-react` — unlike `CardSlider.tsx` (native CSS
 * scroll-snap, still used by My WINS / My F*ckUp(s)), this section needs genuine Swiper-like
 * behavior (seamless infinite loop, exactly one slide per click, centered active slide with no
 * empty space ever visible) that hand-rolled scroll-snap + manual spacer/boundary-jump math
 * couldn't reliably deliver after several rounds of edge-case bugs. `loop: true` + `align:
 * 'center'` are embla's built-in equivalents of what `CardSlider.tsx` had to hand-roll (and kept
 * getting subtly wrong) via spacer divs + `scrollTo` boundary jumps.
 */
export function ReviewsCarousel({ children, prevLabel, nextLabel }: ReviewsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
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
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">{children}</div>
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
