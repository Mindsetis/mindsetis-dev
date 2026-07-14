import 'server-only';

import { getLocale } from 'next-intl/server';

import { enqueueEmail } from '@/lib/email';
import type { EmailLocale } from '@/lib/validation/email';

import { siteUrl } from './site-url';

export interface SendWelcomeEmailResult {
  error: { message: string } | null;
}

/**
 * Enqueue the "Welcome to Mindsetis" informational email via this project's OWN
 * transactional queue (`lib/email/send.ts#enqueueEmail`, stage 0.9 infra: an INSERT into
 * `email_messages`, drained by the `process-email-queue` Edge Function over Resend) — NOT
 * Supabase Auth's confirmation-email system.
 *
 * Purely informational, not a gate: the account is auto-confirmed at signup
 * (`admin.createUser({ email_confirm: true })`, see `app/[locale]/(auth)/actions.ts#signUp`'s
 * doc comment) and already has a live session, so there is nothing left to "confirm" — this
 * reads like an ordinary SaaS receipt/welcome email, `actionUrl` just links back to the
 * wizard's Congrats screen (`/welcome`).
 *
 * Shared by two callers with different rate-limit/error-handling policies around the same
 * underlying send — `app/[locale]/build-profile/actions.ts`'s `sendWelcomeEmailBestEffort`
 * (silent, best-effort, fired automatically when step 3 completes) and
 * `app/[locale]/verify-email/actions.ts`'s `resendWelcomeEmail` (a user-triggered retry on
 * step 4, whose failures ARE surfaced back to the caller). Each applies its own policy around
 * this shared primitive rather than duplicating the `enqueueEmail` call + redirect URL
 * construction. Errors are caught and returned rather than thrown (mirrors the old
 * `supabase.auth.resend()`-based helper's `{ error }` shape) so both call sites can keep their
 * existing swallow-vs-surface branching unchanged.
 */
export async function sendWelcomeEmail(
  email: string,
  userName?: string,
): Promise<SendWelcomeEmailResult> {
  try {
    const locale = (await getLocale()) as EmailLocale;
    await enqueueEmail({
      to: email,
      toName: userName,
      templateKey: 'welcome',
      locale,
      props: { actionUrl: siteUrl('/welcome'), userName },
    });
    return { error: null };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Failed to enqueue welcome email.',
      },
    };
  }
}
