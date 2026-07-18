'use client';

import { X } from 'lucide-react';
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

type Option = { value: string; label: string };

type LanguagesMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly Option[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  removeLabel: (label: string) => string;
  disabled?: boolean;
  /**
   * Off by default (2026-07-17: search disabled across every select for now) — pass `true` to
   * show the `CommandInput` search box for a field that specifically needs it.
   */
  searchable?: boolean;
  /**
   * Error-state styling hook. Rendered as `data-invalid` (a plain data attribute), not
   * `aria-invalid` — the ARIA spec doesn't support `aria-invalid` on `role="button"`, and
   * this trigger isn't a real form control anyway (the actual error text is `FormMessage`,
   * already announced via the field's `aria-describedby`).
   */
  invalid?: boolean;
};

/** Unselected multi-select option indicator (16×16) — provided verbatim by the designer. */
function OptionUncheckedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.0026 14.6668C4.3207 14.6668 1.33594 11.682 1.33594 8.00016C1.33594 4.31826 4.3207 1.3335 8.0026 1.3335C11.6845 1.3335 14.6693 4.31826 14.6693 8.00016C14.6693 11.682 11.6845 14.6668 8.0026 14.6668ZM8.0026 13.3335C10.9481 13.3335 13.3359 10.9457 13.3359 8.00016C13.3359 5.05464 10.9481 2.66683 8.0026 2.66683C5.05708 2.66683 2.66927 5.05464 2.66927 8.00016C2.66927 10.9457 5.05708 13.3335 8.0026 13.3335Z"
        fill="white"
      />
    </svg>
  );
}

/** Selected multi-select option indicator (16×16) — provided verbatim by the designer. */
function OptionCheckedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.0026 1.3335C4.33594 1.3335 1.33594 4.3335 1.33594 8.00016C1.33594 11.6668 4.33594 14.6668 8.0026 14.6668C11.6693 14.6668 14.6693 11.6668 14.6693 8.00016C14.6693 4.3335 11.6693 1.3335 8.0026 1.3335ZM10.8026 6.86683L7.6026 10.0668C7.33594 10.3335 6.93594 10.3335 6.66927 10.0668L5.2026 8.60016C4.93594 8.3335 4.93594 7.9335 5.2026 7.66683C5.46927 7.40016 5.86927 7.40016 6.13594 7.66683L7.13594 8.66683L9.86927 5.9335C10.1359 5.66683 10.5359 5.66683 10.8026 5.9335C11.0693 6.20016 11.0693 6.60016 10.8026 6.86683Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/**
 * "Language you speak" multi-select — Radix `Select` only supports single-select, so this
 * is a `Popover` + `Command` checkbox-list (shadcn combobox pattern) with selected items
 * rendered as removable chips inside the trigger.
 *
 * The trigger is a `div[role=button]` (not a real `<button>`) so the per-chip remove
 * `<button>`s nested inside it stay valid, interactive, keyboard-focusable elements
 * (a `<button>` can't contain another `<button>`). `Popover.Trigger`'s `onClick`/ARIA wiring
 * is attached via `asChild` regardless of the underlying tag; the `onKeyDown` handler below
 * only fills the native-button gap (Enter/Space normally auto-fire `click`, a plain `div`
 * doesn't) by forwarding to the same ref's `click()`.
 *
 * Open-state chrome matches the Figma "input drop-down" merged-shape treatment (same
 * technique as `components/ui/combobox.tsx`): the trigger's bottom corners/border square off,
 * and the popover content's top corners/border square off + `sideOffset={-1}` (deliberately
 * raised 1px past a flush `0`, per the 2026-07-17 spec) + no shadow, so the two pieces read as
 * one continuous shape instead of Radix Popover's default detached floating box. Border/chevron
 * color track ONE shared state (invalid `destructive` > open or has-a-selected-chip
 * `input-focus` > default `input`) so the trigger's border, its chevron, and the list panel's
 * border always agree — same rule `Combobox` uses for its own "has a value" case, applied here
 * per-chip instead of per-single-value (no closed-state check-circle swap, though — chips
 * already show the selection, there's no single value to spotlight that way).
 * Each option row shows a leading circular indicator (`OptionUncheckedIcon`/`OptionCheckedIcon`,
 * provided verbatim by the designer) instead of the old square checkbox.
 */
export function LanguagesMultiSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  removeLabel,
  disabled,
  searchable = false,
  invalid,
}: LanguagesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((option) => value.includes(option.value));
  const hasValue = selectedOptions.length > 0;

  // White border/chevron once there's at least one selected chip — not just while `open` —
  // per the 2026-07-17 follow-up, matching `Combobox`'s "has a value" rule.
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

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  }

  function remove(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue));
  }

  return (
    // `disabled` is only enforced here, in `onOpenChange` — Radix's `Slot`-based prop
    // merging always invokes its own attached `onClick` after ours (no `defaultPrevented`
    // gating, see `@radix-ui/react-slot`'s `mergeProps`), so neither `preventDefault` nor
    // `stopPropagation` on a handler placed on the trigger element itself would actually
    // stop Radix from opening it; gating the controlled `open` state's own setter is what
    // makes `disabled` effective regardless of how the click reached the trigger.
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
            'flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-transparent py-2 pr-4 pl-4 text-base font-medium text-foreground outline-none transition-colors',
            borderColorClass,
            // Merge with the popover content below into one continuous shape — same
            // technique as `components/ui/combobox.tsx`: square off the trigger's bottom
            // corners/border, the content panel mirrors this with `rounded-t-none
            // border-t-0` + `sideOffset={-1}` below.
            open && 'rounded-b-none border-b-transparent',
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="py-2 text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
              >
                {option.label}
                <button
                  type="button"
                  aria-label={removeLabel(option.label)}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(option.value);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            ))
          )}
          <SelectChevronIcon className={cn('ml-auto size-4 shrink-0', chevronColorClass)} />
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
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                    className={cn(isSelected && 'text-foreground')}
                  >
                    {isSelected ? <OptionCheckedIcon /> : <OptionUncheckedIcon />}
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
