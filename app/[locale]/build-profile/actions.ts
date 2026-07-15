'use server';

/**
 * Server Action for the registration wizard's step 4/4 ("What do you build?" — see
 * `page.tsx`, the last step now that `/verify-email` is step 2). Persists `company` / `role` /
 * `industry` onto the caller's own `profiles` row (RLS: `profiles_update_own`,
 * column-agnostic — no new policy needed, see
 * `supabase/migrations/20260714101121_profiles_step3_build_fields.sql`), then (best-effort)
 * sends the informational "Welcome to Mindsetis" email before the wizard redirects to
 * `/welcome` — see `sendWelcomeEmailBestEffort`'s doc comment.
 */
import { createHash } from 'node:crypto';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { sendWelcomeEmail } from '@/lib/auth/send-welcome-email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { buildProfileSchema } from '@/lib/validation/build-profile';

/**
 * Send the "Welcome to Mindsetis" email via `sendWelcomeEmail()` right before the wizard
 * redirects to the Congrats screen (`/welcome`) — this is the wizard's last step (4/4).
 *
 * Purely informational, not a confirmation gate: the real confirmation gate already happened
 * back at step 2 (`/verify-email`, `app/[locale]/verify-email/actions.ts`'s
 * `resendConfirmationEmail` resends *that* one via `supabase.auth.resend({ type: 'signup' })`
 * — a different mechanism entirely). By the time this action runs, the caller already has a
 * real, confirmed session, so this send has no bearing on whether they can continue.
 *
 * Rate-limited per-email (not just best-effort): resubmitting this step must not be able to
 * trigger unlimited real email sends. Deliberately non-fatal either way — a rate-limit hit or
 * a transient enqueue error is logged and swallowed, never surfaced to the caller, because
 * finishing the wizard must never fail just because this courtesy send couldn't go out.
 */
async function sendWelcomeEmailBestEffort(
  email: string | undefined,
  userName: string | undefined,
): Promise<void> {
  if (!email) return;

  try {
    await assertWithinRateLimit(
      `build-profile:resend-welcome:${createHash('sha256').update(email).digest('hex')}`,
      { limit: 4, window: '1 h' },
    );
  } catch (error) {
    // Best-effort by contract: a rate-limit hit is expected and logged at `warn`; anything else
    // (e.g. a transient Redis/Upstash failure) must not fail step 3 either, so it's logged at
    // `error` and swallowed the same way — never rethrown.
    if (error instanceof ActionError && error.code === 'rate_limited') {
      console.warn('[build-profile] welcome email skipped: rate-limited', { email });
    } else {
      console.error('[build-profile] welcome email rate-limit check failed:', error);
    }
    return;
  }

  const { error } = await sendWelcomeEmail(email, userName);
  if (error) {
    console.error('[build-profile] welcome email enqueue failed:', { message: error.message });
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

  const userName =
    typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined;
  await sendWelcomeEmailBestEffort(user.email, userName);

  return { email: user.email ?? null };
});
