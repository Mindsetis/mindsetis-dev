import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Toggled-on visual state: `border-primary text-primary` instead of the default border. */
  selected?: boolean;
  /**
   * Shows a small check-circle overlay when `selected` (Figma `checkbox-circle-fill`, on
   * the interest tag chips only — category filter chips never show it). Off by default.
   */
  showCheck?: boolean;
};

/** Selected-chip check icon (16×16) — provided verbatim by the designer. */
function ChipCheckIcon() {
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
 * Larger interactive pill toggle (Figma "Member profile" interests/category chips) — a
 * real `<button>` (not a styled `<span>`) so it's keyboard/AT accessible, unlike the
 * existing `Badge` (non-interactive, smaller `py-0.5` sizing). Used for both the category
 * filter row and the individual interest tag toggles.
 */
function Chip({
  className,
  selected = false,
  showCheck = false,
  children,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      data-slot="chip"
      data-selected={selected ? '' : undefined}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-transparent px-3 text-[12px] font-normal whitespace-nowrap text-foreground transition-colors',
        'hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60',
        selected && 'border-primary text-primary hover:border-primary',
        className,
      )}
      {...props}
    >
      {children}
      {selected && showCheck ? <ChipCheckIcon /> : null}
    </button>
  );
}

export { Chip };
export type { ChipProps };
