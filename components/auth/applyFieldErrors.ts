import type { FieldValues, Path, UseFormReturn, UseFormSetError } from 'react-hook-form';
import { get } from 'react-hook-form';

import { revealFirstError, type RevealSource } from '@/components/ui/form-errors';
import type { ActionFailure } from '@/lib/api/result';

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

/** Whether the form has an input for `path`: the exact field (or a list/group of them, like
 * `roles`), or a custom control registered for an ancestor path that renders its whole subtree
 * itself (`weeklyAvailability` for `weeklyAvailability.mon.0.to`, `topics` for `topics.2`).
 * `control._fields` holds everything the form has ever registered — including the inputs inside a
 * card that is collapsed right now. */
function hasFieldFor<T extends FieldValues>(form: UseFormReturn<T>, path: string): boolean {
  const fields = form.control._fields;
  if (get(fields, path) !== undefined) return true;
  const segments = path.split('.');
  for (let length = segments.length - 1; length > 0; length -= 1) {
    if (get(fields, segments.slice(0, length).join('.'))?._f) return true;
  }
  return false;
}

/**
 * The full failed-save handling for a form, in one call. Returns the lines for the form's error
 * banner (`FormErrorAlert`):
 *   - field errors whose name is a field THIS form registered go onto that field, as
 *     `applyFieldErrors` does;
 *   - any other — a server path the form has no input for (`contact.email`), or a form-level
 *     `_form` issue — used to vanish, leaving a generic "Please check the form" with nothing
 *     highlighted. It is returned after the action's own message so the banner says what's wrong;
 *   - the first visible field error is scrolled to and focused (`revealFirstError`), including one
 *     inside a collapsed card, which re-opens itself once the error lands.
 *
 * `from` is the submit event `handleSubmit` passes as the second argument of its success callback.
 */
export function applyActionFailure<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: ActionFailure['error'],
  from?: RevealSource,
): string[] {
  const unplaced: string[] = [];

  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    const message = messages[0];
    if (!message) continue;
    if (field !== '_form' && hasFieldFor(form, field)) {
      form.setError(field as Path<T>, { type: 'server', message });
    } else {
      unplaced.push(message);
    }
  }

  revealFirstError(from);
  return [error.message, ...unplaced];
}
