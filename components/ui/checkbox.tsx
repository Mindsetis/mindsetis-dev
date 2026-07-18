'use client';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `'square'` (default, `rounded`) is the original Session-Terms-consent shape; `'circle'`
   * (`rounded-full`) is the Mindsetter-onboarding "Make your profile shine" picker's per-block
   * circular checkbox (onboarding doc section 6) — same primitive, just a rounder corner. */
  shape?: 'square' | 'circle';
};

/** Checked-checkbox glyph (16×16) — the same check mark `Chip`/`LanguagesMultiSelect` already
 * use for their own selected states, reused verbatim so every checkbox-shaped control in the
 * app shares one visual mark. */
function CheckboxCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.9987 14.6666C11.6806 14.6666 14.6654 11.6818 14.6654 7.99998C14.6654 4.31808 11.6806 1.33331 7.9987 1.33331C4.3168 1.33331 1.33203 4.31808 1.33203 7.99998C1.33203 11.6818 4.3168 14.6666 7.9987 14.6666ZM11.1654 5.83332C11.4257 6.09367 11.4257 6.51577 11.1654 6.77612L8.03914 9.90234C7.64861 10.2929 7.01545 10.2929 6.62492 9.90234L4.9987 8.27612C4.73835 8.01577 4.73835 7.59366 4.9987 7.33331C5.25905 7.07296 5.68116 7.07297 5.9415 7.33331L7.33203 8.72385L10.2226 5.83331C10.4829 5.57296 10.905 5.57296 11.1654 5.83332Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/**
 * Minimal accessible checkbox (`role="checkbox"`) — added for the Mindsetter-onboarding
 * "Platform fee & payouts" modal's Session Terms consent (`docs/mindsetter-extended-onboarding.md`
 * section 5's nested modal); the UI Kit had no existing checkbox primitive. Square (not
 * `Switch`'s pill shape), shows `CheckboxCheckIcon` when checked. Same "no Radix dependency
 * needed for a plain controlled toggle" reasoning as `Switch`.
 */
function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  shape = 'square',
  className,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center border border-border bg-transparent outline-none transition-colors',
        shape === 'circle' ? 'rounded-full' : 'rounded',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        checked && 'border-primary',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {checked ? <CheckboxCheckIcon /> : null}
    </button>
  );
}

export { Checkbox };
export type { CheckboxProps };
