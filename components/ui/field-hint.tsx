import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Field-hint icon (12×12) — `fill="currentColor"` so it inherits the hint text's color. */
function FieldHintIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path
        d="M6 11C3.23857 11 1 8.7614 1 6C1 3.23857 3.23857 1 6 1C8.7614 1 11 3.23857 11 6C11 8.7614 8.7614 11 6 11ZM6 5.5C5.72386 5.5 5.5 5.72386 5.5 6V8C5.5 8.27614 5.72386 8.5 6 8.5C6.27614 8.5 6.5 8.27614 6.5 8V6C6.5 5.72386 6.27614 5.5 6 5.5ZM6 3.5C5.72386 3.5 5.5 3.72386 5.5 4C5.5 4.27614 5.72386 4.5 6 4.5C6.27614 4.5 6.5 4.27614 6.5 4C6.5 3.72386 6.27614 3.5 6 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

type FieldHintProps = HTMLAttributes<HTMLParagraphElement> & {
  /**
   * Default (`false`): `items-start`, so the icon stays pinned to the top of the first line
   * when the hint text wraps to multiple lines (e.g. the interests-picker hint) — a no-op
   * visually for single-line hints. Set `true` for a hint that's always a single line (e.g.
   * the photo-upload "Only PNG or JPEG" hint) to vertically center the icon against the text
   * instead — also cancels the icon's own small top offset (there to correct for `items-start`
   * baseline alignment), which would otherwise nudge it a couple pixels off true center.
   */
  centerIcon?: boolean;
};

/**
 * Small info-icon + hint text line, e.g. below a field ("You can select more than one",
 * "PNG or JPEG only", the sign-up password requirement checklist). Extracted from the
 * inline pattern in `SignUpForm.tsx`'s `PasswordRequirements` so every field hint shares
 * one implementation instead of re-inventing the icon+text markup per form.
 */
function FieldHint({ className, children, centerIcon = false, ...props }: FieldHintProps) {
  return (
    <p
      data-slot="field-hint"
      className={cn(
        'flex gap-1 text-[12px] font-normal text-foreground',
        centerIcon ? 'items-center [&>svg]:mt-0' : 'items-start',
        className,
      )}
      {...props}
    >
      <FieldHintIcon />
      {children}
    </p>
  );
}

export { FieldHint };
