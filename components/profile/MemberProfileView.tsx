import {
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  Pen,
  Share2,
  User,
  UserPlus,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import type { SocialsJson } from '@/app/[locale]/member-profile/page';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons';
import { Button } from '@/components/ui/button';
import { INTEREST_CATEGORIES } from '@/lib/constants/interest-categories';
import { INTERESTS } from '@/lib/constants/interests';
import { cn } from '@/lib/utils';

import styles from './MemberProfileView.module.css';

/**
 * A member's profile, as rendered by this screen. Hand-typed rather than imported from
 * `lib/supabase/types.gen.ts` — that generated file is stale (missing `role`/`industry`,
 * added by `20260714101121_profiles_step3_build_fields.sql`) and regenerating it
 * (`npm run db:types`) is out of scope for this stage. Both call sites (`/dashboard/profile`,
 * `/profile/[username]`) select this exact column allow-list, never `select('*')`.
 */
export interface MemberProfile {
  username: string;
  full_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about: string | null;
  role: string | null;
  industry: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  languages: string[] | null;
  interests: string[] | null;
  socials: SocialsJson | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
}

/** Translated copy, resolved server-side by each page via `getTranslations('profile')`. */
export interface MemberProfileViewLabels {
  bannerHighlight: string;
  bannerRest: string;
  editProfile: string;
  shareProfile: string;
  verified: string;
  inviteToEvent: string;
  aboutEyebrow: string;
  beyondBusinessEyebrow: string;
  beyondBusinessHeading: string;
  website: string;
}

export interface MemberProfileViewProps {
  profile: MemberProfile;
  /** `preview` = owner previewing their own profile (adds the top banner + static CTAs). */
  variant: 'preview' | 'public';
  labels: MemberProfileViewLabels;
}

/**
 * Social keys with a matching brand icon. `lucide-react` doesn't ship brand marks (dropped
 * from the package), so this reuses the Figma-sourced brand SVGs already built for the
 * Footer (`components/icons/social-icons.tsx`) rather than adding a new icon dependency;
 * `tiktok`/`threads` have no icon there either, so both fall back to a generic lucide `Link`.
 */
const SOCIAL_ICON_MAP: Record<
  Exclude<keyof SocialsJson, 'website'>,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: LinkIcon,
  threads: LinkIcon,
  youtube: YoutubeIcon,
};

const SOCIAL_KEYS = Object.keys(SOCIAL_ICON_MAP) as (keyof typeof SOCIAL_ICON_MAP)[];

/**
 * Defense-in-depth alongside the write-time `isHttpUrl` refine in
 * `lib/validation/member-profile.ts`: this page renders `profiles.socials` values as real
 * `<a href>`s on the PUBLIC, unauthenticated `/profile/[username]` route, so a
 * `javascript:`/`data:` value that somehow reached the DB (e.g. written before the write-time
 * fix shipped) must never be turned into a clickable link here either (security-auditor
 * finding, stage 1.6).
 */
function isSafeHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

interface InterestGroup {
  category: (typeof INTEREST_CATEGORIES)[number];
  items: { value: string; label: string; emoji: string }[];
}

/**
 * Groups the profile's selected interest slugs by the fixed `INTEREST_CATEGORIES` order,
 * looking each slug up in the code-defined `INTERESTS` catalog (`lib/constants/interests.ts`)
 * — categories with zero matches are dropped rather than rendered as empty cards. A slug no
 * longer present in the catalog (e.g. renamed/removed after this profile saved it) simply
 * doesn't match anything and is silently skipped, same defensive precedent as
 * `member-profile/page.tsx`'s `initialInterestIds` filter.
 */
function groupInterestsByCategory(interests: string[] | null): InterestGroup[] {
  if (!interests || interests.length === 0) return [];
  const selected = new Set(interests);

  return INTEREST_CATEGORIES.map((category) => ({
    category,
    items: INTERESTS.filter(
      (interest) => interest.category === category && selected.has(interest.value),
    ),
  })).filter((group) => group.items.length > 0);
}

/** `{full_name} {last_name}`, gracefully falling back to whichever half exists, then username. */
function resolveDisplayName(profile: MemberProfile): string {
  const parts = [profile.full_name, profile.last_name].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join(' ') : profile.username;
}

/** "{city}, {country}", or whichever one exists alone; `null` when neither is set. */
function resolveLocationText(profile: MemberProfile): string | null {
  if (profile.city && profile.country) return `${profile.city}, ${profile.country}`;
  return profile.city ?? profile.country ?? null;
}

/**
 * Shared presentational component for the "Member Profile" view — the two call sites
 * (`app/[locale]/dashboard/profile/page.tsx` self-view, `app/[locale]/profile/[username]/
 * page.tsx` public view) are structurally IDENTICAL below the banner (confirmed via a direct
 * Figma node-diff of `401:6375` vs `383:4667`), so this stays a single Server Component
 * (no client interactivity needed — Edit Profile / Share Profile / Invite to event are all
 * static per this stage's scope) taking a `variant` flag rather than being duplicated twice.
 */
