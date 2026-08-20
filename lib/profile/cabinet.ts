import 'server-only';

import { cache } from 'react';

import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types.gen';

import {
  computeProfileCompleteness,
  type ProfileCompleteness,
  type ProfileSectionKey,
} from './completeness';

/**
 * Loads everything the cabinet shell needs about the signed-in caller, once per request.
 *
 * `react/cache` memoizes it so the `/dashboard` layout (which renders the header + sidebar) and
 * the page inside it (which renders the section cards) share a single pair of queries instead of
 * each running their own — the same pattern `/members/[username]` uses to share one lookup between
 * `generateMetadata` and the page body.
 *
 * Returns `null` when the caller has no session or no profile row; every caller treats that as
 * "redirect to /login" rather than rendering an empty cabinet.
 */
/**
 * Per-section preview data for the section cards ("3 added · Founder, Entrepreneur, Speaker").
 * `names` is empty for sections whose items have no natural short label (Reel Life photos,
 * F*ckUp stories) — the card then shows the count alone.
 */
export type SectionSummary = { count: number; names: string[] };

export type CabinetProfile = {
  userId: string;
  accountType: 'member' | 'mindsetter';
  username: string;
  fullName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  completeness: ProfileCompleteness;
  /** Keyed by `ProfileSectionKey`; missing keys mean "nothing to summarize" (Hero/Social links,
   * whose cards show a static field list instead — see `ProfileSectionCard`). */
  summaries: Partial<Record<ProfileSectionKey, SectionSummary>>;
};

/**
 * Guard for the Mindsetter-only section editors (`/dashboard/profile/roles` and friends): returns
 * the cabinet context, or `null` when the caller isn't a Mindsetter — every call site turns that
 * into `notFound()`, so a Member poking at those URLs sees the same thing as a nonexistent route
 * rather than an empty form that could never save.
 *
 * This gates VISIBILITY of an editor, not a capability, so `account_type` alone is the right test
 * here — it does not violate the "never gate a right on `account_type` alone" invariant in
 * `lib/auth/permissions.ts`: the underlying writes are still owner-scoped by
 * `mindsetter_profiles_*_own` RLS (`auth.uid() = id`), which is what actually protects the data.
 */
export async function requireMindsetterCabinet(): Promise<CabinetProfile | null> {
  const cabinet = await loadCabinetProfile();
  if (!cabinet || cabinet.accountType !== 'mindsetter') return null;
  return cabinet;
}

/** Reads `title`-bearing jsonb array items (roles, superpowers, help_with) into a name list. */
function summarizeTitled(value: Json | null, titleKey = 'title'): SectionSummary {
  if (!Array.isArray(value)) return { count: 0, names: [] };
  const names = value
    .map((item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)[titleKey]
        : null,
    )
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());
  return { count: value.length, names };
}

/** Counts array items without pulling any labels out (photos, stories, milestones). */
function summarizeCount(value: Json | null): SectionSummary {
  return { count: Array.isArray(value) ? value.length : 0, names: [] };
}

export const loadCabinetProfile = cache(async (): Promise<CabinetProfile | null> => {
  const session = await getSessionContext();
  if (!session?.profile) return null;

  const supabase = await createClient();

  // Explicit column allow-lists, never `select('*')`. `mindsetter_profiles` simply has no row for
  // a Member — `maybeSingle()` returns null, and every Mindsetter-only section then scores as
  // unfilled, which is correct (a Member's section set doesn't include them anyway).
  const [{ data: profile }, { data: mindsetterProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'full_name, last_name, username, avatar_url, country_code, city_geoname_id, languages, bio, company, role, industry, socials',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
    supabase
      .from('mindsetter_profiles')
      .select(
        'roles, superpowers, help_with, promo_video, numbers, reel_life, wins, my_way, fckups, philosophy, video_blog',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
  ]);

  if (!profile) return null;

  const accountType = session.profile.account_type;

  const completeness = computeProfileCompleteness(
    accountType,
    {
      fullName: profile.full_name,
      lastName: profile.last_name,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      countryCode: profile.country_code,
      cityGeonameId: profile.city_geoname_id,
      languages: profile.languages,
      bio: profile.bio,
      company: profile.company,
      role: profile.role,
      industry: profile.industry,
      socials: profile.socials,
    },
    accountType === 'mindsetter'
      ? {
          roles: mindsetterProfile?.roles ?? null,
          superpowers: mindsetterProfile?.superpowers ?? null,
          helpWith: mindsetterProfile?.help_with ?? null,
          promoVideo: mindsetterProfile?.promo_video ?? null,
          numbers: mindsetterProfile?.numbers ?? null,
          reelLife: mindsetterProfile?.reel_life ?? null,
          wins: mindsetterProfile?.wins ?? null,
          myWay: mindsetterProfile?.my_way ?? null,
          fckups: mindsetterProfile?.fckups ?? null,
          philosophy: mindsetterProfile?.philosophy ?? null,
          videoBlog: mindsetterProfile?.video_blog ?? null,
        }
      : null,
  );

  const summaries: Partial<Record<ProfileSectionKey, SectionSummary>> =
    accountType === 'mindsetter'
      ? {
          roles: summarizeTitled(mindsetterProfile?.roles ?? null),
          superpowers: summarizeTitled(mindsetterProfile?.superpowers ?? null),
          helpWith: summarizeTitled(mindsetterProfile?.help_with ?? null),
          reelLife: summarizeCount(mindsetterProfile?.reel_life ?? null),
          numbers: summarizeTitled(mindsetterProfile?.numbers ?? null, 'label'),
          wins: summarizeTitled(mindsetterProfile?.wins ?? null, 'win'),
          myWay: summarizeTitled(mindsetterProfile?.my_way ?? null, 'project'),
          fckups: summarizeCount(mindsetterProfile?.fckups ?? null),
        }
      : {};

  return {
    userId: session.user.id,
    accountType,
    username: profile.username,
    fullName: profile.full_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url,
    isVerified: session.profile.verification_status === 'verified',
    completeness,
    summaries,
  };
});
