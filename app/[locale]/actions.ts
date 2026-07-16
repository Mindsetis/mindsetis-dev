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
import { createClient as createServiceClient } from '@/lib/supabase/service';
import { signupIntentSchema } from '@/lib/validation/leads';
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
 * Record a homepage "signup intent" lead (spec §5.2, reworked stage 1.7) — fired when a
 * visitor submits their email in the hero's `HeroEmailCta` field, before they ever reach
 * `/sign-up`. No auth check here — this is an intentionally open, unauthenticated capture
 * point (same trust boundary as before); only the actual database write moved.
 *
 * Upserts into `leads` with the SERVICE-ROLE client (`lib/supabase/service.ts`), not the
 * anon client. `leads_select_staff` makes `leads` SELECT staff-only, and Postgres's
 * `ON CONFLICT` handling (`DO NOTHING` or `DO UPDATE`) always requires SELECT-visibility
 * into any row that might conflict, in order to evaluate the conflict — the anon role can
 * never satisfy that, regardless of upsert mode, so an anon-client upsert on this table
 * always fails with `42501` (verified live against the hosted project: even a brand-new,
 * non-conflicting email was rejected). The service-role client bypasses RLS entirely,
 * which removes the visibility problem regardless of upsert mode chosen below.
 *
 * Upsert mode: `DO UPDATE` (a true merge) touching no column other than the conflict key,
 * explicitly NOT passing `registered` in the update payload. `registered` must never be part
 * of this action's write at all — it only flips true->false by omission risk if we did
 * something like `.upsert({ email, registered: false })` with a plain merge, which would
 * silently reset an already-`registered = true` row back to `false` on a later duplicate
 * homepage submission (e.g. a visitor resubmits the hero field after already completing
 * sign-up). Omitting `registered` from the payload entirely means the row's `registered`
 * value is left exactly as it was — insert still defaults it to `false` for a brand-new row,
 * and an existing `true` is never clobbered. `updated_at` isn't set here either: the table's
 * `set_leads_updated_at` trigger already stamps it on every insert/update, so setting it here
 * would just be overwritten by the trigger anyway. This is preferred over
 * `ignoreDuplicates: true` (`DO NOTHING`) because it actually satisfies "resubmitting just
 * upserts the existing row" (ROADMAP 1.7), now that service-role has no RLS restriction
 * blocking a real merge.
 */
export const recordSignupIntent = createAction(
  signupIntentSchema,
  async ({ email }) => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('leads')
      .upsert({ email: email.toLowerCase() }, { onConflict: 'email' });

    if (error) {
      console.error('[marketing.recordSignupIntent] upsert failed:', {
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
  { rateLimit: { key: 'marketing:signup-intent', limit: 5, window: '10 m' } },
);
