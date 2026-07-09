import { Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Small info-icon + hint text line, e.g. below a field ("You can select more than one",
 * "PNG or JPEG only", the sign-up password requirement checklist). Extracted from the
 * inline pattern in `SignUpForm.tsx`'s `PasswordRequirements` so every field hint shares
 * one implementation instead of re-inventing the icon+text markup per form.
 */
function FieldHint({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-hint"
      className={cn('flex items-center gap-2 text-tiny text-muted-foreground', className)}
      {...props}
    >
      <Info aria-hidden="true" className="size-3 shrink-0 text-foreground" />
      {children}
    </p>
  );
}

export { FieldHint };
