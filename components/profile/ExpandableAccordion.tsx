'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  AddCircleFillIcon,
  IndeterminateCircleFillIcon,
  RoleLinkIcon,
} from '@/components/icons/mindsetter-eyebrow-icons';
import { cn } from '@/lib/utils';
import type { RoleLink } from '@/lib/validation/mindsetter';

import { isSafeHttpUrl } from './MemberProfileView';
import styles from './MindsetterProfileView.module.css';

/** Structural shape both `Role` (with `links`) and `Expertise` (without) satisfy — `links` is
 * optional so a caller with no such field (Help) can simply omit it. */
export interface ExpandableAccordionItem {
  title: string;
  description: string;
  links?: RoleLink[];
}

export interface ExpandableAccordionProps {
  items: ExpandableAccordionItem[];
  /** Icon rendered next to each row's index number — the caller's own section-eyebrow icon
   * (Roles: `MagicFillIcon`, Help: `BagIcon`), per the 2026-07-23 follow-up request to reuse
   * this component for "What can I help with" ("такий же [block як Roles], тільки... іконки
   * біля нумерації інші, така іконка як біля тексту WHAT CAN I HELP WITH"). */
  icon: ReactNode;
  /** `t('roles.learnMore')` — static fallback link label, only ever rendered when an item
   * actually has `links` (Help items never do, so this is optional and unused there). */
  learnMoreLabel?: string;
  /** `t('roles.expand')` / `t('roles.collapse')` — combined with the item's own `title`
   * client-side (plain string concat, not `next-intl`) for each toggle button's `aria-label`,
   * since a Server Component can't hand a translator function across the client boundary. */
  expandLabel: string;
  collapseLabel: string;
}

/**
 * Shared EXPAND/COLLAPSE accordion (stage 1.10 pixel-polish pass, originally built for Roles —
 * ROADMAP "Polish / follow-up" item 2 — then generalized 2026-07-23 to also back "What can I
 * help with", which is the same row/toggle/spacing treatment minus the links+preview grid, per
 * an explicit "make it the same as Roles, just without links/preview" request). Figma (`327:1129`
 * "Frame 210" desktop / mobile equivalent under `187:4294`) renders Roles as a list of bordered
 * header rows (icon + index number + title + an `indeterminate-circle-fill` "−"/`add-circle-fill`
 * "+" toggle glyph) — only the row(s) whose toggle is in the "−" state show their description
 * (+ links, when the item has any) underneath. Defaults to just the FIRST item open.
 *
 * The ONLY client-interactive piece of `MindsetterProfileView` — split out into its own small
 * `'use client'` component specifically so the rest of that large page stays a Server Component;
 * every other section has zero interactivity.
 *
 * SECURITY (do not regress): `item.links[].url`/`.ogImage` are filtered through `isSafeHttpUrl`
 * before ever reaching a real `<a href>`/`<img src>` — this is the exact stored-XSS fix from
 * stage 1.10's review loop (`roleLinkSchema.url`/`.ogImage` are `.refine(isHttpUrl)` at write
 * time; this is the read-side defense-in-depth re-check, same class as `socials`'s stage-1.6
 * fix).
 */
export function ExpandableAccordion({
  items,
  icon,
  learnMoreLabel = '',
  expandLabel,
  collapseLabel,
}: ExpandableAccordionProps) {
  // Figma's own Roles mockup snapshot shows rows #1 and #2 both expanded by default — but
  // that's an illustrative content snapshot, not a spec ("show N items open"). Defaulting to
  // just the first index open is the more conventional accordion default while still matching
  // Figma's "at least one row visibly expanded out of the box" baseline state.
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
    <div className="flex flex-col">
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index);
        // Stored-XSS guard (audit finding, stage 1.10 review) — unchanged from the
        // pre-accordion implementation, see this component's own doc comment above.
        const safeLinks = (item.links ?? []).filter((link) => isSafeHttpUrl(link.url));
        const rowKey = `${item.title}-${index}`;
        const panelId = `accordion-panel-${index}`;
        const headerId = `accordion-header-${index}`;

        return (
          <div
            key={rowKey}
            className={cn(
              'border-t mb-6 md:mb-8',
              styles.roleRowBorder,
              // Trailing space is a CONSTANT row-level margin now, not conditional on `isOpen`
              // (open rows' panel used to carry its own equal `pb-6 md:pb-8` instead) — toggling
              // that class on/off snapped instantly while the panel's own height animated
              // smoothly, reading as a jarring double-motion jump on open/close. Same total
              // spacing in both states, just no longer state-dependent, so nothing to jump.
            )}
          >
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label={`${isOpen ? collapseLabel : expandLabel} ${item.title}`}
              onClick={() => toggle(index)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-3 text-left"
            >
              {/* Gap between the icon+number group and the title: 4px between icon/number,
                  32px/16px (mobile) between that group and the title — claude.txt 2026-07-23,
                  "1. Блок Roles" item 6. */}
              <span className="flex items-center gap-4 md:gap-8">
                <span className="inline-flex items-center gap-1">
                  {icon}
                  <span
                    className={cn('text-[12px] font-bold md:text-tiny', styles.roleIndexNumber)}
                  >
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
                  className={cn('size-6 shrink-0 md:size-8', styles.roleToggleClosed)}
                />
              )}
            </button>

            {/* CSS-only expand/collapse animation (0fr/1fr grid-template-rows trick) — avoids a
                JS height measurement just to animate a variable-height panel. */}
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
                  // 16px below the title row, 24px between the description text and the links
                  // grid — trailing space now comes from the row's own constant `mb-6 md:mb-8`
                  // instead of this panel's bottom padding (see the row div's own comment above).
                  className="flex flex-col gap-6 pt-1 md:pl-14"
                >
                  <p className="text-body whitespace-pre-line">{item.description}</p>
                  {safeLinks.length > 0 && (
                    // 2 equal columns (1 on mobile), 20px column gap, 8px row gap — item 9.
                    <div className="grid grid-cols-1 gap-x-5 gap-y-2 md:grid-cols-2">
                      {safeLinks.map((link, linkIndex) => {
                        const previewImage = isSafeHttpUrl(link.ogImage) ? link.ogImage : null;
                        return (
                          <div key={`${link.url}-${linkIndex}`} className="flex flex-col gap-2">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'inline-flex w-fit items-center gap-1 text-base font-bold',
                                styles.roleLinkText,
                              )}
                            >
                              <RoleLinkIcon className="size-4 shrink-0" />
                              {learnMoreLabel}
                            </a>
                            {previewImage && (
                              // Hotlinked third-party og:image, not a local/optimizable asset.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewImage}
                                alt=""
                                className="h-[170px] w-full rounded-xl object-cover"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
