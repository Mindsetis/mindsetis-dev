'use client';

import { Check, ChevronDown } from 'lucide-react';
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

type IndustryComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  /**
   * Error-state styling hook. Rendered as `data-invalid` (a plain data attribute), not
   * `aria-invalid` — same rationale as `LanguagesMultiSelect`: the ARIA spec doesn't support
   * `aria-invalid` on `role="button"`, and this trigger isn't a real form control anyway (the
   * actual error text is `FormMessage`, already announced via the field's `aria-describedby`).
   */
  invalid?: boolean;
};

/**
 * Single-select "Industry" combobox — same Popover + searchable `Command` list chrome as
 * `LanguagesMultiSelect` (stage 1.6 Figma follow-up: give Industry the same visual/interaction
 * language), but for a single `string` value instead of `string[]`. Kept as a sibling
 * component rather than reusing `LanguagesMultiSelect` with a length-1 array: that component's
 * value/onChange/toggle/remove logic and chip rendering are array-shaped throughout, and a
 * single value here has no "remove" affordance — picking an option just sets it and closes the
 * popover (unlike the multi-select, which stays open and toggles).
 *
 * The trigger renders the selected option's label as plain text (like `SelectValue`), not a
 * chip, since there's never more than one value to show.
 */
export function IndustryCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled,
  invalid,
}: IndustryComboboxProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

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
            'flex h-14 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent p-2 pl-4 text-base font-medium text-foreground outline-none transition-colors',
            'focus-visible:border-input-focus',
            'data-[invalid]:border-destructive',
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
          )}
        >
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
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
                const isSelected = option.value === value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => select(option.value)}
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
