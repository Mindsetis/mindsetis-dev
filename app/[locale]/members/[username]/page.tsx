import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';

import { MemberProfileView } from '@/components/profile/MemberProfileView';
import { localePath } from '@/i18n/routing';
import { getSessionContext, getStaffRole } from '@/lib/auth/guards';
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
 * power the `.eq` filter, stripped before the row is handed to the caller. `id` and
 * `account_type` are selected for the owner check / Mindsetter redirect below and are likewise
 * stripped before the row reaches `MemberProfileView` (they're not part of `MemberProfile`).
 */
const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, account_type, username, full_name, last_name, avatar_url, bio, about, role, industry, company, country, city, region_name, languages, interests, socials, verification_status, is_blocked',
    )
    .eq('username', username)
    .eq('is_blocked', false)
    .maybeSingle();

  if (!profile) return null;
  const { is_blocked: _isBlocked, ...renderedProfile } = profile;
  return renderedProfile;
});

/**
 * "Is this Mindsetter's own page actually reachable for THIS viewer?" — mirrors
 * `loadMindsetterProfile`'s gate in `/mindsetters/[username]` exactly (public+not-blocked, OR
 * owner, OR staff). Used only to decide whether the redirect below would land on a real page or
 * on that route's `notFound()`; `is_blocked` is already excluded by `getProfileByUsername`'s
 * filter, so only `is_public` has to be read here.
 */
async function isMindsetterPageVisible(
  profileId: string,
  viewerId: string,
  isOwner: boolean,
): Promise<boolean> {
  if (isOwner) return true;
  if (await getStaffRole(viewerId)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from('mindsetter_profiles')
    .select('is_public')
    .eq('id', profileId)
    .maybeSingle();

  return data?.is_public === true;
}

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
 * profile by username. Gated on being SIGNED IN (`/members` is in `middleware.ts`'s
 * `PROTECTED_PREFIXES`, plus this redundant server-side check) but deliberately NOT restricted
 * to the profile's own owner — product decision (stage 1.6): any registered member may view any
 * other non-blocked member's profile. `is_blocked = false` is filtered server-side
 * (`getProfileByUsername`) in addition to being enforced by the `profiles_read` RLS policy.
 *
 * ONE PROFILE PAGE PER ACCOUNT (2026-08-10 product decision, "variant A"): a Mindsetter is an
 * upgraded Member, not a second parallel identity, so this route no longer renders anyone whose
 * `account_type` is `'mindsetter'` — it redirects to `/mindsetters/{username}`, the single
 * canonical page for that account. Previously the two routes were asymmetric (that route already
 * refused to render Members, this one happily rendered Mindsetters), so one person had two
 * profile pages showing overlapping `profiles` data.
 *
 * The redirect is conditional on that page actually being reachable for this viewer
 * (`isMindsetterPageVisible`) rather than unconditional: between finishing the onboarding wizard
 * (which flips `account_type`) and staff verification (which sets `is_public`), a Mindsetter's
 * own page 404s for everyone but its owner and staff. Redirecting unconditionally would make
 * those accounts vanish from the platform for that whole window; instead they keep falling back
 * to this Member view — which is exactly what they still are until published. The OWNER is
 * always redirected (the owner branch of that page's gate never fails), which is the case that
 * motivated this change.
 *
 * Self-view: there is no separate "my profile" route anymore (the old `/dashboard/profile` was
 * removed in the same pass). The owner viewing their own username gets `variant="preview"` here
 * — the "Public view / Edit Profile / Share Profile" top bar — the same way
 * `/mindsetters/[username]` already resolves `preview` vs `public` from the viewer.
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect(
      `${localePath(locale, '/login')}?redirectTo=${encodeURIComponent(`/members/${username}`)}`,
    );
  }

  const t = await getTranslations('profile');

  // Already resolved (and notFound()-ed, if missing) by `generateMetadata` above — `cache()`
  // means this is a no-op re-read, not a second query.
  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const isOwner = session.user.id === profile.id;

  if (
    profile.account_type === 'mindsetter' &&
    (await isMindsetterPageVisible(profile.id, session.user.id, isOwner))
  ) {
    // `redirect()` throws — nothing below runs. Locale-prefixed by hand (this is
    // `next/navigation`'s redirect, not the next-intl one).
    redirect(localePath(locale, `/mindsetters/${username}`));
  }

  // `id`/`account_type` were only needed for the checks above — `MemberProfile` doesn't declare
  // them, so they're dropped rather than spread into the component's props.
  const { id: _id, account_type: _accountType, ...renderedProfile } = profile;

  return (
    <MemberProfileView
      // `region_name` (snake_case, straight from Postgres) is remapped to the component's
      // camelCase `regionName`; everything else already matches column-for-column.
      profile={{ ...renderedProfile, regionName: profile.region_name }}
      variant={isOwner ? 'preview' : 'public'}
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
