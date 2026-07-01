/**
 * Typed error for server boundaries.
 *
 * Guards and action handlers `throw new ActionError(code, message)` to short-circuit;
 * the {@link file://./action.ts action wrapper} catches it and converts it to a matching
 * `ActionFailure`. Never throw raw `Error` for expected failures — unexpected throws are
 * logged and collapsed to a generic `internal_error` so nothing sensitive leaks.
 */
import type { ErrorCode, FieldErrors } from './result';

export class ActionError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ActionError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * True for Next.js framework control-flow errors (`redirect()`, `notFound()`), which are
 * thrown intentionally and MUST propagate rather than be swallowed as failures.
 */
export function isFrameworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')
  );
}
