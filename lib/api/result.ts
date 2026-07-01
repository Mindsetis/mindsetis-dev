/**
 * Standard result shape for Server Actions & Route Handlers.
 *
 * Every server boundary (Server Action, Route Handler) returns an `ActionResult<T>`
 * so callers can branch on a single discriminant (`ok`) instead of guessing at thrown
 * errors. Framework control-flow (`redirect()`, `notFound()`) is the only thing that
 * still throws — the {@link file://../api/action.ts action wrapper} re-throws those.
 *
 * See `docs/API_CONVENTIONS.md` for the full pattern and examples.
 */

/** Machine-readable error codes. Keep in sync with `ActionError` in `./errors.ts`. */
export type ErrorCode =
  | 'validation_error' // input failed Zod parsing (see `fieldErrors`)
  | 'unauthenticated' // no signed-in user
  | 'forbidden' // signed in, but not allowed (role / verification / ownership)
  | 'not_found' // target row does not exist or is not visible
  | 'conflict' // uniqueness / state conflict (e.g. username taken)
  | 'rate_limited' // Upstash rate-limit tripped
  | 'internal_error'; // unexpected — details logged server-side, never leaked

/** Per-field validation messages, keyed by form field name. */
export type FieldErrors = Record<string, string[]>;

export interface ActionSuccess<T> {
  ok: true;
  data: T;
}

export interface ActionFailure {
  ok: false;
  error: {
    code: ErrorCode;
    /** User-facing, safe-to-display message. Never contains secrets or stack traces. */
    message: string;
    /** Present when `code === 'validation_error'`. */
    fieldErrors?: FieldErrors;
  };
}

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

/** Build a success result. */
export function ok<T>(data: T): ActionSuccess<T>;
export function ok(): ActionSuccess<void>;
export function ok<T>(data?: T): ActionSuccess<T> {
  return { ok: true, data: data as T };
}

/** Build a failure result. */
export function err(code: ErrorCode, message: string, fieldErrors?: FieldErrors): ActionFailure {
  return { ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } };
}

/** Type guard: narrow an `ActionResult` to its success branch. */
export function isOk<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.ok;
}
