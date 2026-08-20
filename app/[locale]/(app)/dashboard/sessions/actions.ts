'use server';

/**
 * Server Action for the cabinet's "Sessions Setup" tab.
 */
import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import {
  type Expertise,
  MAX_CUSTOM_SESSION_TOPICS,
  sessionStepSchema,
} from '@/lib/validation/mindsetter';

/**
 * Save the whole Sessions Setup page (Figma `1094:23946` desktop / `1091:10460` mobile).
 *
 * This replaces the wizard's `saveSession`, which was deleted together with the onboarding step it
 * belonged to (2026-08-13). Two behavioural differences from that one, both because this edits a
 * finished profile rather than driving a wizard:
 *   - it never touches `mindsetter_profiles.onboarding_step`;
 *   - it is reachable only by an account that is ALREADY a Mindsetter.
 *
 * Still on the service-role client for the `session_settings` write itself:
 * `session_settings_insert_own` / `_update_own` gate on `is_mindsetter(auth.uid())`, which means a
 * VERIFIED Mindsetter. An unverified one owns this page and must be able to configure it before
 * verification lands, so the anon-key client would be refused by RLS. The write is still narrowly
 * scoped — it only ever targets `mindsetter_id = user.id`, resolved from the session, never from
 * input.
 */
export const saveSessionSettings = createAction(sessionStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.account_type !== 'mindsetter') {
    throw new ActionError('forbidden', 'Only Mindsetters can configure 1:1 sessions.');
  }

  // The ad-hoc-topic cap lives here rather than in the schema: "custom" means "not one of THIS
  // Mindsetter's Help-step titles", which the schema cannot know — it only ever sees a list of
  // indistinguishable strings. The form applies the same rule client-side; this is the half a
  // crafted request cannot skip.
  const { data: helpRow } = await supabase
    .from('mindsetter_profiles')
    .select('help_with')
    .eq('id', user.id)
    .maybeSingle();

  const helpTitles = new Set(
    (Array.isArray(helpRow?.help_with) ? (helpRow.help_with as Expertise[]) : [])
      .map((item) => item?.title?.trim())
      .filter((title): title is string => Boolean(title)),
  );
  const customCount = input.topics.filter((topic) => !helpTitles.has(topic)).length;

  if (customCount > MAX_CUSTOM_SESSION_TOPICS) {
    throw new ActionError(
      'validation_error',
      `You can add up to ${MAX_CUSTOM_SESSION_TOPICS} custom topics.`,
      { topics: [`You can add up to ${MAX_CUSTOM_SESSION_TOPICS} custom topics.`] },
    );
  }

  const service = createServiceClient();
  const { error } = await service.from('session_settings').upsert(
    {
      mindsetter_id: user.id,
      accepts_bookings: input.acceptsBookings,
      session_type: input.sessionType,
      // Cleared for a Free session even if a price was typed earlier, so a stale amount never
      // lingers behind a Free profile.
      price_cents: input.sessionType === 'paid' ? input.priceCents : null,
      durations: input.durations,
      topics: input.topics,
      timezone: input.timezone,
      weekly_availability: input.weeklyAvailability,
      fee_consent_accepted: input.feeConsentAccepted,
    },
    { onConflict: 'mindsetter_id' },
  );

  if (error) {
    console.error('[dashboard/sessions] session_settings upsert failed:', error);
    throw new ActionError(
      'internal_error',
      'Could not save your session settings. Please try again.',
    );
  }

  return null;
});