export function MemberProfileView({ profile, variant, labels }: MemberProfileViewProps) {
  const displayName = resolveDisplayName(profile);
  const locationText = resolveLocationText(profile);
  const languageText =
    profile.languages && profile.languages.length > 0
      ? profile.languages.join(' / ').toUpperCase()
      : null;
  const metaPills = [profile.industry, profile.company, profile.role].filter(
    (value): value is string => Boolean(value),
  );
  const interestGroups = groupInterestsByCategory(profile.interests);
  const socials = profile.socials;
  const socialEntries = SOCIAL_KEYS.filter((key) => isSafeHttpUrl(socials?.[key])).map((key) => ({
    key,
    href: socials?.[key] as string,
    Icon: SOCIAL_ICON_MAP[key],
  }));
  const websiteHref = isSafeHttpUrl(socials?.website) ? socials?.website : null;

  return (
    <div className={styles.section}>
      {variant === 'preview' && (
        <div
          className={cn(
            styles.banner,
            'flex flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-0 lg:px-[70px]',
          )}
        >
          <div className="flex items-center gap-2">
            <Eye className={cn('size-5 shrink-0', styles.bannerHighlight)} aria-hidden="true" />
            <p className={cn('text-tiny', styles.bannerText)}>
              <span className={cn('font-bold', styles.bannerHighlight)}>
                {labels.bannerHighlight}
              </span>{' '}
              {labels.bannerRest}
            </p>
          </div>

          <div className="flex flex-wrap gap-5">
            {/* Static per this stage's scope — no `onClick`/`href`. */}
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'h-14 w-[171px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold',
                styles.editButton,
              )}
            >
              <Pen className="size-4" aria-hidden="true" />
              {labels.editProfile}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'h-14 w-[171px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold',
                styles.shareButton,
              )}
            >
              <Share2 className="size-4" aria-hidden="true" />
              {labels.shareProfile}
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1300px] px-4 py-10 sm:px-6 md:py-16 lg:px-[70px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex w-full flex-col gap-6 lg:max-w-[464px]">
            {(profile.verification_status === 'verified' || profile.username) && (
              <div className="flex flex-wrap items-center gap-2">
                {profile.verification_status === 'verified' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-tiny',
                      styles.pillVerified,
                    )}
                  >
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    {labels.verified}
                  </span>
                )}
                {profile.username && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-2 text-tiny',
                      styles.pillHandle,
                    )}
                  >
                    @{profile.username}
                  </span>
                )}
              </div>
            )}

            <h1 className={cn('font-display', styles.heroName)}>{displayName}</h1>

            {profile.bio && <p className="text-body">{profile.bio}</p>}

            {metaPills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metaPills.map((label) => (
                  <span key={label} className={cn('px-3 pt-1.5 pb-2 text-tiny', styles.metaPill)}>
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Static per this stage's scope — no `onClick`/`href`. */}
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'h-14 w-[188px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold',
                styles.inviteButton,
              )}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {labels.inviteToEvent}
            </Button>

            {(locationText || languageText) && (
              <div className="flex flex-col gap-2 text-body">
                {locationText && (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0" aria-hidden="true" />
                    {locationText}
                  </div>
                )}
                {languageText && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                    {languageText}
                  </div>
                )}
              </div>
            )}

            {(socialEntries.length > 0 || websiteHref) && (
              <div className="flex flex-wrap items-center gap-3">
                {socialEntries.map(({ key, Icon, href }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md',
                      styles.socialIconButton,
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                ))}
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-2 text-tiny',
                      styles.websitePill,
                    )}
                  >
                    {'\u{1F517}'} {labels.website}
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:max-w-[608px] lg:flex-1">
            {profile.avatar_url ? (
              // Storage URLs aren't configured under next/image's remotePatterns; a plain
              // <img> matches the existing precedent (AvatarUpload/AvatarImage) for
              // rendering profiles.avatar_url.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className={cn('aspect-[640/624] w-full object-cover', styles.portraitFrame)}
              />
            ) : (
              <div
                className={cn(
                  'flex aspect-[640/624] w-full items-center justify-center',
                  styles.portraitPlaceholder,
                )}
              >
                <User className="size-16 text-black/30" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {profile.about && (
          <div className={cn('mt-16', styles.aboutCard)}>
            <span className={cn('text-tiny font-bold uppercase', styles.eyebrow)}>
              {labels.aboutEyebrow}
            </span>
            <p className="mt-4 text-body whitespace-pre-line">{profile.about}</p>
          </div>
        )}

        {interestGroups.length > 0 && (
          <div className="mt-16 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className={cn('text-tiny font-bold uppercase', styles.eyebrow)}>
                {labels.beyondBusinessEyebrow}
              </span>
              <h2 className="font-display text-h1 text-black md:text-h3">
                {labels.beyondBusinessHeading}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {interestGroups.map(({ category, items }) => (
                <div key={category} className={styles.interestCard}>
                  <h3 className="font-display text-l leading-none font-normal text-black">
                    {category}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item.value}
                        className={cn('rounded-full px-3 py-3 text-tiny', styles.interestPill)}
                      >
                        {item.emoji} {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
