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

import { localePath } from '@/i18n/routing';
import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { siteUrl } from '@/lib/auth/site-url';
import { enqueueEmail } from '@/lib/email';
import { assertWithinRateLimit, emailBucket } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  ACCOUNT_EXISTS_ERROR,
  ambassadorApplicationSchema,
  ambassadorGuestContactSchema,
  MIN_AMBASSADOR_SUBMIT_ELAPSED_MS,
} from '@/lib/validation/ambassador-application';
import type { EmailLocale } from '@/lib/validation/email';
import { homepageWaitlistSchema, MIN_SUBMIT_ELAPSED_MS } from '@/lib/validation/homepage-waitlist';
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

/**
 * Record a homepage "signup intent" lead (spec §5.2, reworked stage 1.7) — the email typed
 * into the landing hero's `HeroEmailCta` on the visitor's way into `/sign-up`. Upserts into
 * `leads`; `signUp` later flips that same row's `registered` flag once the account is
 * actually created.
 *
 * Restored alongside the full landing page, which `COMING_SOON_MODE=false` brings back (see
 * `lib/config/coming-soon.ts`) — so this action is reachable ONLY in that mode. It stayed
 * deleted between ROADMAP stage 1.11 and the flag; the `leads` table it writes to was never
 * dropped, so nothing schema-side had to be recreated.
 *
 * Service-role client, like `submitHomepageWaitlist`: `leads` grants the anon role no INSERT.
 * Distinct from `subscribeNewsletter`, which writes `newsletter_emails` as anon.
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

/**
 * Submit the homepage "Apply for Ambassadorship" popup (`AmbassadorApplicationDialog`) into
 * `ambassador_applications`, then email the applicant a receipt.
 *
 * WHO IS APPLYING is decided here, never by the client:
 * - signed in → name, email and `user_id` come from the session + own `profiles` row, and
 *   `applicant_type` is that row's `account_type` (`member` / `mindsetter`). Any `contact` the
 *   client sent is ignored, so an application can't be filed under someone else's account.
 * - no session → a guest; `contact` must pass `ambassadorGuestContactSchema`. The database links
 *   `user_id` by confirmed email — at insert if that address already has a confirmed account,
 *   otherwise once it registers and confirms (the `ambassador_applications` migrations' triggers)
 *   — and the application reads as that Member/Mindsetter from then on.
 *
 * Repeat applications from one email are allowed on purpose (product decision) — no unique
 * index, the back office groups them by email instead. A per-address daily ceiling still stops
 * bulk submits (see below).
 *
 * Writes go through the SERVICE-ROLE client: the table has no client INSERT policy at all (same
 * write path as `homepage_waitlist`). The GUEST path is anonymous, so it carries the waitlist's
 * bot filters on top of the IP rate limit — honeypot (`website`) and minimum elapsed time — and
 * a trip returns a fake success without writing anything. They are NOT applied to a signed-in
 * applicant: that person is already authenticated and types nothing on the last step, so a fast
 * click-through could finish inside the 2s window and be silently dropped (code-review finding).
 *
 * The receipt email is best-effort: the application is already saved, so a failed enqueue is
 * logged and swallowed rather than turned into an error the applicant would retry (and so
 * duplicate) the application over.
 */
