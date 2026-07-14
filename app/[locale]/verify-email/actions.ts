'use server';

/**
 * Server Action for the "Resend email" button on `/verify-email` (registration wizard step
 * 4/4, see `page.tsx`). Distinct from `build-profile/actions.ts`'s silent, best-effort resend
 * fired automatically when step 3 completes — this one is a user-triggered retry, so a
 * rate-limit hit (or any other failure) is surfaced back to the caller instead of swallowed
 * (the caller is actively watching this button, unlike step 3's fire-and-forget send).
 *
 * Works in both states this page can be reached in (see `page.tsx`'s doc comment):
 *   (a) the caller has a live session (completed steps 1-3 normally) — the email is resolved
 *       from `getCurrentUser()`; the `email` input is ignored when a session exists.
 *   (b) no session yet — the interim fallback while the hosted "Confirm email" toggle isn't
 *       flipped (reached via `?email=` from `SignUpForm.tsx`) — the caller must pass `email`
 *       explicitly, there's no user to look it up from.
 */
import { createHash } from 'node:crypto';

import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { getCurrentUser } from '@/lib/auth/guards';
import { sendSignUpConfirmationEmail } from '@/lib/auth/send-confirmation-email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/validation/common';

const resendConfirmationInputSchema = z.object({
  /** Only required for the no-session fallback (state (b) above); ignored when a session
   *  already resolves an email (state (a)). */
  email: emailSchema.optional(),
});

export const resendConfirmationEmail = createAction(
  resendConfirmationInputSchema,
  async (input) => {
    const user = await getCurrentUser();
    const email = user?.email ?? input.email;
    if (!email) {
      throw new ActionError(
        'validation_error',
        'We could not find an email address to resend to.',
        { email: ['Missing email address.'] },
      );
    }

    // Manually triggered by an impatient user actively waiting for the email — unlike step
    // 3's silent best-effort resend, a rate-limit hit here is NOT caught: it propagates
    // through `createAction` into an `ActionFailure` the client surfaces (toast/inline text).
    await assertWithinRateLimit(
      `verify-email:resend-confirmation:${createHash('sha256').update(email).digest('hex')}`,
      { limit: 4, window: '1 h' },
    );

    const supabase = await createClient();
    const { error } = await sendSignUpConfirmationEmail(supabase, email);
    if (error) {
      console.error('[verify-email] resend confirmation email failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      throw new ActionError('internal_error', 'Could not resend the email. Please try again.');
    }

    return { email };
  },
  // IP-keyed bucket on top of the per-email one above — same two-sided defense as
  // `requestPasswordReset` (`(auth)/actions.ts`): the per-email bucket stops one target from
  // being spammed across many IPs, this stops one IP from iterating through many targets
  // (this route needs no session, so there's no per-user identity to key on instead).
  { rateLimit: { key: 'verify-email:resend-confirmation', limit: 5, window: '15 m' } },
);
