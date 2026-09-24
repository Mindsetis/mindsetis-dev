import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { CABINET_PATH, resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';

type ContinuePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
};

/**
 * "Take me wherever I left off" — a route with no UI of its own.
 *
 * It exists because the decision needs a database read (`profiles.onboarding_step`, and
 * sometimes `mindsetter_profiles.onboarding_step`), and several callers that need it can't do
 * one themselves:
 *
 *   • `middleware.ts` runs on the Edge for every request — adding a per-request profile query
 *     there to decide where to bounce an already-signed-in visitor off `/sign-up` would tax
 *     every navigation on the site to serve one rare case.
 *   • The state-dependent CTAs (Release-1 A4) just need an href, not a resolver.
 *
 * So both simply point here, and this page does the read once and forwards. Never cached —
 * the answer changes the moment the visitor saves a wizard step.
 *
 * Signed-in only (listed in `PROTECTED_PREFIXES`): an anonymous caller is sent to `/login`
 * by the middleware before this renders, which is also why `resolveOnboardingRedirect()`
 * returning `/login` can't bounce back here in a loop — see that function's doc comment.
 *
 * `?from=join` (Release-1 A5): set only by the middleware's `/join` → `/continue` bounce (a
 * signed-in visitor who opened the "Apply to Join" funnel directly). A profile that ISN'T
 * complete yet is forwarded to its real next step exactly like any other caller — the flag is
 * ignored, because a half-finished registration silently redirecting into its own wizard is
 * the whole point of A1 and A5 doesn't change that. Only a COMPLETE profile (the resolver
 * returning `CABINET_PATH`) takes the different branch, to `/join-applied`'s "you've already
 * applied" modal instead of straight into the cabinet. Redirecting `/join-applied` itself back
 * to `/join` would loop (middleware bounces `/join` right back here), so it deliberately does
 * NOT reuse `/join` — see `PROTECTED_PREFIXES` in `middleware.ts` for why that route is named
 * with a hyphen rather than nested under `/join`.
 */
export const dynamic = 'force-dynamic';

export default async function ContinuePage({ params, searchParams }: ContinuePageProps) {
  const { locale } = await params;
  const { from } = await searchParams;
  setRequestLocale(locale);

  const destination = await resolveOnboardingRedirect();
  const isCompleteFromJoin = from === 'join' && destination === CABINET_PATH;
  redirect({ href: isCompleteFromJoin ? '/join-applied' : destination, locale });
  return null;
}
