/**
 * Shared Zod primitives reused across feature schemas.
 *
 * Keep boundary-level validation building blocks here so forms, Server Actions, Route
 * Handlers, and webhook payloads all agree on the same rules (Zod-at-every-boundary).
 */
import { z } from 'zod';

/** Normalized email: trimmed + lowercased. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.')
  .toLowerCase();

/**
 * Password policy for sign-up / reset. Min 8 (stronger than Supabase's default 6),
 * max 72 (bcrypt truncates beyond this). At least one letter and one number.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

/** Password field for sign-in — presence only (never reveal the policy to attackers). */
export const passwordSignInSchema = z.string().min(1, 'Password is required.');

/** Public handle: 3–30 chars, lowercase alphanumerics + underscores. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(/^[a-z0-9_]+$/, 'Use only letters, numbers, and underscores.');

/** Supported UI/content locales — mirrors `i18n/routing.ts`. */
export const localeSchema = z.enum(['en', 'es']);

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
