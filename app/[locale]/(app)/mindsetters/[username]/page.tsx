import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';

import { MindsetterProfileView } from '@/components/profile/MindsetterProfileView';
import { getSessionContext, getStaffRole } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import type { Expertise } from '@/lib/validation/mindsetter';

type MindsetterProfilePageProps = {
  params: Promise<{ locale: string; username: string }>;
};

// Forces per-request dynamic rendering — mirrors `/members/[username]` (cookies-based Supabase
// client, live per-username + per-viewer lookup, RLS-dependent visibility gate below).
export const dynamic = 'force-dynamic';

/** How long a resolved signed URL stays valid on this page — long enough for one view/edit
 * session; a fresh batch is minted on every page load. Mirrors the onboarding blocks' own TTL
 * (`blocks/reel-life/page.tsx`, `blocks/promo/page.tsx`). */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Fetches the target profile + its `mindsetter_profiles`/`session_settings` rows, applies the
 * visibility gate, and resolves the `preview`/`public` variant — memoized per-request
 * (`react/cache`) so `generateMetadata` and the page component share one round-trip of queries.
 * Explicit column allow-lists everywhere, never `select('*')`.
 *
 * Visibility gate (defense-in-depth on top of RLS — see the migrations' own policies for the
 * DB-level enforcement of the same rule): visible when `profiles.account_type = 'mindsetter'`
 * AND `mindsetter_profiles.is_public = true` AND `profiles.is_blocked = false` (the "published
 * after verification" public branch — `is_public` is staff-only-settable, guard-triggered in
 * `20260701100100_profiles.sql`, so this implicitly requires staff verification already), OR
 * the viewer is the profile owner (any state — sees the `preview` variant, the same viewer-derived
 * banner `/members/[username]` now resolves too), OR the viewer is staff. Everyone else — or a
 * nonexistent username, or a profile that isn't (yet) a Mindsetter at all — resolves to `null` →
 * `notFound()`.
 *
 * Since the 2026-08-10 "one profile page per account" pass this is the CANONICAL page for every
 * `account_type = 'mindsetter'` account: `/members/[username]` redirects here rather than
 * rendering a second, Member-shaped page for the same person (see that route's doc comment for
 * the one deliberate exception — a finished-but-unpublished Mindsetter, invisible here to
 * non-owners, still falls back to the Member view there).
 *
 * `mindsetter_profiles`/`session_settings` are fetched via the regular request-scoped client
 * (RLS already encodes this exact gate for them — `mindsetter_profiles_read` /
 * `session_settings_read_public`), so a row simply not coming back for a non-owner/non-staff
 * viewer of a non-public profile is expected, not an error.
 */
const loadMindsetterProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, username, full_name, last_name, avatar_url, bio, tagline, company, role, industry, country, city, region_name, languages, interests, socials, verification_status, account_type, is_blocked',
    )
    .eq('username', username)
    .maybeSingle();

  // Not a Mindsetter at all (never onboarded, or still a plain Member) — this route never
  // renders a Member's profile (that's `/members/[username]`), regardless of viewer.
  if (!profile || profile.account_type !== 'mindsetter') return null;

  const session = await getSessionContext();
  const isOwner = session?.user.id === profile.id;
  const isStaff = !isOwner && session ? Boolean(await getStaffRole(session.user.id)) : false;

  const [{ data: mindsetterProfile }, { data: sessionSettings }] = await Promise.all([
    supabase
      .from('mindsetter_profiles')
      .select(
        'roles, superpowers, promo_video, numbers, help_with, wins, my_way, fckups, philosophy, philosophy_author, reel_life, video_blog, is_public',
      )
      .eq('id', profile.id)
      .maybeSingle(),
    supabase
      .from('session_settings')
      .select('session_type, price_cents, currency, topics')
      .eq('mindsetter_id', profile.id)
      .maybeSingle(),
  ]);

  const isPublicVisible = mindsetterProfile?.is_public === true && !profile.is_blocked;
  if (!isPublicVisible && !isOwner && !isStaff) return null;

  return {
    profile,
    mindsetterProfile,
    sessionSettings,
    variant: isOwner ? ('preview' as const) : ('public' as const),
  };
});

