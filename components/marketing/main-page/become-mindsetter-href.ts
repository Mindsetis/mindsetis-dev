import 'server-only';

import { type CtaState, resolveCtaState } from '@/lib/auth/cta-state';
import { MINDSETTER_FIRST_STEP_PATH } from '@/lib/auth/onboarding-progress';
import {
  CABINET_PATH,
  fetchMindsetterOnboardingStep,
  memberWizardPath,
  mindsetterResumePath,
} from '@/lib/auth/onboarding-redirect';
import { createClient } from '@/lib/supabase/server';

/**
 * Destination of the "Become a Mindsetter" card on the home page, decided on the server for the
 * current viewer so the link is correct in the first HTML (no client flash).
 *
 *   guest                  -> /join
 *   memberIncomplete       -> memberWizardPath(step)  (finish MEMBER registration first; chosen
 *                             because the Mindsetter wizard requires a complete Member profile)
 *   memberComplete         -> MINDSETTER_FIRST_STEP_PATH  (`/roles`, straight — no entry hop)
 *   mindsetterInProgress   -> mindsetterResumePath(step)  (last saved step)
 *   mindsetter             -> /mindsetters/<username>
 *
 * "Under review" / "rejected" states are intentionally not modelled (no moderation yet).
 * Returns `[state, href]`; the state is reused by the caller to pick the popup variant.
 */
export async function resolveBecomeMindsetterHref(): Promise<[CtaState, string]> {
  const state = await resolveCtaState();

  if (state === 'guest') return [state, '/join'];
  if (state === 'memberComplete') return [state, MINDSETTER_FIRST_STEP_PATH];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return ['guest', '/join'];

  if (state === 'mindsetterInProgress') {
    const step = await fetchMindsetterOnboardingStep(supabase, user.id);
    return [state, mindsetterResumePath(step)];
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  if (state === 'mindsetter') {
    return [state, profile?.username ? `/mindsetters/${profile.username}` : CABINET_PATH];
  }
  // memberIncomplete
  return [state, memberWizardPath(profile?.onboarding_step ?? null)];
}
