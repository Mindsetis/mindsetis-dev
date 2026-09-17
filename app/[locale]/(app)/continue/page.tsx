import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';

type ContinuePageProps = {
  params: Promise<{ locale: string }>;
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
 */
export const dynamic = 'force-dynamic';

export default async function ContinuePage({ params }: ContinuePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const destination = await resolveOnboardingRedirect();
  redirect({ href: destination, locale });
  return null;
}
