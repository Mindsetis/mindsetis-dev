/**
 * Server Action wrapper — the standard way to define an action in Mindsetis.
 *
 * Responsibilities (so individual actions stay a pure handler):
 *   1. Accept either a plain object or `FormData` (progressive-enhancement forms).
 *   2. Validate input with a Zod schema (Zod-at-every-boundary rule).
 *   3. Optionally enforce a rate limit before the handler runs.
 *   4. Convert thrown `ActionError`s into typed `ActionFailure`s, and re-throw Next.js
 *      control-flow errors (`redirect()` / `notFound()`).
 *   5. Collapse anything unexpected into a generic `internal_error` (logged, never leaked).
 *
 * See `docs/API_CONVENTIONS.md` for usage.
 */
import 'server-only';

import type { z } from 'zod';

import { enforceRateLimit, type RateLimitRule } from '@/lib/rate-limit';

import { ActionError, isFrameworkError } from './errors';
import { type ActionResult, err, type FieldErrors, ok } from './result';

/** Turn a `FormData` into a plain object (multi-value fields become arrays). */
function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key in obj) {
      const existing = obj[key];
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

/** Flatten a ZodError into the `fieldErrors` shape used by `ActionFailure`. */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export interface ActionOptions {
  /**
   * Optional rate limit, enforced before the handler runs. Provide a stable `key`
   * (e.g. `'auth:sign-in'`) — the caller identity (IP) is appended automatically.
   * No-ops when Upstash isn't configured.
   */
  rateLimit?: RateLimitRule & { key: string };
  /** Overrides the generic message returned on `validation_error`. */
  invalidMessage?: string;
}

/**
 * Define a validated Server Action.
 *
 * @example
 * export const signIn = createAction(signInSchema, async (input) => {
 *   // input is fully typed & validated
 * });
 */
export function createAction<TSchema extends z.ZodType, TOutput>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TOutput>,
  options: ActionOptions = {},
): (input: unknown) => Promise<ActionResult<TOutput>> {
  return async (input: unknown): Promise<ActionResult<TOutput>> => {
    try {
      if (options.rateLimit) {
        const { key, ...rule } = options.rateLimit;
        await enforceRateLimit(key, rule);
      }

      const raw = input instanceof FormData ? formDataToObject(input) : input;
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return err(
          'validation_error',
          options.invalidMessage ?? 'Please check the form and try again.',
          toFieldErrors(parsed.error),
        );
      }

      const data = await handler(parsed.data as z.infer<TSchema>);
      return ok(data as TOutput);
    } catch (error) {
      // redirect()/notFound() must bubble up to Next.js.
      if (isFrameworkError(error)) throw error;
      if (error instanceof ActionError) {
        return err(error.code, error.message, error.fieldErrors);
      }
      console.error('[action] unexpected error:', error);
      return err('internal_error', 'Something went wrong. Please try again.');
    }
  };
}
