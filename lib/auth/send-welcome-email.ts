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
 * Purely informational, not a gate: by the time this fires the caller already has a real,
 * confirmed session (the actual confirmation gate is `/verify-email`, step 2 of the wizard —
 * a completely separate mechanism, Supabase Auth's own `signUp`/`resend` confirmation email).
 * This reads like an ordinary SaaS receipt/welcome email, `actionUrl` just links back to the
 * wizard's Congrats screen (`/welcome`).
 *
 * Sole caller: `app/[locale]/build-profile/actions.ts`'s `sendWelcomeEmailBestEffort`, fired
 * best-effort right after the wizard's final step (step 4/4) saves successfully, just before
 * redirecting to `/welcome`. Errors are caught and returned rather than thrown so the caller
 * can log-and-swallow them without ever failing the wizard over a send that didn't go out.
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
