/**
 * Zod schemas for the transactional email layer (`lib/email/`, stage 0.9).
 *
 * Two layers, both validated (Zod-at-every-boundary):
 *   1. `enqueueEmailEnvelopeSchema` — the caller-facing envelope (recipient, locale,
 *      dedup key) that's the same shape regardless of template.
 *   2. Per-template prop schemas (`verificationEmailPropsSchema`, ...), keyed by
 *      `template_key` in `emailTemplatePropsSchema` — so e.g. `actionUrl` is checked to
 *      actually be a URL before it's baked into rendered HTML that gets queued/sent.
 */
import { z } from 'zod';

import { emailSchema, localeSchema } from './common';

/** Supported email UI locales — reuses the shared `localeSchema` (mirrors `i18n/routing.ts`). */
export type EmailLocale = z.infer<typeof localeSchema>;

/**
 * A URL that must use the `http:`/`https:` protocol. Rejects `javascript:`, `data:`, and
 * other schemes that would be unsafe to embed as a link/button `href` in rendered email
 * HTML, even though they pass plain `z.string().url()`.
 */
export const httpUrlSchema = z
  .string()
  .trim()
  .url('actionUrl must be a valid URL.')
  .refine(
    (value) => {
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { message: 'actionUrl must be an http(s) URL.' },
  );

export const enqueueEmailEnvelopeSchema = z.object({
  to: emailSchema,
  toName: z.string().trim().min(1, 'Name is too short.').max(200, 'Name is too long.').optional(),
  locale: localeSchema.default('en'),
  /**
   * Optional idempotency key (e.g. `'session_reminder_24h:<session_id>'`). Mirrors
   * `email_messages.dedup_key` — a partial unique index only enforces uniqueness when
   * non-null, so most one-off emails can omit this entirely.
   */
  dedupKey: z
    .string()
    .trim()
    .min(1, 'dedupKey cannot be empty.')
    .max(200, 'dedupKey is too long.')
    .optional(),
});
export type EnqueueEmailEnvelope = z.infer<typeof enqueueEmailEnvelopeSchema>;

/** `verification` template props — email verification / activation link. */
export const verificationEmailPropsSchema = z.object({
  actionUrl: httpUrlSchema,
  userName: z.string().trim().min(1).max(200).optional(),
});
export type VerificationEmailProps = z.infer<typeof verificationEmailPropsSchema>;

/** `password_reset` template props — password reset link. */
export const passwordResetEmailPropsSchema = z.object({
  actionUrl: httpUrlSchema,
  userName: z.string().trim().min(1).max(200).optional(),
});
export type PasswordResetEmailProps = z.infer<typeof passwordResetEmailPropsSchema>;

/**
 * `generic` template props — free-form heading/body (+ optional CTA) for one-off or
 * future admin-composed sends. Unlike `verification`/`password_reset`, the copy itself
 * is caller-supplied rather than pulled from the `email` i18n namespace.
 */
export const genericEmailPropsSchema = z.object({
  heading: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  actionUrl: httpUrlSchema.optional(),
  actionLabel: z.string().trim().min(1).max(100).optional(),
});
export type GenericEmailProps = z.infer<typeof genericEmailPropsSchema>;

/**
 * `template_key` -> props-schema map. The single source of truth for which template
 * keys exist; `lib/email/registry.tsx` maps the same keys to renderers, and
 * `email_messages.template_key` (free text in the DB) is expected to only ever contain
 * one of these keys from our own code.
 */
export const emailTemplatePropsSchema = {
  verification: verificationEmailPropsSchema,
  password_reset: passwordResetEmailPropsSchema,
  generic: genericEmailPropsSchema,
} as const;

export type EmailTemplateKey = keyof typeof emailTemplatePropsSchema;

export type EmailTemplatePropsMap = {
  [K in EmailTemplateKey]: z.infer<(typeof emailTemplatePropsSchema)[K]>;
};
