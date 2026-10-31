import 'server-only';

import { createClient as createServiceClient } from '@/lib/supabase/service';

/**
 * True when `email` already belongs to a CONFIRMED account.
 *
 * Wraps the `email_has_confirmed_account` SQL function (migration 20260929175403), which is
 * executable by the service role only — hence the service client here. This is an existence
 * oracle: every caller must put its own per-IP and per-address rate limit in front of it (the
 * ambassador form and the `/join` email screen both do), and must never expose it unthrottled.
 *
 * Unconfirmed accounts deliberately read as `false`: signing up again with such an address just
 * re-sends the confirmation email, so there is nothing to redirect that visitor away from.
 *
 * Throws on a lookup failure; the caller decides whether to fail open or closed.
 */
export async function emailHasConfirmedAccount(email: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc('email_has_confirmed_account', {
    p_email: email,
  });
  if (error) {
    throw new Error(`email_has_confirmed_account failed: ${error.code ?? ''} ${error.message}`);
  }
  return Boolean(data);
}
