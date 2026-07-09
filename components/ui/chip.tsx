import { CircleCheck } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Toggled-on visual state: `border-primary text-primary` instead of the default border. */
  selected?: boolean;
  /**
   * Shows a small check-circle overlay when `selected` (Figma `checkbox-circle-fill`, on
   * the interest tag chips only — category filter chips never show it). Off by default.
   * NOTE: same lucide-react caveat as `Input`'s `valid` prop — there's no filled glyph
   * available, so the closest stroke icon (`CircleCheck`) stands in for it.
   */
  showCheck?: boolean;
};

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
        'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-transparent px-4 text-sm font-medium whitespace-nowrap text-foreground transition-colors',
        'hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60',
        selected && 'border-primary text-primary hover:border-primary',
        className,
      )}
      {...props}
    >
      {children}
      {selected && showCheck ? (
        <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}

export { Chip };
export type { ChipProps };
