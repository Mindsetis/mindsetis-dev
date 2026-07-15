'use server';

/**
 * Non-auth, locale-scoped Server Actions (marketing/landing surfaces).
 *
 * Same `createAction` convention as `app/[locale]/(auth)/actions.ts` — Zod-validated,
 * typed `ActionResult`, rate-limited.
 */
import { getLocale } from 'next-intl/server';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { leadCaptureSchema } from '@/lib/validation/leads';
import { emailCaptureSchema } from '@/lib/validation/marketing';

/** Postgres unique-violation error code. */
const UNIQUE_VIOLATION = '23505';

/**
 * Subscribe an email to the newsletter (footer form). Inserts into `newsletter_emails`
 * with the anonymous server client — RLS grants INSERT to anon/authenticated, reads stay
 * staff-only, so this must never use the service-role client.
 *
 * A duplicate email (unique-violation) is treated as success — the visitor is already
 * subscribed, which isn't an error worth surfacing.
 */
export const subscribeNewsletter = createAction(
  emailCaptureSchema,
  async ({ email }) => {
    const locale = await getLocale();
    const supabase = await createClient();

    const { error } = await supabase
      .from('newsletter_emails')
      .insert({ email: email.toLowerCase(), locale });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { alreadySubscribed: true };
      }
      console.error('[marketing.subscribeNewsletter] insert failed:', {
        code: error.code,
        message: error.message,
      });
      throw new ActionError(
        'internal_error',
        'Could not subscribe you right now. Please try again.',
      );
    }

    return { alreadySubscribed: false };
  },
  { rateLimit: { key: 'marketing:newsletter', limit: 5, window: '10 m' } },
);

/**
 * Capture an "I'm on the way" lead (spec §5.2) — the escape hatch for visitors who are not
 * ready to complete the full registration wizard. Inserts into `leads` with the anonymous
 * server client — RLS grants public INSERT (no auth required), reads stay staff-only, so
 * this must never use the service-role client. No Supabase Auth account is created; this is
 * entirely separate from `signUp`/`(auth)/actions.ts`.
 *
 * `source` is hardcoded here, not accepted from the caller (see `leadCaptureSchema`'s doc
 * comment) — this is the only call site today (the Welcome-screen hero), so it's a fixed
 * literal; a second call site would get its own fixed literal, never a client-supplied value.
 */
export const captureLead = createAction(
  leadCaptureSchema,
  async ({ name, email }) => {
    const supabase = await createClient();

    const { error } = await supabase.from('leads').insert({
      name,
      email: email.toLowerCase(),
      source: 'landing-hero',
    });

    if (error) {
      console.error('[marketing.captureLead] insert failed:', {
        code: error.code,
        message: error.message,
      });
      throw new ActionError(
        'internal_error',
        'Could not save your details right now. Please try again.',
      );
    }

    return null;
  },
  { rateLimit: { key: 'marketing:lead-capture', limit: 5, window: '10 m' } },
);
