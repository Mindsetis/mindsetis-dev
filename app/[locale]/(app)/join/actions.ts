'use server';

/**
 * Server Action for the first email screen of the funnel (`/join` → `HeroEmailCta`), Release 2 П1.
 *
 * Asks one question before the visitor is sent on to `/sign-up`: "does this address already have
 * a confirmed account?". If it does, the screen shows "already registered — Log in →" instead of
 * walking them through a form they cannot finish. An UNCONFIRMED address answers `false`, on
 * purpose: signing up again just re-sends the confirmation email, which is exactly what that
 * visitor needs.
 *
 * THIS IS AN EXISTENCE ORACLE, so it is throttled the way the ambassador form is: a per-IP bucket
 * (`createAction`'s `rateLimit`, below) AND a per-address bucket (the first line of the handler).
 * Sign-up already tells a visitor "an account with this email exists", so the answer itself is not
 * new information — the throttles are what stop it being a cheap bulk-lookup tool. Those
 * throttles only exist when Upstash is configured (`lib/rate-limit.ts` allows everything
 * otherwise), so a production deployment without it skips the lookup altogether: the visitor
 * goes on to `/sign-up` and meets the same message there (security audit, 30.10.2026). Local
 * development still runs it, unthrottled.
 *
 * FAILS OPEN. A tripped limit or a failed lookup is not a reason to stop someone from signing up:
 * the caller treats any non-`ok` result as "unknown" and carries on to `/sign-up`, where `signUp`
 * has its own duplicate check and shows the same message. The one thing the failure must never do
 * is leak WHY it failed, so lookup errors are only logged.
 */
import { createAction } from '@/lib/api';
import { emailHasConfirmedAccount } from '@/lib/auth/account-lookup';
import { assertWithinRateLimit, emailBucket, isRateLimitEnforced } from '@/lib/rate-limit';
import { joinEmailCheckSchema } from '@/lib/validation/auth';

export const checkJoinEmail = createAction(
  joinEmailCheckSchema,
  async ({ email }) => {
    if (!isRateLimitEnforced() && process.env.NODE_ENV === 'production') {
      return { hasAccount: false };
    }

    await assertWithinRateLimit(emailBucket('join:check-email:email', email), {
      limit: 5,
      window: '1 h',
    });

    try {
      return { hasAccount: await emailHasConfirmedAccount(email) };
    } catch (error) {
      console.error('[join.checkJoinEmail] account lookup failed:', {
        message: error instanceof Error ? error.message : String(error),
      });
      return { hasAccount: false };
    }
  },
  { rateLimit: { key: 'join:check-email', limit: 5, window: '10 m' } },
);
