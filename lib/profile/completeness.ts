/**
 * Profile-completeness calc — ONE shared rule for the whole app (2026-08-10 product decision:
 * "уніфіковуємо, щоб було всюди однаково"). Previously this lived in
 * `lib/mindsetter-onboarding/completeness.ts` and counted a different set of sections than the
 * cabinet's "My Profile" tab shows, so the same account would see two different percentages
 * depending on which screen it was standing on. That module is gone; both callers
 * (`/mindsetter-onboarding/shine`, `/dashboard/profile`) now go through this one.
 *
 * The section list IS the cabinet's card list (Figma `610:4227` Mindsetter / `708:9070` Member),
 * in the exact order those cards are rendered — which also makes it the ordering the header's
 * "Edit" button walks to find the first unfilled section.
 *
 * Two deliberate differences from the old onboarding-only calc, both resolved with the user:
 *   - `hero` + `socialLinks` are now counted (they weren't before — the old calc only knew about
 *     `mindsetter_profiles`), and a Member's profile consists of exactly those two.
 *   - "Personal session" (`session_settings`) is NOT a section here: in the cabinet it's its own
 *     top-level tab ("Sessions Setup"), not a card under My Profile. `philosophy` DID join the
 *     list on 2026-08-14 — it had been held back while product decided whether the block survived
 *     at all; it counts as an optional section like Numbers or Wins.
 *
 * Pure function, no Supabase import — callers fetch with whichever client fits their context and
 * pass plain data in (same convention as `lib/auth/permissions.ts`).
 */
import type { Json } from '@/lib/supabase/types.gen';

export type CompletenessTier = 'basic' | 'growing' | 'pro';

/** Stable key per section — also the i18n key suffix under `dashboard.profile.sections.*`. */
export type ProfileSectionKey =
  | 'hero'
  | 'socialLinks'
  | 'roles'
  | 'superpowers'
  | 'helpWith'
  | 'promoVideo'
  | 'reelLife'
  | 'numbers'
  | 'wins'
  | 'myWay'
  | 'fckups'
  | 'philosophy'
  | 'videoBlog';

export type ProfileSection = {
  key: ProfileSectionKey;
  /** Locale-less href of this section's editor route (the next-intl `Link` adds the prefix). */
  href: string;
  filled: boolean;
  /** Optional sections still count toward the percentage and are still walked by the header's
   * "Edit" button (2026-08-10 decision) — this flag only drives the "Optional · …" card copy. */
  optional: boolean;
};

export type ProfileCompleteness = {
  sections: ProfileSection[];
  filledCount: number;
  totalCount: number;
  percent: number;
  tier: CompletenessTier;
  /**
   * First unfilled section in card order, or `null` at 100%. Powers the cabinet header's "Edit"
   * button, which is hidden entirely once this is `null` (product decision: the button exists to
   * point at remaining work, so at 100% there is nothing for it to point at).
   */
  nextUnfilled: ProfileSection | null;
};

/** The `profiles` columns this calc reads. camelCase mirrors the snake_case columns 1:1. */
export type ProfileSnapshot = {
  fullName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  cityGeonameId: number | null;
  languages: string[] | null;
  bio: string | null;
  company: string | null;
  role: string | null;
  industry: string | null;
  socials: Json | null;
};

/** The `mindsetter_profiles` columns this calc reads. `null` for a plain Member (no row yet). */
export type MindsetterProfileSnapshot = {
  roles: Json | null;
  superpowers: Json | null;
  helpWith: Json | null;
  promoVideo: Json | null;
  numbers: Json | null;
  reelLife: Json | null;
  wins: Json | null;
  myWay: Json | null;
  fckups: Json | null;
  /** Plain text column, not jsonb — one quote, unlike every other Mindsetter section. */
  philosophy: string | null;
  videoBlog: Json | null;
};

