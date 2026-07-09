'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
   * Error-state styling hook. Rendered as `data-invalid` (a plain data attribute), not
   * `aria-invalid` — the ARIA spec doesn't support `aria-invalid` on `role="button"`, and
   * this trigger isn't a real form control anyway (the actual error text is `FormMessage`,
   * already announced via the field's `aria-describedby`).
   */
  invalid?: boolean;
};

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
  invalid,
}: LanguagesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedOptions = options.filter((option) => value.includes(option.value));

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
            'flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent p-2 pl-4 text-base font-medium text-foreground outline-none transition-colors',
            'focus-visible:border-input-focus',
            'data-[invalid]:border-destructive',
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
          <ChevronDown
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 text-muted-foreground"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
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
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-border',
                        isSelected && 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {isSelected ? <Check className="size-3" aria-hidden="true" /> : null}
                    </span>
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
