'use client';

import { useId, useState } from 'react';

import { FaqChevronIcon } from '@/components/icons/faq-chevron-icon';
import { cn } from '@/lib/utils';

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * FAQ accordion. A client component rather than the `<details>`/`<summary>` this section used
 * before, for one reason: `<details>` cannot animate. Browsers hide a closed `<details>`'s
 * non-summary children outright, so the panel has no start height to transition FROM — it just
 * snaps. Owning the open state here lets the panel animate with the `grid-template-rows: 0fr →
 * 1fr` technique (the only way to transition to a content-driven height without measuring it in
 * JS), which is what makes the reveal read as smooth rather than instant.
 *
 * TWO INDEPENDENT COLUMNS, NOT A TWO-COLUMN GRID. A CSS grid couples its cells by row: expanding
 * a card in the left column grows that whole row, which pushes every later row — including the
 * right column's cards — down with it. `align-items: start` stops the SIBLING stretching but not
 * the row growth, so the right column still jumped. Two separate flex columns have no shared
 * rows at all: opening a card only moves the cards below it in its own column.
 *
 * The columns are `display: contents` below `md:` so their children collapse back into the
 * parent's single-column flow, and each card carries its original index as its flex `order` —
 * that keeps the mobile reading order 1,2,3,4,5,6 even though the DOM is split into two halves.
 * On desktop the orders stay ascending within each column, so they change nothing there.
 *
 * The split is first-half / second-half of `items`, not even/odd — Figma's desktop grid
 * (`572:5427`) lays the six cards out as two independent stacks, left column top-to-bottom then
 * right column top-to-bottom (items 1-3 left, 4-6 right), not alternating row by row.
 *
 * Accessibility keeps what `<details>` gave for free and states it explicitly: the header is a
 * real `<button>` (focusable, Enter/Space operable) carrying `aria-expanded` and `aria-controls`,
 * and the panel carries the matching `id` plus `role="region"` and `aria-labelledby` so a screen
 * reader announces which question the answer belongs to. `useId` keeps those ids unique if this
 * component is ever rendered more than once on a page.
 *
 * Cards are independent toggles, not a one-at-a-time accordion — Figma shows one card expanded
 * and says nothing about collapsing siblings, and independent toggles are the less surprising
 * behaviour when two columns sit side by side.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  // The first card starts expanded — Figma's own FAQ frame (`Frame 673` / `1235:6527`) shows
  // every card in its collapsed header state with no explicit "open" example, so opening the
  // first one is a UX default (all-collapsed gives no hint the cards open at all), not a literal
  // copy of the design.
  const [openIndexes, setOpenIndexes] = useState<ReadonlySet<number>>(() => new Set([0]));

  function toggle(index: number) {
    setOpenIndexes((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  const withIndex = items.map((item, index) => ({ item, index }));
  const splitAt = Math.ceil(items.length / 2);
  const columns = [withIndex.slice(0, splitAt), withIndex.slice(splitAt)];

  return (
    <div className="mt-8 flex flex-col gap-4 md:mt-[50px] md:flex-row md:items-start md:gap-5">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="contents md:flex md:flex-1 md:flex-col md:gap-5">
          {column.map(({ item, index }) => {
            const isOpen = openIndexes.has(index);
            const panelId = `${baseId}-panel-${index}`;
            const headerId = `${baseId}-header-${index}`;

            return (
              <div
                key={item.question}
                style={{ order: index }}
                className="rounded-2xl border border-[#2a2a2a] bg-card p-4 md:p-6"
              >
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
                >
                  <span className="text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal">
                    {item.question}
                  </span>
                  <FaqChevronIcon
                    className={cn(
                      'size-4 shrink-0 transition-transform duration-300 ease-out',
                      isOpen && 'rotate-90',
                    )}
                  />
                </button>

                {/* `grid-template-rows: 0fr → 1fr` is the transition: a plain `height: auto` cannot
                    be animated, and a `max-height` guess either clips long answers or makes short
                    ones ease against dead space. The inner `overflow-hidden` is what actually
                    clips while the row collapses. */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="mt-2 text-body leading-[22px] text-muted-foreground md:mt-3">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
