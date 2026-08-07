'use server';

/**
 * Non-auth, locale-scoped Server Actions (marketing/landing surfaces).
 *
 * Same `createAction` convention as `app/[locale]/(app)/(auth)/actions.ts` — Zod-validated,
 * typed `ActionResult`, rate-limited.
 *
 * This module deliberately stays at the root `[locale]` level (not inside `(app)/`): it's
 * used both by chrome shared with the `(app)` route group (`NewsletterForm`, via `Footer`)
 * and — for `submitHomepageWaitlist` — by the homepage itself (`app/[locale]/page.tsx`),
 * which sits OUTSIDE `(app)`.
 */
import { getLocale } from 'next-intl/server';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import { homepageWaitlistSchema, MIN_SUBMIT_ELAPSED_MS } from '@/lib/validation/homepage-waitlist';
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
 * Submit the coming-soon homepage placeholder's "Apply to Join" waitlist form (ROADMAP
 * stage 1.11, Figma "Заглушка"). Inserts into `homepage_waitlist` via the SERVICE-ROLE
 * client — that table has NO client-facing INSERT policy at all (see
 * `supabase/migrations/20260805181705_homepage_waitlist.sql`), so this must never use the
 * anon client, unlike `subscribeNewsletter` above.
 *
 * A plain INSERT (never an upsert): a duplicate email trips the table's case-insensitive
 * unique index and Postgres raises `23505`, which is surfaced as a `conflict` error the
 * client form shows inline on the email field — this form has a hard "you already applied"
 * product requirement, not a silent re-submission.
 *
 * ANTI-AUTOMATION. This is a fully anonymous, unauthenticated write path, so it carries two
 * zero-infra bot filters ON TOP OF the declared IP rate limit:
 *   1. Honeypot (`company`) — a field only a form-filling bot would populate.
 *   2. Minimum elapsed time (`formLoadedAt` + `MIN_SUBMIT_ELAPSED_MS`) — a submit landing
 *      within ~2s of the form mounting wasn't typed by a human.
 * Either trip returns a FAKE SUCCESS: no row is written, but the caller gets the same `ok`
 * result a real submission gets, so a bot can't diff responses to discover which signal
 * caught it (and a false positive on a real visitor at least doesn't show a broken form).
 *
 * NOTE: the `rateLimit` option below is declared but only ENFORCES once Upstash is
 * provisioned — `lib/rate-limit.ts` no-ops when `UPSTASH_REDIS_REST_*` are unset (deferred
 * infra, ROADMAP 0.2). Until then these two filters are the only throttle on this endpoint,
 * and they stop naive bots, not a determined attacker replaying the Server Action directly.
 */
export const submitHomepageWaitlist = createAction(
  homepageWaitlistSchema,
  async ({ firstName, email, socialLink, company, formLoadedAt }) => {
    // Honeypot filled, or submitted faster than a human could type: drop it on the floor and
    // report success. Logged (without the payload) so a spike is visible in server logs.
    const trippedHoneypot = Boolean(company && company.trim().length > 0);
    const trippedTiming =
      formLoadedAt !== undefined && Date.now() - formLoadedAt < MIN_SUBMIT_ELAPSED_MS;
    if (trippedHoneypot || trippedTiming) {
      console.warn('[marketing.submitHomepageWaitlist] bot filter tripped:', {
        honeypot: trippedHoneypot,
        timing: trippedTiming,
      });
      return null;
    }

    const supabase = createServiceClient();

    const { error } = await supabase.from('homepage_waitlist').insert({
      first_name: firstName,
      email,
      // Optional field: normalize "not supplied" to SQL NULL, never an empty string
      // (`20260806120000_homepage_waitlist_optional_social_link.sql`).
      social_link: socialLink ?? null,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new ActionError('conflict', 'This email has already been submitted.', {
          email: ['This email has already been submitted.'],
        });
      }
      console.error('[marketing.submitHomepageWaitlist] insert failed:', {
        code: error.code,
        message: error.message,
      });
      throw new ActionError(
        'internal_error',
        'Could not submit your details right now. Please try again.',
      );
    }

    return null;
  },
  { rateLimit: { key: 'marketing:homepage-waitlist', limit: 5, window: '10 m' } },
);
