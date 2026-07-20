import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';

import { MemberProfileView } from '@/components/profile/MemberProfileView';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

type PublicProfilePageProps = {
  params: Promise<{ locale: string; username: string }>;
};

// Forces per-request dynamic rendering — this route is already effectively dynamic (reads
// cookies via the Supabase server client, live per-username DB lookup), so this is just an
// explicit marker, not a fix on its own (see `getProfileByUsername` below for the actual
// notFound()-status fix).
export const dynamic = 'force-dynamic';

/**
 * Fetches the target profile once per request (`react/cache`-memoized), shared between
 * `generateMetadata` and the page component so the existence check only runs a single DB
 * query. Explicit column allow-list, never `select('*')` — `is_blocked` is selected only to
 * power the `.eq` filter, stripped before the row is handed to the caller.
 */
const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'username, full_name, last_name, avatar_url, bio, about, role, industry, company, country, city, languages, interests, socials, verification_status, is_blocked',
    )
    .eq('username', username)
    .eq('is_blocked', false)
    .maybeSingle();

  if (!profile) return null;
  const { is_blocked: _isBlocked, ...renderedProfile } = profile;
  return renderedProfile;
});

/**
 * KNOWN LIMITATION (stage 1.6, confirmed live, not fixed by this function alone): the
 * not-found UI for a nonexistent username renders correctly, but the HTTP response status
 * stays 200 instead of 404. Root cause, empirically confirmed by temporarily removing
 * `app/[locale]/loading.tsx` and re-testing (status flips to a correct 404 with it absent):
 * that ambient loading boundary wraps every route under `[locale]`, and Next.js flushes its
 * 200 shell before this async page's `notFound()` can influence the response status —
 * `generateMetadata` running the same check earlier does NOT prevent this in Next 15.5.20,
 * despite resolving before the page component. Removing/restructuring the app-wide
 * `loading.tsx` would fix this cleanly but is out of scope for this stage (broad blast
 * radius across every other route's loading UX) — tracked as a ROADMAP follow-up. Kept as a
 * `generateMetadata` export anyway (rather than reverted) since it's harmless, correctly
 * short-circuits `<head>` work for a 404 page, and will fully resolve the status-code issue
 * for free once the loading.tsx architecture is revisited.
 */
export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();
  return {};
}

/**
 * "Member Profile" view (Figma `383:4667`) — how another registered member sees a member's
 * profile by username. Gated on being SIGNED IN (`/member` is in `middleware.ts`'s
 * `PROTECTED_PREFIXES`, plus this redundant server-side check) but deliberately NOT restricted
 * to the profile's own owner, nor to verified/Mindsetter accounts — product decision (stage
 * 1.6): any registered member may view any other non-blocked member's profile; this is a
 * distinct feature from the future spec-§5.4 "public Mindsetter profile" page (which is
 * unauthenticated-public and gated on `mindsetter_profiles.is_public`) and does not replace it.
 * `is_blocked = false` is filtered server-side (`getProfileByUsername`) in addition to being
 * enforced by the `profiles_read` RLS policy.
 *
 * Renders the same `MemberProfileView` as the self-view `/dashboard/profile` route
 * (`variant="public"` here vs `"preview"` there) — see that page's doc comment.
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect(`/${locale}/login?redirectTo=${encodeURIComponent(`/member/${username}`)}`);
  }

  const t = await getTranslations('profile');

  // Already resolved (and notFound()-ed, if missing) by `generateMetadata` above — `cache()`
  // means this is a no-op re-read, not a second query.
  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  return (
    <MemberProfileView
      profile={profile}
      variant="public"
      labels={{
        bannerHighlight: t('banner.highlight'),
        bannerRest: t('banner.rest'),
        editProfile: t('editProfile'),
        shareProfile: t('shareProfile'),
        verified: t('verified'),
        inviteToEvent: t('inviteToEvent'),
        aboutEyebrow: t('aboutEyebrow'),
        beyondBusinessEyebrow: t('beyondBusinessEyebrow'),
        beyondBusinessHeading: t('beyondBusinessHeading'),
        website: t('website'),
      }}
    />
  );
}
