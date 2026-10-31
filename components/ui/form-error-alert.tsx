'use client';

import { useEffect, useRef } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { FIELD_ERROR_SELECTOR, scrollIntoViewIfNeeded } from '@/components/ui/form-errors';
import { useValidationMessage } from '@/components/ui/use-validation-message';

/** What a form keeps in its `formError` state: one sentence, several, or nothing. */
export type FormBanner = string | readonly string[] | null | undefined;

/**
 * The form-level error banner every editor shows for a failed Server Action.
 *
 * Over the plain `Alert` it replaces it adds two things:
 *   - Each line is run through the validation-message decoder, so a schema error that could not be
 *     attached to a field (`applyActionFailure`'s leftovers) reads as locale text, while an
 *     `ActionError` sentence passes through untouched. Identical lines collapse into one.
 *   - It scrolls itself into view when it appears. The banner sits at the TOP of the form but the
 *     Save button is pinned to the BOTTOM of the screen, so on a long form the failure it reports
 *     was otherwise off-screen — "Save" appeared to do nothing. It stays put when a field error is
 *     on screen instead: `revealFirstError` takes the visitor to that field, which is the more
 *     useful place to land.
 */
export function FormErrorAlert({
  messages,
  className,
}: {
  messages: FormBanner;
  /** Spacing for forms that aren't a `gap` flex column — applied to the wrapper, which exists only
   * while there is something to show. */
  className?: string;
}) {
  const tValidation = useValidationMessage();
  const ref = useRef<HTMLDivElement>(null);

  const raw = typeof messages === 'string' ? [messages] : (messages ?? []);
  const lines = Array.from(new Set(raw.map((line) => tValidation(line)).filter(Boolean)));
  const text = lines.join('\n');

  useEffect(() => {
    const alert = ref.current;
    if (!text || !alert) return;

    const frame = requestAnimationFrame(() => {
      const scope = alert.closest('form') ?? alert.parentElement;
      if (scope?.querySelector(FIELD_ERROR_SELECTOR)) return;
      scrollIntoViewIfNeeded(alert);
    });
    return () => cancelAnimationFrame(frame);
  }, [text]);

  if (!text) return null;

  return (
    <div ref={ref} className={className}>
      <Alert variant="destructive">
        <AlertDescription>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </AlertDescription>
      </Alert>
    </div>
  );
}
