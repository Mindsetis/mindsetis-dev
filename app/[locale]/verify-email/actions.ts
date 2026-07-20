'use server';

/**
 * Server Action for the "Resend email" button on `/verify-email` (registration wizard step
 * 2/4, see `page.tsx`) — stage 1.5 rework. There is no session at this point (that's the whole
 * point of the confirmation gate), so unlike the old `resendWelcomeEmail` this action:
 *
 *   - Takes `email` as plain input (Zod-validated), not `requireUser()`.
 *   - Resends Supabase Auth's own confirmation email via `supabase.auth.resend({ type: 'signup',
 *     email })` (anon client) — NOT `lib/auth/send-welcome-email.ts`'s informational template,
 *     which is a separate, unrelated mechanism for the (still-correct) congrats email sent once
 *     step 4 completes.
 *   - Never reveals whether the address has an account or is already confirmed (enumeration
 *     protection) — the response is always the same generic success shape, mirroring
 *     `requestPasswordReset` in `(auth)/actions.ts`. `supabase.auth.resend()` itself already
 *     avoids leaking this for a confirmed/nonexistent address (it just silently no-ops), so this
 *     mirrors that by not surfacing its `error` to the caller either, beyond rate-limiting.
 *   - Is rate-limited per-email (hashed bucket, `emailBucket`-style) on top of `createAction`'s
 *     per-IP limit, since an unauthenticated resend endpoint is otherwise a ready-made
 *     email-bombing primitive against arbitrary addresses.
 */
import { createAction } from '@/lib/api';
import { siteUrl } from '@/lib/auth/site-url';
import { assertWithinRateLimit, emailBucket } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { resendConfirmationEmailSchema } from '@/lib/validation/auth';

export const resendConfirmationEmail = createAction(
  resendConfirmationEmailSchema,
  async ({ email }) => {
    // Per-email ceiling (holds across IPs), same defense-in-depth pattern as
    // `requestPasswordReset` — bounds one target address from being spammed via many IPs, on
    // top of the per-IP limit below.
    await assertWithinRateLimit(emailBucket('verify-email:resend-confirmation:email', email), {
      limit: 4,
      window: '1 h',
    });

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      // Same destination as `signUp()` (`(auth)/actions.ts`) — the default (SMTP-off,
      // non-editable) "Confirm signup" template builds its link from `emailRedirectTo`, so the
      // resent email must carry it too, otherwise the confirmation `?code=` lands on the Site
      // URL root instead of our `/api/auth/confirm` handler.
      options: { emailRedirectTo: siteUrl('/api/auth/confirm?next=/member-profile') },
    });
    if (error) {
      // Log for observability, but never surface the specific reason to the caller — an
      // "already confirmed" / "no such user" error here would be an enumeration oracle. Any
      // genuine delivery problem is invisible to the visitor either way (same tradeoff
      // `supabase.auth.resend()` itself makes for unconfirmed vs. nonexistent addresses).
      console.error('[verify-email] resend confirmation email failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }

    return null;
  },
  // IP-keyed bucket on top of the per-email one above, same defense-in-depth pattern as
  // `requestPasswordReset` (`(auth)/actions.ts`) — bounds one IP cycling through many target
  // addresses to trigger sends, on top of the per-email cap.
  { rateLimit: { key: 'verify-email:resend-confirmation', limit: 5, window: '15 m' } },
);
