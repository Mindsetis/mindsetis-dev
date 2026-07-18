import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /**
   * Figma "filled/valid" state: white border only (no icon — `Textarea` has no room for the
   * right-side check icon `Input` uses). Additive to the native textarea API — omit for the
   * default/error states.
   */
  valid?: boolean;
};

function Textarea({ className, valid, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-valid={valid ? '' : undefined}
      className={cn(
        'flex min-h-24 w-full rounded-lg border border-input bg-transparent p-4 text-base font-medium text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:border-input-focus',
        'aria-invalid:border-destructive',
        'disabled:cursor-not-allowed disabled:opacity-60',
        valid && 'border-input-focus',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
