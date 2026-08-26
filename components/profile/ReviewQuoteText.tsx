'use client';

import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { ReviewPlusIcon } from '@/components/icons/review-icons';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import styles from './MindsetterProfileView.module.css';

export interface ReviewQuoteTextProps {
  quote: string;
  readMoreLabel: string;
  /**
   * Heading for the full-text dialog — the reviewer's name for Reviews, the section name plus
   * the card's icon and number for My F*ckUp(s). Required because the dialog needs an
   * accessible name and this component has no idea which section it renders inside.
   *
   * `ReactNode`, not `string`, so a caller can mix in the same icon its card shows; any icon
   * passed is `aria-hidden`, so the accessible name stays the readable text alone.
   */
  dialogTitle: ReactNode;
  /** Accessible label for the dialog's close button. */
  closeLabel: string;
  /**
   * Preserves literal newlines in `quote` (`white-space: pre-line`) — off by default since
   * Reviews' own quotes (this component's original caller) don't contain embedded newlines.
   * The "My F*ckUp(s)" card story text does, so that caller passes `true`.
   */
  preserveNewlines?: boolean;
  /**
   * Gap between the quote text and the "Read more" row — `gap-2` (8px) by default (Reviews'
   * original spacing, unaffected). My F*ckUp(s) passes `gap-8` (32px, explicit request).
   */
  gapClassName?: string;
}

/**
 * Card quote text, clamped to 5 lines, with a "Read more" that opens the full text in a MODAL.
 *
 * It used to expand the card in place. That was replaced on 2026-08-05 (product decision:
 * "everywhere there is a Read More, open a popup"), and the modal is the better fit here for a
 * structural reason too: both call sites live inside a horizontally-scrolling `CardSlider`,
 * where growing one card reflows the whole track and shifts its neighbours under the reader's
 * cursor. That matters more now that a f*ckup story can run to 3000 characters — far past what
 * any card should absorb inline.
 *
 * The toggle still only appears when the text ACTUALLY overflows the clamp at the current
 * rendered width (a `ResizeObserver` re-checks it, since the card is responsive). Unlike the old
 * version there is no expanded state to skip measuring for: the clamp is now permanent, so the
 * measurement stays valid at all times.
 *
 * Dialog chrome (bottom sheet on mobile / centered rounded modal on desktop, custom close X)
 * copies `PlatformFeeModal`/`OnboardingDialog` verbatim, per the request to match the
 * popups the app already has.
 */
export function ReviewQuoteText({
  quote,
  readMoreLabel,
  dialogTitle,
  closeLabel,
  preserveNewlines = false,
  gapClassName = 'gap-2',
}: ReviewQuoteTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    function checkOverflow() {
      if (!element) return;
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [quote]);

  return (
    <div className={cn('flex flex-col', gapClassName)}>
      <p
        ref={textRef}
        className={cn(
          'line-clamp-5 text-body',
          styles.reviewQuote,
          preserveNewlines && 'whitespace-pre-line',
        )}
      >
        {quote}
      </p>

      {isOverflowing && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-fit cursor-pointer items-center gap-[11px] text-tiny font-bold text-primary"
        >
          {readMoreLabel}
          <ReviewPlusIcon className="shrink-0" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={[
            'top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0',
            'translate-y-0 gap-4 overflow-y-auto rounded-t-[32px] rounded-b-none border-0',
            'border-t border-t-[#a5a5a5] px-4 pt-6 pb-6',
            'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-w-[800px]',
            'md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[32px] md:border-0 md:p-8',
          ].join(' ')}
        >
          <DialogClose asChild>
            <button
              type="button"
              className="absolute top-6 right-6 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-input transition-colors hover:border-primary hover:text-primary"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">{closeLabel}</span>
            </button>
          </DialogClose>

          <DialogHeader className="gap-0 pr-10 text-left">
            {/* `inline-flex` so a caller that mixes an icon into the title (My F*ckUp(s)) gets
                it baseline-aligned with the text instead of sitting on its own line. */}
            <DialogTitle className="inline-flex items-center gap-1.5 text-[22px] text-primary">
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          {/* No clamp here — that is the whole point of the dialog. `max-h-[85vh]` +
              `overflow-y-auto` on the container above keep a 3000-character story scrollable
              instead of overflowing the viewport. */}
          <p
            className={cn(
              'text-body',
              styles.reviewQuote,
              preserveNewlines && 'whitespace-pre-line',
            )}
          >
            {quote}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
