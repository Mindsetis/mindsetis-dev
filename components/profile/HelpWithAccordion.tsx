'use client';

import { useState } from 'react';

import {
  AddCircleFillIcon,
  BagIcon,
  IndeterminateCircleFillIcon,
} from '@/components/icons/mindsetter-eyebrow-icons';
import { cn } from '@/lib/utils';
import type { Expertise } from '@/lib/validation/mindsetter';

import styles from './MindsetterProfileView.module.css';

export interface HelpWithAccordionProps {
  items: Expertise[];
  /** `t('help.expand')` / `t('help.collapse')` — combined with the item's own `title` client-side
   * (plain string concat, not `next-intl`) for each toggle button's `aria-label`, same pattern as
   * `RolesAccordion`'s `expandLabel`/`collapseLabel` (a Server Component can't hand a translator
   * function across the client boundary). */
  expandLabel: string;
  collapseLabel: string;
}

/**
 * "What can I help with" list, EXPAND/COLLAPSE accordion — Figma (`552:4991` "Frame 444" desktop
 * / `401:7758` "Frame 480" mobile) renders this as bordered header rows (bag icon + index number
 * + title + an `indeterminate-circle-fill` "−"/`add-circle-fill` "+" toggle glyph) with a 32px
 * (24px mobile) gap BETWEEN rows, NOT the always-visible-description `divide-y` list with a
 * circular `NumberBadge` this section rendered before — only the row(s) whose toggle is in the
 * "−" state show their description underneath (`552:5007`/`401:7772` "Frame 204"/"Frame 203").
 * This is structurally identical to `RolesAccordion.tsx` (same `Frame 201`/`Frame 200`/`Frame 21`
 * node names, same toggle icons) just with `BagIcon` instead of `MagicFillIcon` and no link list —
 * kept as its own small component rather than generalizing `RolesAccordion` itself, to keep this
 * pass scoped to the Help section only.
 *
 * Figma's own mockup snapshot shows the SECOND row expanded by default (`indeterminate-circle-fill`
 * on "Conference production") — same "illustrative snapshot, not a spec" call as `RolesAccordion`,
 * so this defaults to the first row open instead (a more conventional accordion default).
 */
export function HelpWithAccordion({ items, expandLabel, collapseLabel }: HelpWithAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<ReadonlySet<number>>(() => new Set([0]));

  function toggle(index: number) {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:w-[643px]">
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index);
        const rowKey = `${item.title}-${index}`;
        const panelId = `help-panel-${index}`;
        const headerId = `help-header-${index}`;

        return (
          <div key={rowKey} className={cn('border-t', styles.helpRowBorder)}>
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label={`${isOpen ? collapseLabel : expandLabel} ${item.title}`}
              onClick={() => toggle(index)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 pt-3 text-left"
            >
              <span className="flex items-center gap-4 md:gap-8">
                <span className="inline-flex items-center gap-1">
                  <BagIcon className="size-3.5 shrink-0" />
                  <span className={cn('text-tiny font-bold', styles.helpIndexNumber)}>
                    {index + 1}
                  </span>
                </span>
                <span className="font-display text-[24px] leading-none md:text-l">
                  {item.title}
                </span>
              </span>
              {isOpen ? (
                <IndeterminateCircleFillIcon className="size-6 shrink-0 md:size-8" />
              ) : (
                <AddCircleFillIcon
                  className={cn('size-6 shrink-0 md:size-8', styles.helpToggleClosed)}
                />
              )}
            </button>

            {/* CSS-only expand/collapse animation (0fr/1fr grid-template-rows trick), same as
                `RolesAccordion` — avoids a JS height measurement for a variable-height panel. */}
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  aria-hidden={!isOpen}
                  className="pt-4 pb-1 md:pl-14"
                >
                  <p className="text-body">{item.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
