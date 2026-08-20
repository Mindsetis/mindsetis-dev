'use server';

/**
 * Server Actions for the cabinet's Settings tab.
 */
import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { assertWithinRateLimit, emailBucket } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { changePasswordSchema } from '@/lib/validation/account-settings';

/**
 * Change the signed-in user's password (Figma `708:9177` / `623:6559`, card "Account").
 *
 * Supabase's `updateUser({ password })` does NOT verify the old password — a session is all it
 * asks for. That is the right contract for the recovery flow (`updatePassword` in
 * `app/[locale]/(auth)/actions.ts`, where the clicked email link IS the proof), but it is too weak
 * here: anyone reaching an unattended, already-signed-in browser could lock the owner out of their
 * own account in two clicks. So the current password is re-checked first, by actually signing in
 * with it. That call also refreshes this browser's session cookie, which is harmless — same user,
 * same device.
 *
 * Because that re-check turns this action into a password oracle, it carries the same per-email
 * ceiling `signIn` does, on top of `createAction`'s per-IP limit: without it, an attacker holding a
 * stolen session could brute-force the account's real password here from any number of IPs.
 *
 * The session is deliberately NOT ended afterwards. The recovery flow signs out because its
 * session is a temporary recovery one and the user has just proven mailbox access, not password
 * knowledge; here the user typed the old password a moment ago, so bouncing them to /login would
 * be friction with nothing bought.
 */
export const changePassword = createAction(
  changePasswordSchema,
  async ({ currentPassword, newPassword }) => {
    const user = await requireUser();
    if (!user.email) {
      // Only reachable for an identity created without an email address (none exist today —
      // signup is email+password). Fail loudly rather than skipping the re-check.
      throw new ActionError('forbidden', 'This account has no email address to verify against.');
    }

    await assertWithinRateLimit(emailBucket('account:change-password:email', user.email), {
      limit: 8,
      window: '15 m',
    });

    const supabase = await createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      throw new ActionError('validation_error', 'Your current password is not correct.', {
        currentPassword: ['Your current password is not correct.'],
      });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error('[dashboard/settings] password update failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      throw new ActionError('internal_error', 'Could not update your password. Please try again.');
    }

    return null;
  },
  { rateLimit: { key: 'account:change-password', limit: 10, window: '15 m' } },
);
