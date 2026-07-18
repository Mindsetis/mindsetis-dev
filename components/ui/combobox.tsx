'use client';

import { useRef, useState } from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  SelectChevronIcon,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type ComboboxOption = { value: string; label: string };

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
 * one coherent color, not just the fill/glow-heavy states. The trigger's bottom corners/border
 * square off when open (`rounded-b-none border-b-transparent`) and the popover content's top
 * corners/border square off + `sideOffset={-1}` (deliberately raised 1px, per spec, to close
 * a hairline seam) + no shadow, so the two pieces read as one continuous merged shape instead
 * of a detached floating popover (verified live — no visible seam at `sideOffset={0}`; `-1`
 * tightens it further per this pass's explicit ask). The list panel is opaque `bg-background`
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
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

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
            'flex h-14 w-full items-center gap-1.5 rounded-lg border bg-transparent py-2 pr-4 pl-4 text-base font-medium text-foreground outline-none transition-colors',
            borderColorClass,
            // Merge with the popover content below into one continuous shape: square off the
            // trigger's bottom corners and drop its bottom border (the content panel mirrors
            // this with `rounded-t-none border-t-0` + `sideOffset={-1}`, see below).
            open && 'rounded-b-none border-b-transparent',
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
          )}
        >
          {selectedOption ? (
            <span className="truncate text-foreground">{selectedOption.label}</span>
          ) : (
            <span className={open ? 'text-foreground' : 'text-muted-foreground'}>
              {placeholder}
            </span>
          )}
          {selectedOption ? (
            <span aria-hidden="true" className="ml-auto shrink-0 text-primary">
              <ComboboxCheckIcon />
            </span>
          ) : (
            <SelectChevronIcon className={cn('ml-auto size-4 shrink-0', chevronColorClass)} />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={-1}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] rounded-t-none border-t-0 bg-background p-0 shadow-none',
          invalid ? 'border-destructive' : 'border-input-focus',
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command className="rounded-t-none bg-background">
          {searchable ? <CommandInput placeholder={searchPlaceholder} /> : null}
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => select(option.value)}
                    className={cn(isSelected && 'text-foreground')}
                  >
                    {option.label}
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
