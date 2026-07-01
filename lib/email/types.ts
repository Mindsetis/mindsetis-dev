import 'server-only';

import type { EmailLocale } from '@/lib/validation/email';

/**
 * Columns `enqueueEmail` writes on `email_messages`
 * (`supabase/migrations/20260701110000_email_queue.sql`). Status/attempts/
 * next_attempt_at/provider_message_id/etc. all have DB defaults and are owned end-to-end
 * by the `process-email-queue` Edge Function — this module must NEVER set them.
 *
 * No generated DB types exist yet (`lib/supabase/types.gen.ts` is a TODO on
 * `lib/supabase/service.ts`); this local interface is the explicit stand-in so the insert
 * payload is still typo-checked at compile time.
 */
export interface EmailMessageInsert {
  to_email: string;
  to_name: string | null;
  template_key: string;
  locale: EmailLocale;
  subject: string;
  html_body: string;
  text_body: string | null;
  dedup_key: string | null;
}
