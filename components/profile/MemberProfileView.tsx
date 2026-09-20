import { CheckCircle2, Share2, User } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import type { SocialsJson } from '@/app/[locale]/(app)/member-profile/page';
import {
  BallPenFillIcon,
  ChatAiFillIcon,
  LanguageBubbleIcon,
  LocationPinIcon,
  PublicViewEyeIcon,
  QuillPenAiFillIcon,
  UserAddFillIcon,
} from '@/components/icons/profile-meta-icons';
import {
  FacebookGlyphIcon,
  InstagramIcon,
  LinkedinIcon,
  ThreadsIcon,
  TiktokIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { INTEREST_CATEGORIES } from '@/lib/constants/interest-categories';
import { INTERESTS } from '@/lib/constants/interests';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';
import { regionAddsInformation } from '@/lib/geo/region-label';
import { cn } from '@/lib/utils';

import styles from './MemberProfileView.module.css';

/**
 * A member's profile, as rendered by this screen. Hand-typed rather than imported from
 * `lib/supabase/types.gen.ts` — that generated file's shape doesn't match this screen's exact
 * column allow-list 1:1, and regenerating call sites around it is out of scope here. The single
 * call site (`/members/[username]`) selects this exact allow-list, never `select('*')`.
 *
 * `industry` (Release-1 E5, 2026-09-20 product decision) no longer appears on the public
 * profile — it was shown as one of the "meta pills" alongside company/role, but the field is
 * now multi-select (`profiles.industries` + `profiles.industry_custom`) and meant to power
 * search filters, not the public header. `company`/`role` still render there.
 */
export interface MemberProfile {
  username: string;
  full_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about: string | null;
  role: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  /** Subdivision (US state, oblast…). Shown only when it disambiguates — see resolveLocationText. */
  regionName: string | null;
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
 * from the package), so this pulls Figma-sourced brand SVGs from `components/icons/
 * social-icons.tsx` instead of adding a new icon dependency. `linkedin`/`instagram`/`youtube`
 * reuse the same marks already built for the Footer — a node-diff against this screen's own
 * "Follow" row (Figma `401:6413` desktop / `401:8255` mobile) confirms those three are the
 * same brand logos, just scaled down to fit the smaller badge here. `facebook` does NOT reuse
 * the Footer's `FacebookIcon` (that's the standalone circular logo, built for the Footer's
 * unboxed icon list) — this screen's Facebook mark is a bare "f" glyph with no circle baked
 * in (the `.socialIconButton` badge already supplies the light-gray box), so it uses
 * `FacebookGlyphIcon` instead. `tiktok`/`threads` previously had no matching icon anywhere in
 * this file and both fell back to the same generic lucide `Link` glyph — which is what the
 * "duplicated icon" report was about — now wired to the real `TiktokIcon`/`ThreadsIcon` marks
 * sourced from that same "Follow" row.
 */
/**
 * Exported (stage 1.10) so `MindsetterProfileView.tsx` can reuse this exact icon map/guard/
 * grouping logic for its own hero social row and "Beyond Business" section, which are
 * structurally identical to this file's — see that component's own doc comment for the
 * cross-reference.
 */
export const SOCIAL_ICON_MAP: Record<
  Exclude<keyof SocialsJson, 'website'>,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  facebook: FacebookGlyphIcon,
  tiktok: TiktokIcon,
  threads: ThreadsIcon,
  youtube: YoutubeIcon,
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_ICON_MAP) as (keyof typeof SOCIAL_ICON_MAP)[];

const LANGUAGE_CODE_BY_VALUE = new Map<string, string>(
  SUPPORTED_LANGUAGES.map((language) => [language.value, language.code]),
);

/**
 * Defense-in-depth alongside the write-time `isHttpUrl` refine in
 * `lib/validation/member-profile.ts`: this page renders `profiles.socials` values as real
 * `<a href>`s on the PUBLIC, unauthenticated `/members/[username]` route, so a
 * `javascript:`/`data:` value that somehow reached the DB (e.g. written before the write-time
 * fix shipped) must never be turned into a clickable link here either (security-auditor
 * finding, stage 1.6).
 */
