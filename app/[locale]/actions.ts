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
