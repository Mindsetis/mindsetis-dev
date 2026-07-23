'use client';

import { useEffect, useRef, useState } from 'react';

import { ReviewMinusIcon, ReviewPlusIcon } from '@/components/icons/review-icons';
import { cn } from '@/lib/utils';

import styles from './MindsetterProfileView.module.css';

export interface ReviewQuoteTextProps {
  quote: string;
  readMoreLabel: string;
  readLessLabel: string;
  /**
   * Preserves literal newlines in `quote` (`white-space: pre-line`) — off by default since
   * Reviews' own quotes (this component's original caller) don't contain embedded newlines.
   * The "My F*ckUp(s)" card story text does (its old plain `<p>` carried `whitespace-pre-line`
   * before being replaced by this component), so that caller passes `true`.
   */
  preserveNewlines?: boolean;
  /**
   * Gap between the quote text and the "Read more"/"Read less" toggle row — `gap-2` (8px) by
   * default (Reviews' original spacing, unaffected). My F*ckUp(s) passes `gap-8` (32px, explicit
   * request) since its cards need more breathing room here than Reviews does.
   */
  gapClassName?: string;
}

/**
 * Reviews card quote — clamps to 5 lines by default and only shows a "Read more"/"Read less"
 * toggle when the text actually overflows the clamp at the CURRENT rendered card width (a
 * `ResizeObserver` re-checks this on resize, since the card — and therefore the quote's
 * available width/line count — is responsive). Isolated into its own small `'use client'`
 * component per this file's established precedent (`CardSlider.tsx`/`RolesAccordion.tsx`) so
 * the parent `MindsetterProfileView.tsx` stays a Server Component. Also reused (unchanged) for
 * the "My F*ckUp(s)" card story text — see `preserveNewlines` above.
 */
export function ReviewQuoteText({
  quote,
  readMoreLabel,
  readLessLabel,
  preserveNewlines = false,
  gapClassName = 'gap-2',
}: ReviewQuoteTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    // While expanded the clamp is removed, so `scrollHeight`/`clientHeight` are always equal —
    // the overflow check only means something against the clamped box, so skip re-measuring
    // (and keep whatever `isOverflowing` was already known to be) until it's collapsed again.
    if (expanded) return;

    function checkOverflow() {
      if (!element) return;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [quote, expanded]);

  return (
    <div className={cn('flex flex-col', gapClassName)}>
      <p
        ref={textRef}
        className={cn(
          'text-body',
          styles.reviewQuote,
          !expanded && 'line-clamp-5',
          preserveNewlines && 'whitespace-pre-line',
        )}
      >
        {quote}
      </p>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex w-fit items-center gap-[11px] text-tiny font-bold text-primary"
        >
          {expanded ? readLessLabel : readMoreLabel}
          {expanded ? (
            <ReviewMinusIcon className="shrink-0" />
          ) : (
            <ReviewPlusIcon className="shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
