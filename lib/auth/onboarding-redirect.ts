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
 *   and the four entry points (email confirmation, sign-in, post-password-change sign-in, and
 *   the "Apply to Join" bounce via `/continue`) all call it instead of guessing.
 *
 * TWO SEPARATE COUNTERS, DELIBERATELY
 *   `profiles.onboarding_step` is the Member registration wizard's counter;
 *   `mindsetter_profiles.onboarding_step` is the extended Mindsetter wizard's. They were split
 *   by the stage-1.9 review loop precisely so the two flows can't stomp on each other — see
 *   `supabase/migrations/20260718172922_mindsetter_onboarding_review_fixes.sql`. Read both,
 *   never conflate them.
 */
import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Values the Member wizard writes into `profiles.onboarding_step`. The column starts at 0 and
 * only two steps write to it — `/sign-up` and `/verify-email` have nothing of their own to
 * save, which is why the numbering looks sparse:
 *
 *   0 → account created, nothing filled in yet        → continue at `/member-profile` (3/4)
 *   2 → `/member-profile` saved                       → continue at `/build-profile`  (4/4)
 *   3 → `/build-profile` saved, Member profile done   → the cabinet
 */
const MEMBER_DETAILS_SAVED = 2;
/**
 * Also the threshold `lib/auth/cta-state.ts` (Release-1 A4) uses to decide "Edit Profile" vs.
 * "Upgrade" for the header/hero/"What is Mindsetis" beacon button — exported so that decision
 * can't drift from this module's own definition of "the Member wizard is done".
 */
export const MEMBER_COMPLETE = 3;

/**
 * `mindsetter_profiles.onboarding_step` → where to continue. The index IS the stored value:
 * the column holds "how many required steps are saved", so `MINDSETTER_STEP_ROUTES[step]` is
 * the next unfinished one. Values come from the `*_STEP_ONBOARDING_STEP` constants in
 * `app/[locale]/(app)/mindsetter-onboarding/actions.ts` — keep the two in sync.
 *
 * The optional blocks (`/blocks/*`) are intentionally absent: they are optional, so someone
 * who finished `shine` is "done" for routing purposes and belongs in the cabinet.
 */
const MINDSETTER_STEP_ROUTES = [
  '/mindsetter-onboarding/roles',
  '/mindsetter-onboarding/superpowers',
  '/mindsetter-onboarding/help',
  '/mindsetter-onboarding/shine',
] as const;

const MINDSETTER_COMPLETE = MINDSETTER_STEP_ROUTES.length;

/** The signed-in user's home base once there is nothing left to finish. */
export const CABINET_PATH = '/dashboard';

/** First Member wizard step that actually collects something. */
export const MEMBER_DETAILS_PATH = '/member-profile';

/** Last Member wizard step. */
export const MEMBER_BUSINESS_PATH = '/build-profile';

/** The blocking "check your inbox" gate (step 2/4) — public, reached without a session. */
export const VERIFY_EMAIL_PATH = '/verify-email';

/** Where an anonymous caller goes. */
export const LOGIN_PATH = '/login';

/**
 * The locale-less path this caller should be sent to, decided from their stored progress.
 *
 * Returns `/login` ONLY when there is no user at all. This is load-bearing: the middleware
 * bounces a signed-in visitor off `/login` and `/sign-up` to `/continue`, which calls this
 * function — so returning `/login` for a caller who *does* have a session would ping-pong
 * between the two forever. Every signed-in branch below therefore ends somewhere that accepts
 * a signed-in user, including the degenerate "no profile row" case.
 */
export async function resolveOnboardingRedirect(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return LOGIN_PATH;

  // Confirmation is a real gate (stage 1.5): normally there is no session before the link is
  // clicked, so this is a defensive branch rather than the common path.
  if (!user.email_confirmed_at) return VERIFY_EMAIL_PATH;

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  // No `profiles` row means the `on_auth_user_created` trigger didn't run — an anomaly, not a
  // state the wizard can resume from. The cabinet degrades gracefully; `/member-profile` would
  // bounce this caller straight back to `/login` and into the loop described above.
  if (!profile) return CABINET_PATH;

  const memberStep = profile.onboarding_step ?? 0;
  if (memberStep < MEMBER_DETAILS_SAVED) return MEMBER_DETAILS_PATH;
  if (memberStep < MEMBER_COMPLETE) return MEMBER_BUSINESS_PATH;

  // Member profile is complete. The Mindsetter track is OPTIONAL — the client settled this on
  // 15.09.2026: a Member is invited to upgrade (the header's `Upgrade` button, A4), never
  // shoved into the extended wizard. So we resume that track only for someone who actually
  // started it, which is exactly "a `mindsetter_profiles` row exists" (the first save in
  // `/roles` upserts it).
  const { data: mindsetter } = await supabase
    .from('mindsetter_profiles')
    .select('onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  if (!mindsetter) return CABINET_PATH;

  const mindsetterStep = mindsetter.onboarding_step ?? 0;
  if (mindsetterStep < MINDSETTER_COMPLETE) {
    return MINDSETTER_STEP_ROUTES[mindsetterStep] ?? MINDSETTER_STEP_ROUTES[0];
  }

  return CABINET_PATH;
}