/**
 * Resolves already-uploaded private-Storage paths (`reel-life` bucket / `promo-video` bucket) to
 * short-lived signed URLs for display. Uses the SERVICE-ROLE client (server-only,
 * `lib/supabase/service.ts`) rather than the regular request-scoped client — deliberately, and
 * only for this read:
 *
 * Both buckets' Storage RLS policies (`20260718172922_mindsetter_onboarding_review_fixes.sql`,
 * `20260719132834_promo_video_storage_bucket.sql`) only grant `select` `to authenticated` scoped
 * to the OWNER'S OWN folder (`storage.foldername(name)[1] = auth.uid()`) — there is no
 * public-read branch, because these buckets were built for the onboarding wizard, where the
 * caller only ever reads their own photos/video back. This page needs to display a DIFFERENT
 * (verified, `is_public`) Mindsetter's photos/video to anonymous/other-user visitors, which the
 * regular anon/session client cannot do at all under the current policies — `createSignedUrl(s)`
 * itself requires Storage `select` visibility, so it fails closed for every non-owner viewer.
 *
 * Per this stage's explicit scope ("do NOT create a migration"), the fix here is a server-only
 * service-role read rather than a new Storage policy: this function is only ever called AFTER
 * `loadMindsetterProfile`'s visibility gate has already passed (public/owner/staff), so it never
 * leaks a signed URL for a profile the current viewer isn't allowed to see. Flagged as a
 * candidate follow-up: a dedicated public-read Storage policy (gated the same way
 * `session_settings_read_public` gates on verified+mindsetter) would let this go back through
 * the regular client instead.
 */
async function resolveSignedUrls(
  bucket: 'reel-life' | 'promo-video',
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error(`[mindsetters/[username]] ${bucket} signed URLs failed:`, error);
    return new Map();
  }

  const map = new Map<string, string>();
  paths.forEach((path, index) => {
    const url = data[index]?.signedUrl;
    if (url) map.set(path, url);
  });
  return map;
}

/**
 * KNOWN LIMITATION (carried over from `/members/[username]`, stage 1.6 — not a new issue, same
 * deferred fix applies): `notFound()` for a nonexistent/non-visible username renders the correct
 * not-found UI but returns HTTP 200 instead of 404, because the app-wide `app/[locale]/
 * loading.tsx` streaming boundary flushes the response shell before this async page's
 * `notFound()` can influence the status code. See that route's own doc comment for the full
 * root-cause writeup; fixing it requires restructuring that ambient loading boundary across the
 * whole app (broad blast radius), out of scope for this stage.
 */
export async function generateMetadata({ params }: MindsetterProfilePageProps) {
  const { username } = await params;
  const data = await loadMindsetterProfile(username);
  if (!data) notFound();
  const { full_name: fullName, last_name: lastName } = data.profile;
  return { title: [fullName, lastName].filter(Boolean).join(' ') || `@${username}` };
}

/**
 * Public "Mindsetter Profile" page (spec §5.4, Figma `327:1080`/`383:2070` desktop "Full
 * Profile" / `187:4294` mobile) — see `MindsetterProfileView.tsx` for the full section-by-section
 * doc comment. Unlike `/members/[username]` (auth-gated), this route is spec-mandated
 * UNAUTHENTICATED-PUBLIC — deliberately NOT added to `middleware.ts`'s `PROTECTED_PREFIXES`.
 * Visibility is enforced by `loadMindsetterProfile` above (RLS-backed) rather than a login
 * redirect.
 */
