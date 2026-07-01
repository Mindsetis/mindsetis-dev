import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Map a Server Action's `ActionFailure.error.fieldErrors` onto the matching React Hook
 * Form fields, so client-side error text stays in sync with server-side Zod validation.
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: Record<string, string[]> | undefined,
): void {
  if (!fieldErrors) return;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (!message || field === '_form') continue;
    setError(field as Path<T>, { type: 'server', message });
  }
}
