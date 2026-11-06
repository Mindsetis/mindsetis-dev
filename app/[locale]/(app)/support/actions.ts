'use server';

/**
 * Help & Support — the account menus' "Help & Support" dialog (`HelpSupportDialog`).
 *
 * Emails ONE message to the team's support mailbox through the normal email queue
 * (`enqueueEmail`, template `support_request`), with `Reply-To` = the address the user typed so
 * support can answer from the mailbox. Nothing is stored in the database beyond the queue row.
 */
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { getSupportEmail } from '@/lib/config/support';
import { enqueueEmail } from '@/lib/email';
import { assertWithinRateLimit } from '@/lib/rate-limit';
import type { EmailLocale } from '@/lib/validation/email';
import { helpSupportActionSchema } from '@/lib/validation/help-support';

/** Per ACCOUNT, across devices/IPs: 5 messages an hour. No-ops when Upstash isn't configured. */
const SUPPORT_RATE_LIMIT = { limit: 5, window: '1 h' } as const;

/**
 * - `requireUser()` — signed-in users only (the menus only exist for them).
 * - Per-user rate limit → `rate_limited` (the dialog shows its own "too many messages" copy).
 * - Context the user never sees: user id (session), UI locale (next-intl), device/browser
 *   (`User-Agent` from the request — NOT client-supplied), page (client-supplied, length-limited
 *   by the schema, display-only).
 * - A failed enqueue is a real failure here (unlike the ambassador receipt): the email IS the
 *   whole feature, so the user must be told to retry.
 */
export const submitHelpSupport = createAction(helpSupportActionSchema, async (input) => {
  const user = await requireUser();

  await assertWithinRateLimit(`support:help:${user.id}`, SUPPORT_RATE_LIMIT);

  const uiLocale = (await getLocale()) as EmailLocale;
  const userAgent = (await headers()).get('user-agent')?.slice(0, 500) || undefined;

  try {
    await enqueueEmail({
      to: getSupportEmail(),
      templateKey: 'support_request',
      locale: 'en',
      replyTo: input.email,
      props: {
        userId: user.id,
        userEmail: input.email,
        message: input.message,
        page: input.page,
        userAgent,
        uiLocale,
      },
    });
  } catch (error) {
    console.error('[support.submitHelpSupport] enqueue failed:', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new ActionError('internal_error', 'Something went wrong. Please try again.');
  }

  return null;
});