export const submitAmbassadorApplication = createAction(
  ambassadorApplicationSchema,
  async (input) => {
    const locale = (await getLocale()) as EmailLocale;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      const trippedHoneypot = Boolean(input.website && input.website.trim().length > 0);
      const trippedTiming =
        input.formLoadedAt !== undefined &&
        Date.now() - input.formLoadedAt < MIN_AMBASSADOR_SUBMIT_ELAPSED_MS;
      if (trippedHoneypot || trippedTiming) {
        console.warn('[marketing.submitAmbassadorApplication] bot filter tripped:', {
          honeypot: trippedHoneypot,
          timing: trippedTiming,
        });
        return null;
      }
    }

    let applicant: {
      userId: string | null;
      type: 'guest' | 'member' | 'mindsetter';
      firstName: string;
      lastName: string;
      email: string;
    };

    if (user?.email) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type, full_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError || !profile) {
        console.error('[marketing.submitAmbassadorApplication] profile lookup failed:', {
          code: profileError?.code,
          message: profileError?.message,
        });
        throw new ActionError(
          'internal_error',
          'Could not submit your application right now. Please try again.',
        );
      }
      applicant = {
        userId: user.id,
        type: profile.account_type,
        // A signed-in account always has a first name (sign-up requires it); the last name can
        // predate that column, and the table requires one, so fall back to a dash.
        firstName: profile.full_name?.trim() || '—',
        lastName: profile.last_name?.trim() || '—',
        email: user.email.toLowerCase(),
      };
    } else {
      const contact = ambassadorGuestContactSchema.safeParse(input.contact ?? {});
      if (!contact.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of contact.error.issues) {
          (fieldErrors[`contact.${issue.path.join('.')}`] ??= []).push(issue.message);
        }
        throw new ActionError(
          'validation_error',
          'Please check the form and try again.',
          fieldErrors,
        );
      }
      applicant = { userId: null, type: 'guest', ...contact.data };
    }

    // Per-address ceiling across IPs, on top of the per-IP limit below: a guest can type ANY
    // address and each submit queues a receipt to it, so the IP limit alone doesn't stop someone
    // rotating IPs from mail-bombing one inbox (security-auditor finding). Same pattern as
    // sign-up's per-email limit. Repeat applications stay possible, just not in bulk.
    await assertWithinRateLimit(
      emailBucket('marketing:ambassador-application:email', applicant.email),
      { limit: 3, window: '1 d' },
    );

    const service = createServiceClient();

    // A guest may not apply under an address that already has a confirmed account — they're
    // asked to log in instead (client decision, 2026-09-29). Otherwise anyone could file an
    // application with made-up details that then links to that real person's profile
    // (security-auditor finding). Runs after the per-address limit above, so this can't be used
    // to probe many addresses; sign-up already answers "an account with this email exists", so
    // it reveals nothing new. The RPC is executable by the service role only.
    if (applicant.type === 'guest') {
      const { data: hasAccount, error: lookupError } = await service.rpc(
        'email_has_confirmed_account',
        { p_email: applicant.email },
      );
      if (lookupError) {
        console.error('[marketing.submitAmbassadorApplication] account lookup failed:', {
          code: lookupError.code,
          message: lookupError.message,
        });
        throw new ActionError(
          'internal_error',
          'Could not submit your application right now. Please try again.',
        );
      }
      if (hasAccount) {
        throw new ActionError('conflict', 'This email already has an account. Log in to apply.', {
          'contact.email': [ACCOUNT_EXISTS_ERROR],
        });
      }
    }

    const { error } = await service.from('ambassador_applications').insert({
      user_id: applicant.userId,
      applicant_type: applicant.type,
      first_name: applicant.firstName,
      last_name: applicant.lastName,
      email: applicant.email,
      // Skipped questions are stored as NULL, never as an empty string.
      event_experience: input.eventExperience || null,
      communities: input.communities || null,
      communities_feedback: input.communitiesFeedback || null,
      locale,
    });

    if (error) {
      console.error('[marketing.submitAmbassadorApplication] insert failed:', {
        code: error.code,
        message: error.message,
      });
      throw new ActionError(
        'internal_error',
        'Could not submit your application right now. Please try again.',
      );
    }

    try {
      const isGuest = applicant.type === 'guest';
      const displayName = applicant.firstName === '—' ? undefined : applicant.firstName;
      await enqueueEmail({
        to: applicant.email,
        toName: displayName,
        templateKey: 'ambassador_application',
        locale,
        props: {
          userName: displayName,
          isGuest,
          ...(isGuest ? { signUpUrl: siteUrl(localePath(locale, '/sign-up')) } : {}),
        },
      });
    } catch (emailError) {
      console.error('[marketing.submitAmbassadorApplication] receipt email not enqueued:', {
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return null;
  },
  { rateLimit: { key: 'marketing:ambassador-application', limit: 5, window: '10 m' } },
);
