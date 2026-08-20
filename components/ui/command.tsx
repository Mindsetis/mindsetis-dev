'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Select-trigger chevron (24×24) — provided verbatim by the designer, replacing
 * `lucide-react`'s `ChevronDown` in the two select-style comboboxes built on this file's
 * primitives (`components/ui/combobox.tsx`, `components/member-profile/LanguagesMultiSelect.tsx`).
 * `fill="currentColor"` (not the source asset's hardcoded `#A5A5A5`) so it keeps tracking each
 * consumer's own border-color state (default/open/invalid) exactly as the previous lucide icon
 * did — only the shape changed, not the color-state logic.
 */
function SelectChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16.9008 9.19999C16.5008 8.79999 15.9008 8.79999 15.5008 9.19999L12.0008 12.7L8.50078 9.19999C8.10078 8.79999 7.50078 8.79999 7.10078 9.19999C6.70078 9.59999 6.70078 10.2 7.10078 10.6L11.3008 14.8C11.5008 15 11.7008 15.1 12.0008 15.1C12.3008 15.1 12.5008 15 12.7008 14.8L16.9008 10.6C17.3008 10.2 17.3008 9.59999 16.9008 9.19999Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Thin wrapper around `cmdk`'s `Command` primitives, themed for the dark UI Kit. Used as
 * the list/filter part of the `Popover`+`Command` multi-select pattern (e.g. the "Language
 * you speak" picker) — no `CommandDialog` here, this project has no command-palette use
 * case yet, just the plain in-popover list.
 */
function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg bg-background text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-2 border-b border-border px-3"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-64 scroll-py-1 overflow-x-hidden overflow-y-auto p-0', className)}
      {...props}
    />
  );
}

function CommandEmpty({ ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-6 text-center text-sm text-muted-foreground"
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        // 16px padding lives here, and only here — every other Command piece (`CommandList`,
        // `CommandItem`) is zero-padding, per the dropdown-menu spec (2026-07-17): the option
        // list's own 16px inset is the single source of the dropdown's padding. No top padding
        // (2026-07-17 follow-up) — the first option row sits flush against the top of the panel.
        'overflow-hidden px-4 pt-0 pb-4 text-foreground',
        '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-tiny [&_[cmdk-group-heading]]:text-muted-foreground',
        // 24px vertical gap between option rows (cmdk wraps a group's actual items in its own
        // `[cmdk-group-items]` container, separate from the heading — same targeting technique
        // as the heading selector above).
        '[&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-6',
        className,
      )}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        // No background (not even on hover/keyboard-highlight), zero padding (see
        // `CommandGroup`), 16px/500/`#a5a5a5` text — the base "unselected option" look;
        // consumers layer a `text-foreground` override for the currently-selected option.
        'relative flex cursor-pointer items-center gap-2 p-0 text-base font-medium text-muted-foreground outline-none select-none',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/** Lower-case + drop combining diacritics, so "Espana" matches "España" and vice versa. */
const foldForMatch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim();

/**
 * Deterministic prefix/substring scorer, passed to `Command`'s `filter` prop INSTEAD of
 * cmdk's default fuzzy matcher — but only for lists whose options carry `keywords` (today:
 * the country and language pickers).
 *
 * cmdk's built-in `command-score` is fuzzy and weights an item's own value above its
 * keywords, which ranked Germany THIRD for the Spanish query "Alemania" — behind
 * "Democratic Republic of the Congo" and "Dominican Republic", whose labels happen to
 * contain those letters in order. When the alias IS the user's entire query, an exact hit
 * must win outright, so scoring here is explicit: exact > prefix > substring > no match
 * (0 hides the row).
 *
 * Lives here rather than in one picker because both `Combobox` and `LanguagesMultiSelect`
 * need it and neither owns the other; scoped to keyword-bearing lists on purpose, so every
 * other list in the app keeps cmdk's fuzzy behavior unchanged.
 */
function keywordAwareFilter(value: string, search: string, keywords?: string[]): number {
  const query = foldForMatch(search);
  if (!query) return 1;

  let best = 0;
  for (const candidate of [value, ...(keywords ?? [])]) {
    const folded = foldForMatch(candidate);
    if (folded === query) return 1;
    if (folded.startsWith(query)) best = Math.max(best, 0.8);
    else if (folded.includes(query)) best = Math.max(best, 0.4);
  }
  return best;
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  keywordAwareFilter,
  SelectChevronIcon,
};
