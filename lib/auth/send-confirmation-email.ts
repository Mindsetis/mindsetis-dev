import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { siteUrl } from './site-url';

/**
 * Thin wrapper around `supabase.auth.resend({ type: 'signup' })`, pointed at the wizard's
 * Congrats-screen redirect (`/api/auth/confirm?next=/welcome`).
 *
 * Shared by two callers with different error-handling policies around the same underlying
 * call — `app/[locale]/build-profile/actions.ts`'s `resendConfirmationEmail` (silent,
 * best-effort, fired automatically when step 3 completes) and
 * `app/[locale]/verify-email/actions.ts`'s `resendConfirmationEmail` (a user-triggered retry
 * on step 4, whose failures — including rate-limit — ARE surfaced back to the caller). Each
 * applies its own rate-limit/error policy around this shared primitive rather than duplicating
 * the `supabase.auth.resend` call + redirect URL construction.
 */
export async function sendSignUpConfirmationEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ error: { status?: number; code?: string; message: string } | null }> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: siteUrl('/api/auth/confirm?next=/welcome') },
  });
  return { error };
}