function hasEntries(value: Json | null): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasText(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * `promo_video` / `video_blog` are stored as jsonb OBJECTS (`{ youtube, vimeo, videoPath }`), not
 * arrays — "filled" means at least one of those fields carries a non-empty string.
 */
function hasAnyStringValue(value: Json | null): boolean {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

/**
 * Hero counts as filled only when every field the onboarding schemas mark REQUIRED is present —
 * the union of sign-up (`fullName`/`lastName`), member profile (`lib/validation/member-profile.ts`)
 * and build profile (`lib/validation/build-profile.ts`), which is exactly the field list the
 * cabinet's Hero form renders. `about` and `interests` are deliberately excluded: both are
 * optional in `memberProfileSchema`, so requiring them here would make 100% unreachable for a
 * profile that is, by the app's own rules, complete.
 */
function isHeroFilled(profile: ProfileSnapshot): boolean {
  return (
    hasText(profile.fullName) &&
    hasText(profile.lastName) &&
    hasText(profile.username) &&
    hasText(profile.avatarUrl) &&
    hasText(profile.countryCode) &&
    profile.cityGeonameId != null &&
    (profile.languages?.length ?? 0) > 0 &&
    hasText(profile.bio) &&
    hasText(profile.company) &&
    hasText(profile.role) &&
    hasText(profile.industry)
  );
}

/**
 * Social links count as filled when the ONE mandatory channel is set. That channel is the COMPANY
 * WEBSITE, not LinkedIn (2026-08-05 product decision, encoded in `memberProfileSchema`): a company
 * site is the stronger signal for a member-first community, and demanding LinkedIn excluded people
 * who simply don't use it. The cabinet's Figma frame still marks "LinkedIn URL*" as the required
 * one — that mock predates the decision, and the user confirmed on 2026-08-10 that the newer rule
 * wins.
 */
function isSocialLinksFilled(socials: Json | null): boolean {
  if (socials == null || typeof socials !== 'object' || Array.isArray(socials)) return false;
  const website = (socials as Record<string, unknown>).website;
  return typeof website === 'string' && website.trim().length > 0;
}

// TODO confirm tiers — MVP guess carried over from the onboarding calc (no product-defined
// %→tier legend exists yet, `docs/mindsetter-extended-onboarding.md` E.5). Only the Shine screen
// renders the tier; the cabinet header shows the bare percentage.
const GROWING_THRESHOLD_PERCENT = 50;
const PRO_THRESHOLD_PERCENT = 80;

function tierForPercent(percent: number): CompletenessTier {
  if (percent >= PRO_THRESHOLD_PERCENT) return 'pro';
  if (percent >= GROWING_THRESHOLD_PERCENT) return 'growing';
  return 'basic';
}

const SECTION_BASE_HREF = '/dashboard/profile';

/**
 * Computes the section list + percentage for one account.
 *
 * `accountType` decides the section SET, not permissions: a Member's My Profile is Hero + Social
 * links only, a Mindsetter's is all twelve. Passing `mindsetter: null` for a Mindsetter (no
 * `mindsetter_profiles` row yet) is valid — every Mindsetter-only section simply reads as unfilled.
 */
export function computeProfileCompleteness(
  accountType: 'member' | 'mindsetter',
  profile: ProfileSnapshot,
  mindsetter: MindsetterProfileSnapshot | null,
): ProfileCompleteness {
  const sections: ProfileSection[] = [
    {
      key: 'hero',
      href: `${SECTION_BASE_HREF}/hero`,
      filled: isHeroFilled(profile),
      optional: false,
    },
    {
      key: 'socialLinks',
      href: `${SECTION_BASE_HREF}/social-links`,
      filled: isSocialLinksFilled(profile.socials),
      optional: false,
    },
  ];

  if (accountType === 'mindsetter') {
    sections.push(
      {
        key: 'roles',
        href: `${SECTION_BASE_HREF}/roles`,
        filled: hasEntries(mindsetter?.roles ?? null),
        optional: false,
      },
      {
        key: 'superpowers',
        href: `${SECTION_BASE_HREF}/superpowers`,
        filled: hasEntries(mindsetter?.superpowers ?? null),
        optional: false,
      },
      {
        key: 'helpWith',
        href: `${SECTION_BASE_HREF}/help`,
        filled: hasEntries(mindsetter?.helpWith ?? null),
        optional: false,
      },
      {
        key: 'promoVideo',
        href: `${SECTION_BASE_HREF}/promo-video`,
        filled: hasAnyStringValue(mindsetter?.promoVideo ?? null),
        optional: false,
      },
      {
        key: 'reelLife',
        href: `${SECTION_BASE_HREF}/reel-life`,
        filled: hasEntries(mindsetter?.reelLife ?? null),
        optional: true,
      },
      {
        key: 'numbers',
        href: `${SECTION_BASE_HREF}/numbers`,
        filled: hasEntries(mindsetter?.numbers ?? null),
        optional: true,
      },
      {
        key: 'wins',
        href: `${SECTION_BASE_HREF}/wins`,
        filled: hasEntries(mindsetter?.wins ?? null),
        optional: true,
      },
      {
        key: 'myWay',
        href: `${SECTION_BASE_HREF}/my-way`,
        filled: hasEntries(mindsetter?.myWay ?? null),
        optional: false,
      },
      {
        key: 'fckups',
        href: `${SECTION_BASE_HREF}/fckups`,
        filled: hasEntries(mindsetter?.fckups ?? null),
        optional: true,
      },
      {
        key: 'philosophy',
        href: `${SECTION_BASE_HREF}/philosophy`,
        filled: Boolean(mindsetter?.philosophy?.trim()),
        optional: true,
      },
      {
        key: 'videoBlog',
        href: `${SECTION_BASE_HREF}/video-blog`,
        filled: hasAnyStringValue(mindsetter?.videoBlog ?? null),
        optional: false,
      },
    );
  }

  const filledCount = sections.filter((section) => section.filled).length;
  const totalCount = sections.length;
  const percent = totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);

  return {
    sections,
    filledCount,
    totalCount,
    percent,
    tier: tierForPercent(percent),
    nextUnfilled: sections.find((section) => !section.filled) ?? null,
  };
}
