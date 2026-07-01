import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-lg border border-input bg-transparent p-4 text-base font-medium text-foreground outline-none transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:border-input-focus',
        'aria-invalid:border-destructive',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
