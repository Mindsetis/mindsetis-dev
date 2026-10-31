/**
 * The decision logic behind "where does this user belong right now?" — stored onboarding progress
 * in, locale-less route out. `./onboarding-redirect.ts` is the server-side front door for it (it
 * supplies the cookie-bound Supabase client and re-exports everything below); this file exists
 * separately so `middleware.ts` can run the very same decision.
 *
 * WHY A SEPARATE FILE, AND WHY NO `server-only`
 *   The middleware runs on the Edge and cannot use `lib/supabase/server.ts` (`cookies()` from
 *   `next/headers` has no request scope there). Everything in here therefore takes the Supabase
 *   client as an ARGUMENT instead of creating one, and imports nothing from `next/*` — only types.
 *   That is what lets a signed-in visitor on `/login`, `/sign-up`, `/forgot-password` or `/join` be
 *   redirected straight to their final page in ONE hop instead of bouncing through `/continue`
 *   (which then bounced again through the `/dashboard` index) — see the AUTH_ONLY branch in
 *   `middleware.ts`.
 *
 * TWO SEPARATE COUNTERS, DELIBERATELY
 *   `profiles.onboarding_step` is the Member registration wizard's counter;
 *   `mindsetter_profiles.onboarding_step` is the extended Mindsetter wizard's. They were split
 *   by the stage-1.9 review loop precisely so the two flows can't stomp on each other — see
 *   `supabase/migrations/20260718172922_mindsetter_onboarding_review_fixes.sql`. Read both,
 *   never conflate them.
 *
 * RULE FOR EVERY DESTINATION HERE: it must be a FINAL page — one that renders, never one that
 *   redirects again. A destination that itself redirects turns "one hop" back into a chain
 *   (the cabinet used to be `/dashboard`, whose index only forwards to `/dashboard/profile`).
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';

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

/** `mindsetter_profiles.onboarding_step` once every required step is saved. */
export const MINDSETTER_COMPLETE = MINDSETTER_STEP_ROUTES.length;

/**
 * End of the core wizard. Rendering it runs `finalizeMindsetterOnboarding`, which promotes a
 * caller who saved every required step but is still a Member — see `mindsetterResumePath`.
 */
const MINDSETTER_CONGRATS_PATH = '/mindsetter-onboarding/congrats';

/**
 * Where a Member picks the Mindsetter wizard back up: the next unsaved required step, or
 * `/congrats` once all of them are saved (a caller promoted at `saveShine` never asks — they are
 * a Mindsetter already; this only catches someone who finished before that promotion existed).
 * `null` means "never started" (no `mindsetter_profiles` row yet) and resolves to the first step.
 */
export function mindsetterResumePath(step: number | null): string {
  const saved = step ?? 0;
  if (saved >= MINDSETTER_COMPLETE) return MINDSETTER_CONGRATS_PATH;
  return MINDSETTER_STEP_ROUTES[saved] ?? MINDSETTER_STEP_ROUTES[0];
}

/**
 * The caller's `mindsetter_profiles.onboarding_step`, or `null` when they never started the
 * wizard — the row only exists once `/roles` is first saved, so "row exists" is "started".
 */
export async function fetchMindsetterOnboardingStep(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('mindsetter_profiles')
    .select('onboarding_step')
    .eq('id', userId)
    .maybeSingle();
  return data ? (data.onboarding_step ?? 0) : null;
}

/**
 * The signed-in user's home base once there is nothing left to finish: "My Profile", the one
 * cabinet screen that exists. NOT `/dashboard` — that index only redirects here (the Overview tab
 * isn't built), so using it as a destination cost every caller an extra hop. When Overview ships
 * and `/dashboard` becomes a real page, this is the one constant that moves back to it (and
 * `app/[locale]/(app)/dashboard/page.tsx` stops redirecting).
 */
export const CABINET_PATH = '/dashboard/profile';

/** First Member wizard step that actually collects something. */
export const MEMBER_DETAILS_PATH = '/member-profile';

/** Last Member wizard step. */
export const MEMBER_BUSINESS_PATH = '/build-profile';

/** The blocking "check your inbox" gate (step 2/4) — public, reached without a session. */
export const VERIFY_EMAIL_PATH = '/verify-email';

/** Where an anonymous caller goes. */
export const LOGIN_PATH = '/login';

