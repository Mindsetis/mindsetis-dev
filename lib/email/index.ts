import 'server-only';

/**
 * Public entrypoint for the transactional email layer (stage 0.9).
 *
 * Default path: `enqueueEmail(...)` renders a template (registry below) and inserts a
 * row into the `email_messages` queue via the service-role client; the
 * `process-email-queue` Edge Function drains it and calls Resend. See `send.ts` for the
 * full flow / idempotency notes.
 */
export type { EmailTemplateDefinition } from './registry';
export { emailTemplateRegistry } from './registry';
export type { EnqueueEmailInput, EnqueueEmailResult } from './send';
export { enqueueEmail, previewEmail } from './send';
export type {
  EmailLocale,
  EmailTemplateKey,
  EmailTemplatePropsMap,
  GenericEmailProps,
  PasswordResetEmailProps,
  VerificationEmailProps,
} from '@/lib/validation/email';
