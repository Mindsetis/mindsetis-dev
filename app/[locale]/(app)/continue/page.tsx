import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { applyJoinOrigin, resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';

type ContinuePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
};

/**
 * "Take me wherever I left off" — a route with no UI of its own.
 *
 * It exists because the decision needs a database read (`profiles.onboarding_step`, and
 * sometimes `mindsetter_profiles.onboarding_step`), and a caller that can't do one itself needs
 * somewhere to point. The AUTH_ONLY bounce in `middleware.ts` used to be that caller; it now makes
 * the read itself (once, only for a signed-in visitor on `/login`, `/sign-up`, `/forgot-password`
 * or `/join`, via the same `resolveOnboardingDestination`) and redirects straight to the final
 * page, because going through here cost a second redirect and, at the time, a third one on top
 * (`/dashboard` → `/dashboard/profile`). So this route is now the fallback: the middleware's own
 * lookup failing, an old bookmark, or any link that only has an href and no progress data.
 * Callers that DO already hold the data (the header's "Edit Profile") link to the step directly
 * instead. Never cached — the answer changes the moment the visitor saves a wizard step.
 *
 * Signed-in only (listed in `PROTECTED_PREFIXES`): an anonymous caller is sent to `/login`
 * by the middleware before this renders, which is also why `resolveOnboardingRedirect()`
 * returning `/login` can't bounce back here in a loop — see that function's doc comment.
 *
 * `?from=join` (Release-1 A5): set only by the middleware's fallback `/join` → `/continue` bounce
 * (a signed-in visitor who opened the "Apply to Join" funnel directly). A profile that ISN'T
 * complete yet is forwarded to its real next step exactly like any other caller — the flag is
 * ignored, because a half-finished registration silently redirecting into its own wizard is
 * the whole point of A1 and A5 doesn't change that. Only a COMPLETE profile (the resolver
 * returning `CABINET_PATH`) takes the different branch, to `/join-applied`'s "you've already
 * applied" modal instead of straight into the cabinet (`applyJoinOrigin`, shared with the
 * middleware). Redirecting `/join-applied` itself back to `/join` would loop (middleware
 * bounces `/join` right back), so it deliberately does NOT reuse `/join` — see
 * `PROTECTED_PREFIXES` in `middleware.ts` for why that route is named with a hyphen rather than
 * nested under `/join`.
 */
export const dynamic = 'force-dynamic';

export default async function ContinuePage({ params, searchParams }: ContinuePageProps) {
  const { locale } = await params;
  const { from } = await searchParams;
  setRequestLocale(locale);

  const destination = await resolveOnboardingRedirect();
  redirect({ href: applyJoinOrigin(destination, from === 'join'), locale });
  return null;
}