/** Where a session without a `profiles` row goes — see `resolveOnboardingDestination`. */
export const HOME_PATH = '/';

/**
 * Release-1 A5's "you've already applied" screen — where a COMPLETE profile that opened `/join`
 * lands instead of the cabinet. Hyphenated on purpose, not `/join/applied`: see
 * `PROTECTED_PREFIXES` in `middleware.ts`.
 */
export const JOIN_APPLIED_PATH = '/join-applied';

/**
 * The Member wizard step to continue at, for a caller whose Member profile is NOT done yet
 * (`step < MEMBER_COMPLETE`). Pure, so a caller that already holds `profiles.onboarding_step`
 * (the header's "Edit Profile") can link straight to the step instead of through `/continue`.
 */
export function memberWizardPath(step: number | null): string {
  return (step ?? 0) < MEMBER_DETAILS_SAVED ? MEMBER_DETAILS_PATH : MEMBER_BUSINESS_PATH;
}

/**
 * Release-1 A5 on top of a resolved destination: a COMPLETE profile (the resolver says
 * `CABINET_PATH`) that arrived from `/join` sees the "you've already applied" screen instead of
 * the cabinet. Everyone else — in particular a half-finished registration — keeps the real
 * destination, because silently resuming the wizard is the whole point of A1 and A5 doesn't
 * change that. Shared by `/continue` and the middleware so the two can't disagree.
 */
export function applyJoinOrigin(destination: string, fromJoin: boolean): string {
  return fromJoin && destination === CABINET_PATH ? JOIN_APPLIED_PATH : destination;
}

/**
 * The locale-less path this signed-in user should be sent to, decided from their stored progress.
 * The Supabase client must carry the user's session (RLS reads their own rows) — the RSC path
 * passes the cookie-bound server client, the middleware one built from the request cookies.
 *
 * Never returns `/login`: the caller already holds a session, and the middleware bounces a
 * signed-in visitor OFF `/login` — so handing one back here would ping-pong between the two
 * forever. Every branch therefore ends somewhere that accepts a signed-in user, including the
 * degenerate "no profile row" case.
 */
export async function resolveOnboardingDestination(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email_confirmed_at'>,
): Promise<string> {
  // Confirmation is a real gate (stage 1.5): normally there is no session before the link is
  // clicked, so this is a defensive branch rather than the common path.
  if (!user.email_confirmed_at) return VERIFY_EMAIL_PATH;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_step, account_type')
    .eq('id', user.id)
    .maybeSingle();

  // supabase-js reports a failed read as `{ data: null, error }` instead of throwing. Treating
  // that as "no row" would send an unfinished Member into the cabinet, so surface it: the
  // middleware falls back to `/continue`, the RSC wrapper to the cabinet.
  if (profileError) throw profileError;

  // No `profiles` row means the `on_auth_user_created` trigger didn't run — an anomaly, not a
  // state the wizard can resume from. Every signed-in page needs the row (the cabinet layout
  // sends a row-less session home too), so the homepage is the one place that doesn't loop.
  if (!profile) return HOME_PATH;

  const memberStep = profile.onboarding_step ?? 0;
  if (memberStep < MEMBER_COMPLETE) return memberWizardPath(memberStep);

  // Member profile is complete. The Mindsetter track is OPTIONAL — the client settled this on
  // 15.09.2026: a Member is invited to upgrade (the header's `Upgrade` button, A4), never
  // shoved into the extended wizard. Since the 28.10.2026 call (Release-2 П4) that holds for an
  // UNFINISHED wizard too: someone who started it stays a Member, lands in the cabinet and picks
  // it back up from "Continue Registration" whenever they choose — it used to pull them back
  // into the form on every sign-in, with no way to see their own profile in between.
  //
  // The one exception is a Member who saved every required step but was never promoted: before
  // П4 the promotion ran only when `/congrats` rendered, so closing the tab during the optional
  // blocks left them a Member for good. `/congrats` finalizes idempotently, so one visit fixes it.
  if (profile.account_type === 'member') {
    const mindsetterStep = await fetchMindsetterOnboardingStep(supabase, user.id);
    if (mindsetterStep !== null && mindsetterStep >= MINDSETTER_COMPLETE) {
      return MINDSETTER_CONGRATS_PATH;
    }
  }

  return CABINET_PATH;
}
