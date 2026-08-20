'use client';

import { type ReactNode, useRef, useState } from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  keywordAwareFilter,
  SelectChevronIcon,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverContentSide,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type ComboboxOption = {
  value: string;
  label: string;
  /** Optional secondary line rendered under `label` in the LIST (e.g. a timezone's "UTC+3"
   * short-offset). Omitted → single-line option, unchanged from the original behavior. */
  description?: string;
  /**
   * Extra strings this option should match while typing, but never display — e.g. the
   * country field's localized spellings, so "Україна" and "España" find Ukraine and Spain
   * in an English-labelled list. Only meaningful with cmdk's client-side filtering (a
   * remote-search field filters on the server instead).
   */
  keywords?: string[];
};

/**
 * Selected-value check icon (16×16) — same verbatim path as `Input`'s `CheckIcon` /
 * `Chip`'s `ChipCheckIcon` (Figma "checkbox-circle-fill", brand-blue fill `#79b9e3` /
 * `--color-primary`). Duplicated locally rather than imported, matching this codebase's
 * existing convention of each consumer keeping its own verbatim copy (see the "provided
 * verbatim by the designer" comments on the other two). Always `text-primary` — per the
 * 2026-07-17 spec this color never changes with the trigger's other state colors.
 */
function ComboboxCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.9987 14.6668C11.6806 14.6668 14.6654 11.682 14.6654 8.00016C14.6654 4.31826 11.6806 1.3335 7.9987 1.3335C4.3168 1.3335 1.33203 4.31826 1.33203 8.00016C1.33203 11.682 4.3168 14.6668 7.9987 14.6668ZM11.1654 5.8335C11.4257 6.09385 11.4257 6.51596 11.1654 6.7763L8.03914 9.90252C7.64861 10.293 7.01545 10.293 6.62492 9.90252L4.9987 8.2763C4.73835 8.01595 4.73835 7.59384 4.9987 7.33349C5.25905 7.07315 5.68116 7.07315 5.9415 7.3335L7.33203 8.72403L10.2226 5.8335C10.4829 5.57315 10.905 5.57315 11.1654 5.8335Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  /**
   * Off by default (2026-07-17: search disabled across every select for now) — pass `true` to
   * show the `CommandInput` search box for a field that specifically needs it. Kept as a prop
   * (not deleted) so this is a one-line per-field opt-in later, not a re-add.
   */
  searchable?: boolean;
  /**
   * Error-state styling hook. Rendered as `data-invalid` (a plain data attribute), not
   * `aria-invalid` — same rationale as `LanguagesMultiSelect`: the ARIA spec doesn't support
   * `aria-invalid` on `role="button"`, and this trigger isn't a real form control anyway (the
   * actual error text is `FormMessage`, already announced via the field's `aria-describedby`).
   */
  invalid?: boolean;
  /** Optional icon rendered at the START of the trigger, before the value (e.g. the timezone
   * field's globe). 4px gap to the value. Omitted → no leading icon (default). */
  leftIcon?: ReactNode;
  /** Optional secondary line rendered under the selected value's label IN THE TRIGGER (e.g. the
   * timezone field's live "UTC+3 · currently 14:30"). Only shown when a value is selected. */
  triggerDescription?: ReactNode;
  /** Optional replacement for the trigger's trailing icon. When set, this renders instead of the
   * default check-circle (selected) / chevron (empty) swap — e.g. the timezone field's static
   * chevron. Omitted → the default check/chevron behavior. */
  trailingIcon?: ReactNode;
  /**
   * Controlled search text. Pass together with `shouldFilter={false}` for a REMOTE-search field
   * (e.g. `CityCombobox`, whose 170k-row list can never be shipped to the client): the owner
   * debounces this value, fetches, and feeds the results back in as `options`. Omitted → the
   * `CommandInput` stays uncontrolled and cmdk filters `options` locally, unchanged.
   */
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  /**
   * `false` disables cmdk's built-in client-side filtering — required when `options` are already
   * the server's answer for `searchValue`, otherwise cmdk would filter the result set a second
   * time against its own fuzzy matcher and drop legitimate rows (a server hit on an alias like
   * "Kiev" returns the row labelled "Kyiv", which cmdk's local matcher would then hide).
   */
  shouldFilter?: boolean;
  /** Replaces `emptyLabel` while a remote search is in flight, so the list doesn't flash
   * "nothing found" between keystroke and response. */
  isLoading?: boolean;
  loadingLabel?: string;
};

