/**
 * "What should the state-dependent CTA say right now?" — the single place that answers it for
 * Release-1 A4's "beacon" button, which appears in three spots (`Header`, `HeroBand`, and
 * `WhatIsMindsetis`) and changes label/destination with the visitor's account state.
 *
 * WHY ONE RESOLVER FOR THREE CALL SITES
 *   The three buttons don't show the same copy (a signed-in-but-incomplete Member sees "Edit
 *   Profile" in the header but "Explore Community" in the hero), so this module intentionally
 *   stops at the STATE, not the label — see `CtaState` below. Each call site owns its own
 *   state → (label, destination) mapping (a plain `switch` at the call site), which is the
 *   "hero differs from the other two only in the mapping" split from the task brief. What must
 *   NOT be duplicated three times is "how do I tell a guest from an incomplete Member from a
 *   complete one from a Mindsetter" — that lives here, once, mirroring the existing
 *   `resolveOnboardingRedirect` precedent (`./onboarding-redirect.ts`).
 *
 * WHY `account_type`, NOT `verification_status` OR the extended Mindsetter wizard's own step
 *   The client was explicit (16.09.2026, `docs/release-1-tasks.md` A4): "Upgrade" appears as
 *   soon as the Member wizard is done, NOT once verification completes — verification_status is
 *   irrelevant here. Symmetrically, `account_type` flips to `'mindsetter'` the moment the
 *   extended wizard's `finalize` step runs (`app/[locale]/(app)/mindsetter-onboarding/
 *   actions.ts`), independent of verification too — so reading `account_type` directly (already
 *   fetched by every caller for other reasons — `AccountMenu`, `requireMindsetter`, etc.) is both
 *   correct per the matrix and requires no extra lookup for that split.
 *
 *   The wizard's own progress matters for one thing only (Release-2 П5, call of 28.10.2026): a
 *   Member who STARTED it gets "Continue Registration" instead of "Upgrade", so the button
 *   resumes their wizard rather than pitching the upgrade again. That needs to know whether a
 *   `mindsetter_profiles` row exists, which callers look up only for a complete Member.
 *
 * WHY TWO EXPORTS
 *   `Header` already runs its own `profiles` query for `AccountMenu` (username/account_type/
 *   avatar_url/full_name/verification_status) — adding `onboarding_step` to that SAME select and
 *   calling the pure `ctaStateFromProfile` avoids a second round trip on the same row.
 *   `HeroBand`/`WhatIsMindsetis` have no profile query of their own, so `resolveCtaState` fetches
 *   for them. Same data, same rule, two entry points for two different starting points — not two
 *   sources of truth.
 */
import 'server-only';

import { cache } from 'react';

import { fetchMindsetterOnboardingStep, MEMBER_COMPLETE } from '@/lib/auth/onboarding-redirect';
import { createClient } from '@/lib/supabase/server';

export type CtaState =
  'guest' | 'memberIncomplete' | 'memberComplete' | 'mindsetterInProgress' | 'mindsetter';

/** The two `profiles` columns the decision needs — a subset any caller's own select can add to. */
export interface CtaProfileFields {
  account_type: 'member' | 'mindsetter';
  onboarding_step: number | null;
}

/**
 * Pure state mapper — no I/O, so callers that already hold the two columns (`Header`) can use it
 * directly instead of triggering `resolveCtaState`'s own query.
 *
 * `profile: null` while `signedIn` is a defensive-only branch (mirrors `resolveOnboardingRedirect`'s
 * "no `profiles` row" case, an anomaly rather than a state the wizard resumes from): it degrades
 * to `memberIncomplete` rather than crashing the header, since that's the state that still leads
 * somewhere sane (`/continue`).
 *
 * `mindsetterStep` is `mindsetter_profiles.onboarding_step`, `null` when the caller never started
 * the Mindsetter wizard (see `fetchMindsetterOnboardingStep`). Only consulted for a complete
 * Member, so callers may skip the lookup in every other case.
 */
export function ctaStateFromProfile(
  signedIn: boolean,
  profile: CtaProfileFields | null,
  mindsetterStep: number | null = null,
): CtaState {
  if (!signedIn) return 'guest';
  if (profile?.account_type === 'mindsetter') return 'mindsetter';

  const step = profile?.onboarding_step ?? 0;
  if (step < MEMBER_COMPLETE) return 'memberIncomplete';
  return mindsetterStep === null ? 'memberComplete' : 'mindsetterInProgress';
}

/** Whether `ctaStateFromProfile` will need `mindsetterStep` for this profile. */
export function needsMindsetterStep(profile: CtaProfileFields | null): boolean {
  return profile?.account_type === 'member' && (profile.onboarding_step ?? 0) >= MEMBER_COMPLETE;
}

/**
 * Fetches its own `profiles` row and resolves the state — for callers with no profile query of
 * their own yet (`HeroBand`, `WhatIsMindsetis`). Both render on the same page, so the lookup is
 * memoized per request (`cache`) instead of running twice.
 */
export const resolveCtaState = cache(async (): Promise<CtaState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'guest';

  const { data } = await supabase
    .from('profiles')
    .select('account_type, onboarding_step')
    .eq('id', user.id)
    .maybeSingle();
  const profile = data as CtaProfileFields | null;

  const mindsetterStep = needsMindsetterStep(profile)
    ? await fetchMindsetterOnboardingStep(supabase, user.id)
    : null;
  return ctaStateFromProfile(true, profile, mindsetterStep);
});
