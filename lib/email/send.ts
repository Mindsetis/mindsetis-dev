import 'server-only';

import { render } from '@react-email/components';

import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  type EmailLocale,
  type EmailTemplateKey,
  type EmailTemplatePropsMap,
  emailTemplatePropsSchema,
  enqueueEmailEnvelopeSchema,
} from '@/lib/validation/email';

import { emailTemplateRegistry } from './registry';
import type { EmailMessageInsert } from './types';

export interface EnqueueEmailInput<K extends EmailTemplateKey = EmailTemplateKey> {
  to: string;
  toName?: string;
  templateKey: K;
  /** Defaults to `'en'` — matches `email_messages.locale`'s DB default. */
  locale?: EmailLocale;
  props: EmailTemplatePropsMap[K];
  /** Optional idempotency key — see `enqueueEmailEnvelopeSchema` / the migration comment. */
  dedupKey?: string;
}

export interface EnqueueEmailResult {
  /** `email_messages.id`. `undefined` when this call was a no-op dedup hit. */
  id: string | undefined;
  /** `true` when a row with the same `dedupKey` already existed — the caller can treat this as success. */
  deduped: boolean;
}

/** Postgres unique_violation SQLSTATE — raised by the partial unique index on `dedup_key`. */
const UNIQUE_VIOLATION = '23505';

/**
 * Render a template to subject/html/text and INSERT it into the `email_messages` queue.
 *
 * This is the ONLY supported way to send a Mindsetis-originated transactional email — it
 * never calls Resend directly. The `process-email-queue` Edge Function (pg_cron-driven,
 * service role) drains `status = 'pending'` rows and does the actual delivery, so this
 * function only needs the database to succeed; actual delivery depends on that Edge
 * Function being deployed and `RESEND_API_KEY` / `RESEND_FROM_EMAIL` being configured as
 * Edge Function secrets (see `.env.example` — NOT Next.js env vars for those two).
 *
 * `dedupKey` collisions (the partial unique index on `email_messages.dedup_key`) are
 * treated as an idempotent no-op rather than an error — safe to call again with the same
 * key (e.g. a retried Server Action) without risking a duplicate send.
 */
export async function enqueueEmail<K extends EmailTemplateKey>(
  input: EnqueueEmailInput<K>,
): Promise<EnqueueEmailResult> {
  const envelope = enqueueEmailEnvelopeSchema.parse({
    to: input.to,
    toName: input.toName,
    locale: input.locale ?? 'en',
    dedupKey: input.dedupKey,
  });

  const propsSchema = emailTemplatePropsSchema[input.templateKey];
  const props = propsSchema.parse(input.props) as EmailTemplatePropsMap[K];

  const templateDef = emailTemplateRegistry[input.templateKey];
  const subject = templateDef.subject(props, envelope.locale);
  const element = templateDef.render(props, envelope.locale);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  const payload: EmailMessageInsert = {
    to_email: envelope.to,
    to_name: envelope.toName ?? null,
    template_key: input.templateKey,
    locale: envelope.locale,
    subject,
    html_body: html,
    text_body: text,
    dedup_key: envelope.dedupKey ?? null,
  };

  const service = createServiceClient();
  const { data, error } = await service
    .from('email_messages')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      console.log('[email] enqueue: dedup hit, already queued', {
        templateKey: input.templateKey,
        dedupKey: envelope.dedupKey,
      });
      return { id: undefined, deduped: true };
    }
    throw error;
  }

  const id = (data as { id: string }).id;
  console.log('[email] enqueued', { id, templateKey: input.templateKey, to: envelope.to });
  return { id, deduped: false };
}

/**
 * Pure render (no DB write) — subject/html/text for a template + props, for
 * previews/tests/scratch scripts. Never call this expecting an email to actually be
 * sent; use {@link enqueueEmail} for that.
 */
export async function previewEmail<K extends EmailTemplateKey>(
  templateKey: K,
  props: EmailTemplatePropsMap[K],
  locale: EmailLocale = 'en',
): Promise<{ subject: string; html: string; text: string }> {
  const propsSchema = emailTemplatePropsSchema[templateKey];
  const parsedProps = propsSchema.parse(props) as EmailTemplatePropsMap[K];

  const templateDef = emailTemplateRegistry[templateKey];
  const element = templateDef.render(parsedProps, locale);
  const subject = templateDef.subject(parsedProps, locale);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  return { subject, html, text };
}
