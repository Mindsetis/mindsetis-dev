import type { ErrorCode } from '@/lib/api/result';

/**
 * Turns a failed auth Server Action into text in the visitor's language.
 *
 * `ActionError` messages are plain English sentences written on the server, where no locale is in
 * scope ("Too many attempts. Please try again in a moment." from `lib/rate-limit.ts`, "Could not
 * create your account…" from `signUp`). They are fine as log lines and as a last-resort fallback,
 * but they were being shown to Spanish visitors verbatim. The CODE is the stable contract — this
 * maps the codes every auth form can hit to `auth.errors.*` keys and only falls back to the
 * server's sentence for a code it has no copy for.
 *
 * `t` is the `useTranslations('auth')` function of the calling form.
 *
 * Deliberately not handled here: `unauthenticated` and `conflict`. Their meaning depends on the
 * form (wrong credentials on log-in, an expired session on the reset screen, "already registered"
 * on sign-up), so each form decides what they say.
 */
export function authErrorText(
  t: (key: string) => string,
  error: { code: ErrorCode; message: string },
): string {
  switch (error.code) {
    case 'rate_limited':
      return t('errors.rateLimited');
    case 'validation_error':
      return t('errors.formInvalid');
    case 'internal_error':
      return t('errors.generic');
    default:
      return error.message;
  }
}