export function isSafeHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export interface InterestGroup {
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
export function groupInterestsByCategory(interests: string[] | null): InterestGroup[] {
  if (!interests || interests.length === 0) return [];
  const selected = new Set(interests);

  return INTEREST_CATEGORIES.map((category) => ({
    category,
    items: INTERESTS.filter(
      (interest) => interest.category === category && selected.has(interest.value),
    ),
  })).filter((group) => group.items.length > 0);
}

/**
 * `{full_name} {last_name}`, gracefully falling back to whichever half exists, then username.
 * Exported (stage 1.10) — `MindsetterProfileView.tsx` shares this exact `profiles` name shape.
 */
export function resolveDisplayName(profile: {
  username: string;
  full_name: string | null;
  last_name: string | null;
}): string {
  const parts = [profile.full_name, profile.last_name].filter((part): part is string =>
    Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join(' ') : profile.username;
}

/**
 * "{city}, {region}, {country}" — with the region included ONLY when it disambiguates.
 *
 * The region is what makes a US profile readable: there are around thirty Springfields, so
 * "Springfield, United States" says almost nothing while "Springfield, Illinois, United
 * States" is precise. But most of the world gets no benefit, because subdivisions are named
 * after their capital — "Lviv, Lviv, Ukraine" and "São Paulo, São Paulo, Brazil" read as a
 * duplication bug rather than as detail. `regionAddsInformation` draws that line, and it is
 * the SAME rule the city picker uses for its option labels, so what a member saw when they
 * chose the city is what their profile shows.
 *
 * Falls back gracefully: any missing part is simply dropped, and `null` when nothing is set.
 * A profile saved before the geo picker shipped has `regionName` null and renders exactly as
 * it did before.
 *
 * Exported (stage 1.10) for reuse by `MindsetterProfileView.tsx`.
 */
export function resolveLocationText(profile: {
  city: string | null;
  country: string | null;
  regionName?: string | null;
}): string | null {
  const parts = [
    profile.city,
    profile.city && regionAddsInformation(profile.city, profile.regionName ?? null)
      ? profile.regionName
      : null,
    profile.country,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * "EN / UK" — uppercase ISO 639-1 codes, not full language names. A stored value no longer
 * present in `SUPPORTED_LANGUAGES` (e.g. catalog pruned after this profile saved it) is
 * silently skipped, same defensive precedent as `groupInterestsByCategory`. Exported (stage
 * 1.10) for reuse by `MindsetterProfileView.tsx`.
 */
export function resolveLanguageText(profile: { languages: string[] | null }): string | null {
  if (!profile.languages || profile.languages.length === 0) return null;
  const codes = profile.languages
    .map((value) => LANGUAGE_CODE_BY_VALUE.get(value))
    .filter((code): code is string => Boolean(code))
    .map((code) => code.toUpperCase());
  return codes.length > 0 ? codes.join(' / ') : null;
}

/**
 * Shared presentational component for the "Member Profile" view. It used to back two routes
 * (a `/dashboard/profile` self-view + this public one), which the 2026-08-10 "one profile page
 * per account" pass collapsed into `app/[locale]/members/[username]/page.tsx` alone — that route
 * now resolves `variant` from the viewer (owner → `preview`, anyone else → `public`) instead of
 * the URL. The two Figma frames are structurally IDENTICAL below the banner (confirmed via a direct
 * Figma node-diff of `401:6375` vs `383:4667`), so this stays a single Server Component
 * (no client interactivity needed — Edit Profile / Share Profile / Invite to event are all
 * static per this stage's scope) taking a `variant` flag rather than being duplicated twice.
 */
export function MemberProfileView({ profile, variant, labels }: MemberProfileViewProps) {
  const displayName = resolveDisplayName(profile);
  const locationText = resolveLocationText(profile);
  const languageText = resolveLanguageText(profile);
  const metaPills = [profile.company, profile.role].filter((value): value is string =>
    Boolean(value),
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
        <div className={cn(styles.banner, 'flex items-center')}>
          <div
            className={cn(
              // Figma: the mobile "Verified Member Profile" preview frame (401:8282, node
              // I401:8413;127:1348 "Frame 84") never stacks — it's always a single row
              // (label left, one compact action right) at a much shorter ~48px height than
              // desktop's 80px bar (401:6352). The previous `flex-col ... sm:flex-row` here
              // stacked on narrow viewports, which doesn't match.
              'mx-auto flex w-full max-w-[1440px] flex-row items-center justify-between gap-2 px-4 py-2 sm:px-6 sm:gap-4 md:py-0 lg:px-[70px]',
            )}
          >
            <div className="flex items-center gap-2">
              <PublicViewEyeIcon className={cn('size-5 shrink-0', styles.bannerHighlight)} />
              <p className={cn('text-tiny', styles.bannerText)}>
                <span className={cn('font-bold', styles.bannerHighlight)}>
                  {labels.bannerHighlight}
                </span>
                {/* Figma: the mobile banner shows ONLY the highlighted "Public viev" label
                    (node I401:8413;127:1352) — the explanatory suffix ("— this is how others
                    see your profile") only exists on the desktop frame (401:6356). */}
                <span className="hidden md:inline"> {labels.bannerRest}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              {/* Static per this stage's scope — no `onClick`/`href`. Figma: mobile is a
                  compact 32px chip (8px padding, 8px radius, node I401:8413;127:1353 "Frame
                  83") — desktop (md+) is the larger 56px/171px gradient-bordered pill
                  (401:6358). Re-verified against both nodes directly (bounds + this project's
                  own `--radius-*` scale, which redefines Tailwind's stock `rounded-lg`/
                  `rounded-xl` to 12px/16px rather than the stock 8px/12px — `rounded-lg` was
                  silently rendering the mobile chip's corner at 12px instead of Figma's 8px,
                  and `rounded-xl` was rendering the desktop pill at 16px instead of Figma's
                  12px, the exact inverse of what was needed): mobile radius has no matching
                  token (8px falls between `--radius-sm` 6px and `--radius-md` 9px) so it's a
                  one-off arbitrary value; desktop's 12px is exactly `--radius-lg` post-redefine
                  so that token is reused instead of an arbitrary value. Icon+label gap: bounds
                  math (button is a FIXED 171px width with its content centered, not packed
                  left, confirmed by solving for the icon's measured x-offset) resolves to a
                  12px desktop gap — this button's own shared `gap-3` default from
                  `buttonVariants` already matches, so the previous `md:gap-2` (8px) override
                  was actively fighting a value that didn't need overriding. Mobile's hug-width
                  chip bounds solve cleanly to a 4px gap (`gap-1`, unchanged, already correct). */}
              <Button
                asChild
                variant="ghost"
                className={cn(
                  'h-8 gap-1 rounded-[8px] px-2 py-2 text-tiny font-normal md:h-14 md:w-[171px] md:gap-3 md:rounded-lg md:px-5 md:py-[15px] md:text-base md:font-bold',
                  styles.editButton,
                )}
              >
                <Link href="/dashboard/profile">
                  {/* Figma: `lucide-react`'s outline `Pen` doesn't match this instance's actual
                    "ball-pen-fill" vector (a solid pen glyph with a separate ink-flick mark) —
                    see `components/icons/profile-meta-icons.tsx` for the path-diff confirming
                    the mobile/desktop instances are the same shape, just scaled. Rendered size
                    still needs an explicit override on mobile: the shared Button component's
                    own base class force-sets `[&_svg]:size-4` (16px) on every icon regardless
                    of the icon's own `className`, at a CSS specificity a same-breakpoint
                    Tailwind utility on the icon itself can never outrank — `.editButton`'s
                    `!important` `svg` rule below is what actually wins. */}
                  <BallPenFillIcon className="size-4" aria-hidden="true" />
                  {labels.editProfile}
                </Link>
              </Button>
              {/* Figma: zero "Share" nodes exist anywhere on the mobile preview frame
                  (401:8282) — Share Profile only exists on the desktop frame (401:6375,
                  node I401:6359;261:3412), so this is hidden below `md`. */}
              <NotYetAvailable feature="shareProfile" className="hidden md:inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  disabled
                  className={cn(
                    'h-14 w-[171px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold disabled:opacity-50',
                    styles.shareButton,
                  )}
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  {labels.shareProfile}
                </Button>
              </NotYetAvailable>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          // Mobile/tablet: the portrait is full-bleed and visually promoted to the top (see
          // the `order-first` wrapper below) — it must sit flush against whatever precedes it
          // (the global site Header, or the preview banner), so top padding is 0 through the
          // same `lg` breakpoint where the full-bleed/reorder trick applies. Bottom padding is
          // unaffected (still steps 40px -> 64px at `md`, as before).
          'mx-auto w-full max-w-[1440px] px-4 pt-0 pb-10 sm:px-6 md:pb-16 lg:px-[70px] lg:pt-16',
        )}
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex w-full flex-col gap-6 lg:max-w-[464px]">
            <div className="flex flex-wrap items-center gap-2">
              {/* Markup-only for now, per explicit user request — not yet gated on
                    `profile.verification_status === 'verified'`. Re-add that condition once
                    the real verified badge is signed off. */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-tiny',
                  styles.pillVerified,
                )}
              >
                <CheckCircle2 className="size-3" aria-hidden="true" />
                {labels.verified}
              </span>
              {profile.username && (
                <span
                  className={cn(
                    // Figma: padding 8px horizontal / 6px vertical on the mobile "Verified
                    // Member Profile" frames, 8px horizontal / 6px top / 8px bottom on both
                    // desktop frames (401:6388 preview, 383:4680 public) — was a flat py-2
                    // (8px) that didn't match either.
                    'inline-flex items-center rounded-full px-2 pt-1.5 pb-1.5 text-tiny md:pb-2',
                    styles.pillHandle,
                  )}
                >
                  @{profile.username}
                </span>
              )}
            </div>

            <h1 className={cn('font-display', styles.heroName)}>{displayName}</h1>

            {profile.bio && <p className="text-body">{profile.bio}</p>}

            {metaPills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metaPills.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      // Fixed 28px height (h-7), vertically centered via flex — top/bottom
                      // padding dropped in favor of centering so the pill hits exactly 28px
                      // regardless of text-tiny's per-breakpoint line-height (16.8px mobile /
                      // 19.6px desktop), which stacked with any padding value couldn't land on
                      // 28px cleanly at both breakpoints at once. Horizontal padding unchanged
                      // (8px mobile / 12px desktop, node 401:8241 / 401:6393).
                      'inline-flex h-7 items-center px-2 text-tiny md:px-3',
                      styles.metaPill,
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {/* Static per this stage's scope — no `onClick`/`href`. Figma: "Invite to event"
                doesn't exist anywhere on either mobile "Verified Member Profile" frame
                (401:8282 preview, 48:567 public) — desktop-only. Re-verified the actual node:
                `401:6377`/`401:6359` (the pair previously cited here) are, respectively, the
                site's own "Header PC" instance and the desktop Share Profile button — NEITHER
                is this button. The real node is the "Primary" instance `401:6401` (preview) /
                `383:4693` (public), whose text override reads "Invite to event" (a sibling
                "Secondary - 2a" instance, `401:6402`, also sits in this row with an "Invite to
                event"-shaped override reading "Book a Session" — but it renders fully outside
                its own 188px-wide clipped parent frame, so it's invisible leftover component-
                swap debris, not part of the live design). `rounded-xl` (16px) and `gap-2` (8px)
                were both fighting the shared Button base class's own correct defaults
                (`rounded-lg`/`gap-3`) rather than matching Figma's real cornerRadius 12 / 12px
                icon-to-text gap — same inverted-radius mistake as the Edit button, so both
                overrides are dropped here rather than corrected to an explicit value. */}
            {/* Event invites are unbuilt — same treatment as every other unbuilt control across
                the app (see `components/ui/not-yet-available.tsx`), including Share Profile in the
                banner above. Edit Profile is the one banner action that is NOT marked: it now
                links to the cabinet (2026-08-12). */}
            <NotYetAvailable feature="inviteToEvent" className="hidden md:inline-flex">
              <Button
                type="button"
                variant="ghost"
                disabled
                className={cn(
                  'h-14 w-[188px] px-5 py-[15px] text-base font-bold disabled:opacity-50',
                  styles.inviteButton,
                )}
              >
                <UserAddFillIcon className="size-4" aria-hidden="true" />
                {labels.inviteToEvent}
              </Button>
            </NotYetAvailable>

            {(locationText || languageText) && (
              // Figma: "Tulum, Mexico" / "EN / UA" render at 14px desktop / 12px mobile
              // (text-tiny), not text-body (16px) — confirmed on both desktop nodes
              // (401:6409/401:6412, 383:4701/383:4704) and both mobile "Verified Member
              // Profile" frames (401:8251/401:8254, 401:8365/401:8368).
              //
              // Figma: the location group ("Frame 4") and language group ("Frame 5") sit at
              // the SAME y with a 16px x-gap between them on BOTH the desktop frame (401:6406
              // ends x=111, 401:6410 starts x=127) and the mobile frame (401:8248 ends x=95,
              // 401:8252 starts x=111) — a single row at every breakpoint, not stacked. Was
              // `flex-col`, which stacked them vertically at all sizes.
              <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-tiny">
                {locationText && (
                  <div className="flex items-center gap-2">
                    <LocationPinIcon
                      className={cn('size-4 shrink-0', styles.metaIcon)}
                      aria-hidden="true"
                    />
                    {locationText}
                  </div>
                )}
                {languageText && (
                  <div className="flex items-center gap-2">
                    <LanguageBubbleIcon
                      className={cn('size-4 shrink-0', styles.metaIcon)}
                      aria-hidden="true"
                    />
                    {languageText}
                  </div>
                )}
              </div>
            )}

            {(socialEntries.length > 0 || websiteHref) && (
              <div className="flex flex-wrap items-center gap-3 lg:mt-auto">
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
                      'inline-flex h-8 items-center gap-1 rounded-md px-3 text-tiny',
                      styles.websitePill,
                    )}
                  >
                    {'\u{1F517}'} {labels.website}
                  </a>
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              // Figma: on mobile the portrait sits directly under the header/banner, ABOVE
              // the name/bio block (node 48:570 / 401:8283 "Rectangle 2"), full-bleed edge to
              // edge (x:0, no side inset) — `order-first` visually promotes it above the text
              // column without changing DOM/reading order (name/bio is still announced
              // first). At `lg:` this reverts to the confirmed side-by-side desktop layout
              // (text column first, image second, both inset).
              //
              // `-mx-4`/`-mx-6` alone only shift the box's left edge flush against the
              // viewport — `w-full` still resolves against the PARENT's padded content-box
              // width, so the right edge stayed ~2×padding short of the viewport edge
              // (confirmed live via Playwright measurement: 358px vs 390px viewport at the
              // `px-4` step). `calc(100%_+_2rem/3rem)` grows the box by exactly the padding
              // being canceled on each side, so both edges reach true full-bleed.
              'order-first -mx-4 w-[calc(100%_+_2rem)] sm:-mx-6 sm:w-[calc(100%_+_3rem)] lg:order-none lg:mx-0 lg:w-auto lg:max-w-[608px] lg:flex-1',
            )}
          >
            {profile.avatar_url ? (
              // Storage URLs aren't configured under next/image's remotePatterns; a plain
              // <img> matches the existing precedent (AvatarUpload/AvatarImage) for
              // rendering profiles.avatar_url.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className={cn(
                  'aspect-[375/440] w-full object-cover lg:aspect-[640/624]',
                  styles.portraitFrame,
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex aspect-[375/440] w-full items-center justify-center lg:aspect-[640/624]',
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
            {/* Figma: a "chat-ai-fill" glyph (desktop node 401:6496, mobile 401:8276) sits
                directly left of the "ABOUT" eyebrow — 8px gap, same brand-blue fill as the
                location/language icons above (--color-primary via .metaIcon). Was missing
                entirely. */}
            <span className="inline-flex items-center gap-2">
              <ChatAiFillIcon
                className={cn('size-4 shrink-0', styles.metaIcon)}
                aria-hidden="true"
              />
              <span className={cn('text-tiny font-bold uppercase', styles.eyebrow)}>
                {labels.aboutEyebrow}
              </span>
            </span>
            <p className="mt-4 text-body whitespace-pre-line">{profile.about}</p>
          </div>
        )}

        {interestGroups.length > 0 && (
          <div className="mt-16 flex flex-col gap-6">
            <div className="flex flex-col gap-8">
              {/* Figma: a DIFFERENT icon from the "ABOUT" card's — a "quill-pen-ai-fill" glyph
                  (desktop nodes 421:4241/421:4273, mobile 421:4123), not the same "chat-ai-fill"
                  reused. Same 8px gap / brand-blue treatment as the "ABOUT" eyebrow above. */}
              <span className="inline-flex items-center gap-2">
                <QuillPenAiFillIcon
                  className={cn('size-4 shrink-0', styles.metaIcon)}
                  aria-hidden="true"
                />
                <span className={cn('text-tiny font-bold uppercase', styles.eyebrow)}>
                  {labels.beyondBusinessEyebrow}
                </span>
              </span>
              {/* Figma desktop: 72px ("What I care about beyond work", nodes 421:4275 /
                  421:4243) — that's --text-h2 (72px), not --text-h3 (48px). Confirmed (not an
                  oversight): this heading is genuinely absent from BOTH mobile "Verified
                  Member Profile" frames (401:8282 preview, 48:567 public) — a targeted search
                  for "What I care about beyond work" / "beyond work" on either mobile frame
                  returns zero nodes. Mobile shows only the "BEYOND BUSINESS" eyebrow directly
                  above the interest cards, so this is hidden below `md` rather than shown at
                  a smaller step. */}
              <h2 className="hidden font-display text-h2 text-black md:block">
                {labels.beyondBusinessHeading}
              </h2>
            </div>

            {/* Figma desktop: the interest-category cards (e.g. "Sports & Health" / "Travel &
                Outdoors" / "Social & Impact", nodes 421:4277/421:4284/421:4291 under grid
                "Frame 530" 421:4276) sit 3-per-row, each 420px wide with a 20px gap — 3*420 +
                2*20 = 1300px, which is exactly this section's own content width once the
                `lg:px-[70px]` step kicks in (1440 - 2*70 = 1300). That match only holds at
                `lg` (1024px+), not `md` (768px) — hence 3 columns starts at `lg`, same
                breakpoint as this file's other side-by-side desktop reversions (hero image),
                not `md` like the lighter typographic tweaks in this same section (heading
                visibility/font-size above). No dedicated tablet-width Member Profile frame
                exists in Figma to confirm an exact tablet column count, so the pre-existing
                `md:grid-cols-2` step is kept as the reasonable intermediate (1 col mobile -> 2
                col tablet -> 3 col desktop) rather than assumed away. Mobile stays 1 column,
                confirmed via both mobile "Verified Member Profile" frames (401:8282 preview,
                48:567 public) stacking cards vertically full-width. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {interestGroups.map(({ category, items }) => (
                <div key={category} className={styles.interestCard}>
                  <h3
                    className={cn(
                      'font-display leading-none font-normal text-black',
                      styles.interestCardHeading,
                    )}
                  >
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
