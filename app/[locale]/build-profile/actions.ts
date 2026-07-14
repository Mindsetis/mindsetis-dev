'use server';

/**
 * Server Action for the registration wizard's step 3/4 ("What do you build?" — see
 * `page.tsx`). Persists `company` / `role` / `industry` onto the caller's own `profiles`
 * row (RLS: `profiles_update_own`, column-agnostic — no new policy needed, see
 * `supabase/migrations/20260714101121_profiles_step3_build_fields.sql`), then (best-effort)
 * sends the sign-up confirmation email so step 4 (`/verify-email`) has a real link to point
 * at — see `sendConfirmationEmailBestEffort`'s doc comment.
 */
import { createHash } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { sendSignUpConfirmationEmail } from '@/lib/auth/send-confirmation-email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { buildProfileSchema } from '@/lib/validation/build-profile';

/**
 * Send the sign-up confirmation email via `sendSignUpConfirmationEmail()` right before the
 * wizard moves on to step 4 ("Check your inbox").
 *
 * This is the FIRST confirmation-email send in the wizard (not the only one anymore — stage
 * 1.4 adds a second, user-triggered send path, `app/[locale]/verify-email/actions.ts`'s
 * `resendConfirmationEmail`, behind the "Resend email" button on step 4 itself): step 1
 * (`app/[locale]/(auth)/actions.ts`'s `signUp()`) creates the account via the service-role
 * Admin API with `email_confirm: false`, which never sends anything itself, so this call is
 * the first real delivery — addressed at the wizard's actual final destination (`/welcome`,
 * the Congrats screen).
 *
 * Rate-limited per-email (not just best-effort): resubmitting step 3 must not be able to
 * trigger unlimited real email sends. Deliberately non-fatal either way — a rate-limit hit or
 * a transient `resend()` error is logged and swallowed, never surfaced to the caller, because
 * completing step 3 and reaching step 4 must never fail just because a resend couldn't go out.
 * Contrast with `verify-email/actions.ts`'s version, which is a manually-triggered retry the
 * user is actively waiting on — there, a rate-limit hit IS surfaced.
 */
async function sendConfirmationEmailBestEffort(
  supabase: SupabaseClient,
  email: string | undefined,
): Promise<void> {
  if (!email) return;

  try {
    await assertWithinRateLimit(
      `build-profile:resend-confirmation:${createHash('sha256').update(email).digest('hex')}`,
      { limit: 4, window: '1 h' },
    );
  } catch (error) {
    // Best-effort by contract: a rate-limit hit is expected and logged at `warn`; anything else
    // (e.g. a transient Redis/Upstash failure) must not fail step 3 either, so it's logged at
    // `error` and swallowed the same way — never rethrown.
    if (error instanceof ActionError && error.code === 'rate_limited') {
      console.warn('[build-profile] resend confirmation email skipped: rate-limited', { email });
    } else {
      console.error('[build-profile] resend confirmation email rate-limit check failed:', error);
    }
    return;
  }

  const { error } = await sendSignUpConfirmationEmail(supabase, email);
  if (error) {
    console.error('[build-profile] resend confirmation email failed:', {
      status: error.status,
      code: error.code,
      message: error.message,
    });
  }
}

export const saveBuildProfile = createAction(buildProfileSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      // `buildProfileSchema` requires (and trims) all three now — no `?.trim() || null`
      // fallback needed, the parsed values are already guaranteed non-empty strings.
      company: input.company,
      role: input.role,
      industry: input.industry,
      onboarding_step: 3,
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('[build-profile] profile update failed:', profileError);
    throw new ActionError('internal_error', 'Could not save your profile. Please try again.');
  }

  await sendConfirmationEmailBestEffort(supabase, user.email);

  return { email: user.email ?? null };
});
