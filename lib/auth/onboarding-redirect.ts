/**
 * "Where does this user belong right now?" — the single place that answers it.
 *
 * WHY THIS EXISTS
 *   Until stage 1.13 the app wrote onboarding progress to the database and then never read it
 *   back. Every place that had to send a signed-in user somewhere picked a destination by
 *   hand: the confirmation email's `next=` param pointed at a hardcoded step 3/4, `SignInForm`
 *   fell back to `/`, and the middleware bounced an already-signed-in visitor off `/sign-up`
 *   to `/` as well. The result was the dead end the client reported: confirm your email, land
 *   on the homepage, and nothing tells you the registration is half-finished (Release-1 items
 *   1-4, `docs/release-1-tasks.md` → A1).
 *
 *   So progress lives in the DB; this module is the one function that turns it into a route,
 *   and the entry points (email confirmation, sign-in, post-password-change sign-in, and the
 *   "Apply to Join" bounce via `/continue` or the middleware) all call it instead of guessing.
 *
 * WHERE THE LOGIC LIVES
 *   The decision itself — the thresholds, the routes, `resolveOnboardingDestination(supabase,
 *   user)` — is in `./onboarding-progress.ts`, written against a Supabase client passed in so the
 *   Edge middleware can run it too (it has no `cookies()`). This file is its server-side front
 *   door: it supplies the cookie-bound client and re-exports the whole module, so server code has
 *   a single import path. Import `./onboarding-progress` directly only from the middleware.
 */
import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { CABINET_PATH, LOGIN_PATH, resolveOnboardingDestination } from './onboarding-progress';

export {
  applyJoinOrigin,
  CABINET_PATH,
  fetchMindsetterOnboardingStep,
  JOIN_APPLIED_PATH,
  LOGIN_PATH,
  MEMBER_BUSINESS_PATH,
  MEMBER_COMPLETE,
  MEMBER_DETAILS_PATH,
  memberWizardPath,
  MINDSETTER_COMPLETE,
  mindsetterResumePath,
  resolveOnboardingDestination,
  VERIFY_EMAIL_PATH,
} from './onboarding-progress';

/**
 * The locale-less path this caller should be sent to, decided from their stored progress.
 *
 * Returns `/login` ONLY when there is no user at all. This is load-bearing: the middleware
 * bounces a signed-in visitor off `/login` and `/sign-up`, so returning `/login` for a caller who
 * *does* have a session would ping-pong between the two forever. Every signed-in branch
 * (`resolveOnboardingDestination`) therefore ends somewhere that accepts a signed-in user.
 */
export async function resolveOnboardingRedirect(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return LOGIN_PATH;

  try {
    return await resolveOnboardingDestination(supabase, user);
  } catch (error) {
    // A failed profile read (network/DB). `/continue` and `/api/auth/confirm` have no better
    // fallback than the cabinet — the same place they went before the resolver surfaced errors.
    console.error('[onboarding-redirect] could not resolve destination:', error);
    return CABINET_PATH;
  }
}
