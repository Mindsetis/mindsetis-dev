'use server';

/**
 * Server Action for the "Resend email" button on `/verify-email` (registration wizard step
 * 4/4, see `page.tsx`). Distinct from `build-profile/actions.ts`'s silent, best-effort send
 * fired automatically when step 3 completes — this one is a user-triggered retry, so a
 * rate-limit hit (or any other failure) is surfaced back to the caller instead of swallowed
 * (the caller is actively watching this button, unlike step 3's fire-and-forget send).
 *
 * The account always has a live session by the time this page is reachable (signup
 * auto-confirms — see `(auth)/actions.ts#signUp`'s doc comment), so this requires a session via
 * `requireUser()` — no client-supplied-email fallback. An earlier version accepted an `email`
 * input for the "expired/cleared session" edge case, but since `sendWelcomeEmail` (unlike the
 * Supabase `auth.resend()` it replaced) does no existence check of its own, that fallback was
 * an unauthenticated arbitrary-recipient mail-send primitive — closed by requiring a session
 * instead of trying to re-add an existence check.
 */
import { createHash } from 'node:crypto';

import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { sendWelcomeEmail } from '@/lib/auth/send-welcome-email';
import { assertWithinRateLimit } from '@/lib/rate-limit';

export const resendWelcomeEmail = createAction(
  z.object({}),
  async () => {
    const user = await requireUser();
    const email = user.email;
    if (!email) {
      throw new ActionError(
        'validation_error',
        'We could not find an email address to resend to.',
        { email: ['Missing email address.'] },
      );
    }
    const userName =
      typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined;

    // Manually triggered by an impatient user actively waiting for the email — unlike step
    // 3's silent best-effort send, a rate-limit hit here is NOT caught: it propagates
    // through `createAction` into an `ActionFailure` the client surfaces (toast/inline text).
    await assertWithinRateLimit(
      `verify-email:resend-welcome:${createHash('sha256').update(email).digest('hex')}`,
      { limit: 4, window: '1 h' },
    );

    const { error } = await sendWelcomeEmail(email, userName);
    if (error) {
      console.error('[verify-email] resend welcome email failed:', { message: error.message });
      throw new ActionError('internal_error', 'Could not resend the email. Please try again.');
    }

    return { email };
  },
  // IP-keyed bucket on top of the per-email one above, same defense-in-depth pattern as
  // `requestPasswordReset` (`(auth)/actions.ts`) — bounds one IP cycling through many
  // authenticated accounts to trigger sends, on top of the per-email cap.
  { rateLimit: { key: 'verify-email:resend-welcome', limit: 5, window: '15 m' } },
);