/**
 * Shared single-select combobox — Popover + `Command` list, styled to match the Figma "input
 * drop-down" component set (originally built for the registration wizard's Industry field,
 * generalized here so any single-select field in the app can reuse the same chrome instead of
 * re-deriving it — e.g. a future country picker).
 *
 * The trigger renders the selected option's label as plain text (like `SelectValue`), not a
 * chip — there's never more than one value to show. Distinct from `LanguagesMultiSelect`
 * (array-shaped value/onChange, chip rendering, stays open on selection) — that component's
 * multi-select semantics don't fit a single value with no "remove" affordance.
 *
 * Border/chevron color (2026-07-17 spec) track ONE shared state, in priority order: invalid
 * (red `destructive`) > open or has-a-value (white `input-focus`) > default (grey `input`,
 * i.e. the exact color of the trigger's own resting border — not `muted-foreground`, a
 * deliberately different token). The popover content's border/the "merged shape" trick both
 * reuse the same color so the whole control — trigger, chevron, list border — always reads as
 * one coherent color, not just the fill/glow-heavy states. The trigger's corners/border square
 * off on whichever edge touches the content when open (`rounded-b-none border-b-transparent`
 * below the trigger — the common case — or `rounded-t-none border-t-transparent` if Radix flips
 * the popover above it for lack of room; `usePopoverContentSide`, `components/ui/popover.tsx`,
 * tracks the actual side) and the popover content mirrors that on its own opposite edge +
 * `sideOffset={-1}` (deliberately raised 1px, per spec, to close a hairline seam) + no shadow,
 * so the two pieces read as one continuous merged shape instead of a detached floating popover
 * (verified live — no visible seam at `sideOffset={0}`; `-1` tightens it further per this pass's
 * explicit ask). The list panel is opaque `bg-background`
 * (pure black, per spec — previously `bg-popover`/`#1a1a1a`; before that briefly
 * `bg-transparent`, which let page content sitting behind the floating portal bleed through —
 * stay opaque). A selected option renders `text-foreground` in the list (no checkmark — single-
 * select items never get one, per spec) and, in the closed trigger, replaces the trailing
 * chevron with the check-circle badge (`ComboboxCheckIcon`, always `text-primary`, exempt from
 * the shared border-color state).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  searchable = false,
  invalid,
  leftIcon,
  triggerDescription,
  trailingIcon,
  searchValue,
  onSearchValueChange,
  shouldFilter,
  isLoading,
  loadingLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { contentRef, side } = usePopoverContentSide();
  const isTop = side === 'top';

  const selectedOption = options.find((option) => option.value === value);
  const hasValue = !!selectedOption;

  const borderColorClass = invalid
    ? 'border-destructive'
    : open || hasValue
      ? 'border-input-focus'
      : 'border-input';
  const chevronColorClass = invalid
    ? 'text-destructive'
    : open || hasValue
      ? 'text-input-focus'
      : 'text-input';

  function select(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    // See `LanguagesMultiSelect` for why `disabled` is enforced via the controlled `open`
    // state's own setter rather than a handler on the trigger element.
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          ref={triggerRef}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={open}
          data-invalid={invalid ? '' : undefined}
          data-disabled={disabled ? '' : undefined}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              triggerRef.current?.click();
            }
          }}
          className={cn(
            'flex min-h-14 w-full items-center gap-1 rounded-lg border bg-transparent py-2 pr-4 pl-4 text-base font-medium text-foreground outline-none transition-colors',
            borderColorClass,
            // Merge with the popover content into one continuous shape: square off whichever
            // edge actually touches the content (Radix may flip the popover above the trigger
            // when there isn't room below — `usePopoverContentSide` tracks that) and drop that
            // edge's border; the content panel mirrors this on its own opposite edge + a
            // `sideOffset={-1}` (see below).
            open &&
              (isTop
                ? 'rounded-t-none border-t-transparent'
                : 'rounded-b-none border-b-transparent'),
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
          )}
        >
          {leftIcon ? (
            <span aria-hidden="true" className="shrink-0">
              {leftIcon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            {selectedOption ? (
              <>
                <span className="truncate text-foreground">{selectedOption.label}</span>
                {triggerDescription ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {triggerDescription}
                  </span>
                ) : null}
              </>
            ) : (
              <span className={cn('truncate', open ? 'text-foreground' : 'text-muted-foreground')}>
                {placeholder}
              </span>
            )}
          </div>
          {trailingIcon ? (
            <span aria-hidden="true" className="ml-auto shrink-0">
              {trailingIcon}
            </span>
          ) : selectedOption ? (
            <span aria-hidden="true" className="ml-auto shrink-0 text-primary">
              <ComboboxCheckIcon />
            </span>
          ) : (
            <SelectChevronIcon className={cn('ml-auto size-4 shrink-0', chevronColorClass)} />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        sideOffset={-1}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] bg-background p-0 shadow-none',
          isTop ? 'rounded-b-none border-b-0' : 'rounded-t-none border-t-0',
          invalid ? 'border-destructive' : 'border-input-focus',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command
          shouldFilter={shouldFilter}
          filter={
            options.some((option) => option.keywords?.length) ? keywordAwareFilter : undefined
          }
          className={cn('bg-background', isTop ? 'rounded-b-none' : 'rounded-t-none')}
        >
          {searchable ? (
            <CommandInput
              placeholder={searchPlaceholder}
              {...(onSearchValueChange
                ? { value: searchValue ?? '', onValueChange: onSearchValueChange }
                : {})}
            />
          ) : null}
          <CommandList>
            <CommandEmpty>{isLoading ? (loadingLabel ?? emptyLabel) : emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    // With local filtering, cmdk matches the query against this prop, so it must
                    // be the human-readable label. With remote results it must instead be the
                    // unique id: city labels legitimately repeat ("Springfield" ×6), and cmdk
                    // keys its selection state by this value.
                    value={shouldFilter === false ? option.value : option.label}
                    keywords={option.keywords}
                    onSelect={() => select(option.value)}
                    className={cn(isSelected && 'text-foreground')}
                  >
                    {option.description ? (
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        <span className="truncate text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    ) : (
                      option.label
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { ComboboxOption, ComboboxProps };
