import { CircleCheck } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Figma "filled/valid" state: white border + white text + a small check-circle icon.
   * Additive to the native input API — omit for the default/error states.
   * NOTE: lucide-react ships stroke icons only (no filled `checkbox-circle-fill` glyph), so
   * `CircleCheck` is used as the closest available icon — TODO confirm with designer.
   */
  valid?: boolean;
};

function Input({ className, type, valid, ...props }: InputProps) {
  return (
    <div className="relative w-full">
      <input
        type={type}
        data-slot="input"
        data-valid={valid ? '' : undefined}
        className={cn(
          'flex h-14 w-full min-w-0 rounded-lg border border-input bg-transparent p-4 text-base font-medium text-foreground outline-none transition-colors',
          'placeholder:text-muted-foreground',
          'file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'focus-visible:border-input-focus',
          'aria-invalid:border-destructive',
          'disabled:cursor-not-allowed disabled:opacity-60',
          valid && 'border-input-focus pr-10 text-foreground',
          className,
        )}
        {...props}
      />
      {valid ? (
        <CircleCheck
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-primary"
        />
      ) : null}
    </div>
  );
}

export { Input };
export type { InputProps };
