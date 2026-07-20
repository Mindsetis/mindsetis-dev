'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Minimal accessible toggle switch (`role="switch"`) — the UI Kit had no existing switch/
 * toggle primitive (checked every file in `components/ui/` 2026-07-18: only `Chip`'s
 * `aria-pressed` toggle button existed, which reads as a pill/tag, not an on-off switch). Added
 * here as a first-class kit component (not an inline one-off) for the Mindsetter-onboarding
 * "Accept bookings" toggle (`docs/mindsetter-extended-onboarding.md` section 5), on the same
 * "extract once it's a distinct, likely-reusable control" precedent as `FieldHint`.
 *
 * Plain `<button role="switch" aria-checked>` (not a hidden-checkbox + styled-label trick) —
 * matches `Chip`'s own approach of using native button semantics instead of re-deriving ARIA
 * wiring by hand. No Radix primitive backs this (no `@radix-ui/react-switch` dependency in
 * this project as of this addition) — a controlled on/off button needs no extra behavior
 * (focus trap, orientation, etc.) that would justify pulling one in.
 */
function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex h-7 w-11 shrink-0 cursor-pointer items-center rounded-full bg-white p-2 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked && 'bg-[#79b9e3]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-3 rounded-full bg-black transition-transform',
          checked && 'translate-x-4',
        )}
      />
    </button>
  );
}

export { Switch };
export type { SwitchProps };
