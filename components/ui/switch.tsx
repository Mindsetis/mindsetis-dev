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
      // 44×24 track with a 20px knob and a 2px inset all round (2026-08-13 spec): `p-0.5` is that
      // inset, so the knob travels 44 − 20 − 2 − 2 = 20px (`translate-x-5`) between ends. Track is
      // `#747474` off / `#79b9e3` on; the knob stays white in both states.
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-[#747474] p-0.5 outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked && 'bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-5 rounded-full bg-white transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

export { Switch };
export type { SwitchProps };
