'use client';

import { useState } from 'react';

import {
  AddCircleFillIcon,
  IndeterminateCircleFillIcon,
  MagicFillIcon,
  RoleLinkIcon,
} from '@/components/icons/mindsetter-eyebrow-icons';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/validation/mindsetter';

import { isSafeHttpUrl } from './MemberProfileView';
import styles from './MindsetterProfileView.module.css';

export interface RolesAccordionProps {
  roles: Role[];
  /** `t('roles.learnMore')` — static fallback link label when a link has no `ogTitle`/`siteName`. */
  learnMoreLabel: string;
  /** `t('roles.expand')` / `t('roles.collapse')` — combined with the role's own `title` client-side
   * (plain string concat, not `next-intl`) for each toggle button's `aria-label`, since a Server
   * Component can't hand a translator function across the client boundary. */
  expandLabel: string;
  collapseLabel: string;
}

/**
 * Roles section, EXPAND/COLLAPSE accordion (stage 1.10 pixel-polish pass — ROADMAP "Polish /
 * follow-up" item 2: "Roles render as always-expanded cards (no accordion/expand-collapse
 * interaction from Figma)"). Figma (`327:1129` "Frame 210" desktop / mobile equivalent under
 * `187:4294`) renders Roles as a list of bordered header rows (icon + index number + title +
 * an `indeterminate-circle-fill` "−"/`add-circle-fill` "+" toggle glyph, NOT the bg-card boxes
 * this section used before this pass — that box treatment is now reserved for Superpowers/
 * F*ckUps, which really are individual cards in Figma) — only the row(s) whose toggle is in the
 * "−" state show their description + links underneath. The static mockup snapshot happens to
 * show the first TWO roles expanded simultaneously (not a single-open accordion) — this stays
 * true to that (any number of rows can be open at once, not a radio-style "only one open"
 * accordion), defaulting to just the FIRST role open (a safer, more conventional default than
 * hardcoding "first two", which read as an arbitrary snapshot rather than a real spec).
 *
 * The ONLY client-interactive piece of `MindsetterProfileView` — split out into its own small
 * `'use client'` component (per this pass's brief) specifically so the rest of that large page
 * stays a Server Component; every other section has zero interactivity.
 *
 * SECURITY (do not regress): `role.links[].url` is filtered through `isSafeHttpUrl` before ever
 * reaching a real `<a href>` — this is the exact stored-XSS fix from stage 1.10's review loop
 * (`roleLinkSchema.url` is `.refine(isHttpUrl)` at write time; this is the read-side defense-in-
 * depth re-check, same class as `socials`'s stage-1.6 fix). Kept identical to the pre-accordion
 * version of this section, just relocated into this file.
 */
export function RolesAccordion({
  roles,
  learnMoreLabel,
  expandLabel,
  collapseLabel,
}: RolesAccordionProps) {
  // Figma's own mockup snapshot shows roles #1 and #2 both expanded by default — but that's an
  // illustrative content snapshot, not a spec ("show N roles open"). Defaulting to just the
  // first index open is the more conventional accordion default while still matching Figma's
  // "at least one row visibly expanded out of the box" baseline state.
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
      {roles.map((role, index) => {
        const isOpen = openIndexes.has(index);
        // Stored-XSS guard (audit finding, stage 1.10 review) — unchanged from the pre-accordion
        // implementation, see this component's own doc comment above.
        const safeLinks = role.links.filter((link) => isSafeHttpUrl(link.url));
        const rowKey = `${role.title}-${index}`;
        const panelId = `role-panel-${index}`;
        const headerId = `role-header-${index}`;

        return (
          <div key={rowKey} className={cn('border-t', styles.roleRowBorder)}>
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label={`${isOpen ? collapseLabel : expandLabel} ${role.title}`}
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 md:gap-3">
                <span className="inline-flex items-center gap-1.5 md:gap-2">
                  <MagicFillIcon className="size-3 shrink-0 md:size-3.5" />
                  <span
                    className={cn('text-[12px] font-bold md:text-tiny', styles.roleIndexNumber)}
                  >
                    {index + 1}
                  </span>
                </span>
                <span className="font-display text-[24px] leading-none md:text-l">
                  {role.title}
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
                  className="flex flex-col gap-3 pb-5 md:pl-14"
                >
                  <p className="text-body whitespace-pre-line">{role.description}</p>
                  {safeLinks.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {safeLinks.map((link, linkIndex) => (
                        <a
                          key={`${link.url}-${linkIndex}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'inline-flex w-fit items-center gap-2 text-base font-bold',
                            styles.roleLinkText,
                          )}
                        >
                          <RoleLinkIcon className="size-4 shrink-0" />
                          {link.ogTitle || link.siteName || learnMoreLabel}
                        </a>
                      ))}
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