export default async function MindsetterProfilePage({ params }: MindsetterProfilePageProps) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('mindsetterProfile');

  // Already resolved (and notFound()-ed, if missing/not visible) by `generateMetadata` above —
  // `cache()` means this is a no-op re-read, not a second round-trip of queries.
  const data = await loadMindsetterProfile(username);
  if (!data) {
    notFound();
  }

  const { profile, mindsetterProfile, sessionSettings, variant } = data;

  const roles = Array.isArray(mindsetterProfile?.roles) ? mindsetterProfile.roles : [];
  const superpowers = Array.isArray(mindsetterProfile?.superpowers)
    ? mindsetterProfile.superpowers
    : [];
  const numbers = Array.isArray(mindsetterProfile?.numbers) ? mindsetterProfile.numbers : [];
  const helpWith = Array.isArray(mindsetterProfile?.help_with) ? mindsetterProfile.help_with : [];
  const wins = Array.isArray(mindsetterProfile?.wins) ? mindsetterProfile.wins : [];
  const myWay = Array.isArray(mindsetterProfile?.my_way) ? mindsetterProfile.my_way : [];
  const fckups = Array.isArray(mindsetterProfile?.fckups) ? mindsetterProfile.fckups : [];
  const promoVideo = (mindsetterProfile?.promo_video ?? null) as {
    youtube?: string | null;
    vimeo?: string | null;
    videoPath?: string | null;
  } | null;
  const videoBlog = (mindsetterProfile?.video_blog ?? null) as {
    youtube?: string | null;
    vimeo?: string | null;
    videoPath?: string | null;
  } | null;
  const reelLifePaths = (
    Array.isArray(mindsetterProfile?.reel_life) ? mindsetterProfile.reel_life : []
  ).filter((path): path is string => typeof path === 'string' && path.length > 0);
  const promoVideoPath = promoVideo?.videoPath?.trim() || null;
  const videoBlogPath = videoBlog?.videoPath?.trim() || null;

  const [reelLifeUrlMap, promoVideoUrlMap, videoBlogUrlMap] = await Promise.all([
    resolveSignedUrls('reel-life', reelLifePaths),
    resolveSignedUrls('promo-video', promoVideoPath ? [promoVideoPath] : []),
    // `video_blog` reuses the `promo-video` bucket (same owner-scoped Storage policies already
    // grant this) rather than adding a dedicated bucket + migration for what is, storage-wise,
    // the same "one private video file per Mindsetter" shape as promo_video's own direct upload.
    resolveSignedUrls('promo-video', videoBlogPath ? [videoBlogPath] : []),
  ]);
  const reelLifePhotoUrls = reelLifePaths
    .map((path) => reelLifeUrlMap.get(path))
    .filter((url): url is string => Boolean(url));
  const promoVideoUrl = promoVideoPath ? (promoVideoUrlMap.get(promoVideoPath) ?? null) : null;
  const videoBlogUrl = videoBlogPath ? (videoBlogUrlMap.get(videoBlogPath) ?? null) : null;

  return (
    <MindsetterProfileView
      variant={variant}
      t={t}
      profile={{
        username: profile.username,
        full_name: profile.full_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        tagline: profile.tagline,
        company: profile.company,
        role: profile.role,
        industry: profile.industry,
        country: profile.country,
        city: profile.city,
        regionName: profile.region_name,
        languages: profile.languages,
        interests: profile.interests,
        socials: profile.socials,
        verification_status: profile.verification_status,
        roles,
        superpowers,
        promoVideo,
        numbers,
        helpWith,
        wins,
        myWay,
        fckups,
        philosophy: mindsetterProfile?.philosophy ?? null,
        philosophyAuthor: mindsetterProfile?.philosophy_author ?? null,
        videoBlog,
        sessionType: sessionSettings?.session_type ?? null,
        priceCents: sessionSettings?.price_cents ?? null,
        currency: sessionSettings?.currency ?? null,
        // "Topics I'm expert" pills come from the HELP step's card titles, not from
        // `session_settings.topics` (2026-08-05 product decision). Those two diverged in
        // meaning: session topics are what a booker can pick when scheduling, and include
        // ad-hoc "+ Add custom" entries that were never meant to describe the Mindsetter's
        // expertise publicly. The Help cards are the curated list, so the profile shows those.
        topics: helpWith
          .map((item) => (item as Expertise).title)
          .filter((title): title is string => Boolean(title?.trim())),
        reelLifePhotoUrls,
        promoVideoUrl,
        videoBlogUrl,
      }}
    />
  );
}
