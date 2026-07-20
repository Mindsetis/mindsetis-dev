import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Figma "filled/valid" state: white border + white text + a small check-circle icon.
   * Additive to the native input API — omit for the default/error states.
   * Icon is provided verbatim by the designer (see `CheckIcon` below) and is skipped for
   * `type="password"` fields, which already have their own show/hide toggle occupying the
   * same right-side slot (see `PasswordToggle` in `components/auth/SignUpForm.tsx`).
   */
  valid?: boolean;
};

/** Valid-field check icon (16×16) — provided verbatim by the designer for the Figma "filled/valid" state. */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.9987 14.6668C11.6806 14.6668 14.6654 11.682 14.6654 8.00016C14.6654 4.31826 11.6806 1.3335 7.9987 1.3335C4.3168 1.3335 1.33203 4.31826 1.33203 8.00016C1.33203 11.682 4.3168 14.6668 7.9987 14.6668ZM11.1654 5.8335C11.4257 6.09385 11.4257 6.51596 11.1654 6.7763L8.03914 9.90252C7.64861 10.293 7.01545 10.293 6.62492 9.90252L4.9987 8.2763C4.73835 8.01595 4.73835 7.59384 4.9987 7.33349C5.25905 7.07315 5.68116 7.07315 5.9415 7.3335L7.33203 8.72403L10.2226 5.8335C10.4829 5.57315 10.905 5.57315 11.1654 5.8335Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
      {valid && type !== 'password' ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-primary"
        >
          <CheckIcon />
        </span>
      ) : null}
    </div>
  );
}

export { Input };
export type { InputProps };
