/**
 * Shared Zod primitives reused across feature schemas.
 *
 * Keep boundary-level validation building blocks here so forms, Server Actions, Route
 * Handlers, and webhook payloads all agree on the same rules (Zod-at-every-boundary).
 */
import { z } from 'zod';

import { vmsg } from './messages';

/** Normalized email: trimmed + lowercased. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, vmsg('emailRequired'))
  .max(254, vmsg('emailTooLong'))
  .email(vmsg('emailInvalid'))
  .toLowerCase();

/**
 * Password policy for sign-up / reset. Min 8 (stronger than Supabase's default 6),
 * max 72 (bcrypt truncates beyond this). At least one uppercase letter and one number
 * (matches the sign-up UI copy, "At least 1 uppercase letter").
 */
export const passwordSchema = z
  .string()
  .min(8, vmsg('passwordMin', { min: 8 }))
  .max(72, vmsg('passwordMax', { max: 72 }))
  .regex(/[A-Z]/, vmsg('passwordUppercase'))
  .regex(/[0-9]/, vmsg('passwordNumber'));

/** Password field for sign-in — presence only (never reveal the policy to attackers). */
export const passwordSignInSchema = z.string().min(1, vmsg('passwordRequired'));

/** Public handle: 3–30 chars, lowercase alphanumerics + underscores. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, vmsg('usernameMin', { min: 3 }))
  .max(30, vmsg('usernameMax', { max: 30 }))
  .regex(/^[a-z0-9_]+$/, vmsg('usernameChars'));

/** Supported UI/content locales — mirrors `i18n/routing.ts`. */
export const localeSchema = z.enum(['en', 'es']);

/**
 * Anything OUTSIDE the writing systems the brand font can render (2026-08-14 product rule).
 *
 * An ALLOW-list of Unicode scripts, not a block-list of Cyrillic: the display face used across
 * the public profile has no Cyrillic/Greek/CJK coverage, so those glyphs fall back to a second
 * font mid-word and the layout breaks. Blocking only Cyrillic would leave every other unsupported
 * script to hit the same wall.
 *
 * The three scripts allowed:
 *   - `Latin`     — a–z plus every accented form, so Spanish (`messages/es.json` is a live target
 *                   locale), French, Portuguese, Polish… all keep working. This is NOT ASCII-only.
 *   - `Common`    — digits, spaces, newlines, punctuation, currency symbols, math, emoji.
 *   - `Inherited` — standalone combining marks (e.g. U+0301 in a decomposed "é").
 */
const NON_LATIN_PATTERN = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

/** Kept short — it renders on the field's own single-line error row. */
export const LATIN_ONLY_MESSAGE = vmsg('latinOnly');

/**
 * True when `value` contains nothing the brand font can't draw. Shared by the Zod field rules
 * (the enforcing boundary — it also guards the Server Actions) and by `FormMessage`, which runs
 * the same check against the live field value to flag the problem as it is typed rather than at
 * submit time. One predicate, so the live hint and the rule that actually blocks can't disagree.
 */
export function isLatinOnly(value: string): boolean {
  return !NON_LATIN_PATTERN.test(value);
}

/**
 * True for a safe same-origin relative redirect path (`/foo`), rejecting absolute URLs and
 * protocol-relative (`//host`) / backslash tricks that could escape the app (open redirect).
 * Single source of truth reused by the login page, the auth callback, and `signInSchema`.
 */
export function isSafeRedirectPath(value: string | undefined | null): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  );
}

/** Normalize a candidate redirect to a safe relative path, falling back to `fallback`. */
export function safeRedirectPath(value: string | undefined | null, fallback = '/'): string {
  return isSafeRedirectPath(value) ? value : fallback;
}
