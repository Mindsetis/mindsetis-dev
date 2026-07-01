import type { ReactNode } from 'react';

/**
 * Shared input styling for the auth forms (stage 0.6). Full UI Kit input tokens land in
 * Stage 0.8 — this is a minimal, accessible, dark-themed baseline.
 */
export const authInputClass =
  'w-full rounded-md border border-border bg-white/[0.03] px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

type AuthFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
};

/** Labeled form-field wrapper: label + input (passed as children) + linked error text. */
export function AuthField({ label, htmlFor, error, children }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
