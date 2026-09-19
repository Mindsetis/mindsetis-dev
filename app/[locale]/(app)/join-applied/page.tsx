import { setRequestLocale } from 'next-intl/server';

import { AlreadyAppliedModal } from '@/components/auth/AlreadyAppliedModal';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getCurrentUser } from '@/lib/auth/guards';
import { CABINET_PATH, resolveOnboardingRedirect } from '@/lib/auth/onboarding-redirect';

type JoinAppliedPageProps = {
  params: Promise<{ locale: string }>;
};

// Most visits to this route redirect away before rendering (see the doc comment below) and
// never send this title to a browser tab at all — set only for the one branch that actually
// renders the modal below. `metaTitle` (not `title`) deliberately: `title` now interpolates
// `{email}`, which `pageTitle()` can't supply (per its own doc comment) — this is the same
// "plain string next to the rich one" pattern used elsewhere for a `<title>` tag.
export async function generateMetadata({ params }: JoinAppliedPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth', 'alreadyApplied.metaTitle');
}

/**
 * `/join-applied` — the Release-1 A5 fallback for a signed-in visitor whose Member profile is
 * already complete and who opened `/join` (the "Apply to Join" marketing/email-capture funnel)
 * directly, most likely an old bookmark or a shared link. Shows a single dialog with the
 * client's own copy: "you've already applied and logged in as [email]", a way back into the
 * existing profile, and a note that duplicate accounts get removed on review.
 *
 * REACHED ONLY VIA `/continue` — never linked to directly
 *   `middleware.ts` bounces a signed-in visitor off `/join` to `/continue?from=join`, and
 *   `/continue` sends a COMPLETE profile on here (see both files' doc comments). This keeps
 *   `/join` itself cheap and static for the anonymous visitors it exists for — no searchParams,
 *   no DB read added to that page.
 *
 * WHY THIS PAGE RE-CHECKS COMPLETENESS ITSELF (no third definition of "complete")
 *   `/join-applied` is still a guessable URL, and the task is explicit that a URL flag alone
 *   must never be trusted for "this profile is complete" — the state has to be confirmed on the
 *   server on THIS request, not inherited from whatever `/continue` believed a moment earlier.
 *   Rather than duplicate the threshold, this calls the exact same `resolveOnboardingRedirect()`
 *   that `/continue` and every other entry point in the app already uses (`CABINET_PATH` is its
 *   one existing definition of "nothing left to finish" — see `lib/auth/onboarding-redirect.ts`).
 *   Anyone it does NOT resolve to `CABINET_PATH` — an unfinished Member wizard, an in-progress
 *   Mindsetter upgrade, even an unconfirmed email — is sent back to `/continue`, which forwards
 *   them to their real next step. That also means this route can never show the modal to the
 *   wrong person, no matter how it was reached.
 *
 * NO LOOP BACK TO `/join`
 *   Neither branch of this page ever redirects to `/join` or `/continue?from=join` again, so
 *   there is no cycle: unauthenticated → `/login` (dead end, terminal); incomplete → `/continue`
 *   → forwarded to a wizard step or the cabinet (also terminal, since that step isn't `/join`);
 *   complete → renders the modal in place (no further redirect at all).
 */
export const dynamic = 'force-dynamic';

export default async function JoinAppliedPage({ params }: JoinAppliedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const destination = await resolveOnboardingRedirect();
  if (destination !== CABINET_PATH) {
    redirect({ href: '/continue', locale });
    return null;
  }

  const user = await getCurrentUser();
  if (!user) {
    // Can't happen in practice — `/join-applied` is in `middleware.ts`'s `PROTECTED_PREFIXES`,
    // so an anonymous caller never reaches this render — but keeps the page self-contained
    // rather than trusting the middleware alone for the email this modal displays.
    redirect({ href: '/login', locale });
    return null;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-16">
      <AlreadyAppliedModal email={user.email ?? ''} />
    </div>
  );
}
