import { CheckCircle2, Link2, Play, Share2, User } from 'lucide-react';
import type { getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';

import type { SocialsJson } from '@/app/[locale]/(app)/member-profile/page';
import {
  BagIcon,
  FlashlightFillIcon,
  MagicFillIcon,
  MicAiFillIcon,
  ReviewChatIcon,
} from '@/components/icons/mindsetter-eyebrow-icons';
import {
  BallPenFillIcon,
  CashFillIcon,
  LanguageBubbleIcon,
  LocationPinIcon,
  PublicViewEyeIcon,
  QuillPenAiFillIcon,
  UserAddFillIcon,
} from '@/components/icons/profile-meta-icons';
import { ReviewCompanyLogoIcon, ReviewLeaveIcon } from '@/components/icons/review-icons';
import {
  FckupsBlockIcon,
  MyWayBlockIcon,
  MyWinsBlockIcon,
  NumbersBlockIcon,
  ReelLifeBlockIcon,
  VideoBlogBlockIcon,
} from '@/components/icons/shine-block-icons';
import { WinCardGlow, WinTrophyIcon } from '@/components/icons/win-card-glow';
import { CardSlider } from '@/components/profile/CardSlider';
import { ExpandableAccordion } from '@/components/profile/ExpandableAccordion';
import { HelpWithAccordion } from '@/components/profile/HelpWithAccordion';
import {
  groupInterestsByCategory,
  isSafeHttpUrl,
  resolveDisplayName,
  resolveLanguageText,
  resolveLocationText,
  SOCIAL_ICON_MAP,
  SOCIAL_KEYS,
} from '@/components/profile/MemberProfileView';
import { PromoVideoPlayer } from '@/components/profile/PromoVideoPlayer';
import { ReviewQuoteText } from '@/components/profile/ReviewQuoteText';
import { VideoBlogPlayer } from '@/components/profile/VideoBlogPlayer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type {
  Expertise,
  Fckup,
  MyWayStage,
  NumberItem,
  Role,
  Superpower,
  Win,
  WinColor,
} from '@/lib/validation/mindsetter';
import { MIN_REEL_LIFE_PHOTOS_TO_DISPLAY } from '@/lib/validation/mindsetter';
import { toEmbedUrl, type VideoOrientation } from '@/lib/video-embed';

import memberStyles from './MemberProfileView.module.css';
import styles from './MindsetterProfileView.module.css';

/** Read-side shape of `mindsetter_profiles.promo_video` / `.video_blog` — see
 * `PromoForm.tsx`/`VideoBlogForm.tsx` for the same manual-cast precedent (jsonb has no DB-level
 * shape constraint, so this is not re-validated with the write-time Zod schema on read). */
type VideoJson = {
  youtube?: string | null;
  vimeo?: string | null;
  videoPath?: string | null;
  /** Written by the save action, not by the user — see `resolveVideoOrientation`. */
  orientation?: VideoOrientation | null;
} | null;

/** Trophy icon fill per win color (Figma `552:5078` "Frame 274", re-verified via literal SVG
 * export this session) — NOT the same as the card's other accent colors below; the trophy glyph
 * uses its own muted/shifted shade per card, confirmed by direct inspection (only yellow and
 * lightblue happen to match their card's other accents 1:1). */
const WIN_TROPHY_HEX: Record<WinColor, string> = {
  yellow: '#F2C601',
  purple: '#5557DD',
  blue: '#0004FF',
  orange: '#DF8B5F',
  teal: '#42EB9F',
  lightblue: '#79B9E3',
  pink: '#E44497',
};

/** Top-left blurred ellipse's flat fill per win color (Figma, same source as above). */
const WIN_TOPLEFT_GLOW_HEX: Record<WinColor, string> = {
  yellow: '#F4E460',
  purple: '#6461DF',
  blue: '#1612BF',
  orange: '#DD8153',
  teal: '#61DFBF',
  lightblue: '#61BBDF',
  pink: '#DF61B5',
};

/** Bottom-right blurred ellipse's linear-gradient stops (stop 1 → stop 2, offset 0 → 1) per win
 * color (Figma, same source as above — extracted via a raw SVG export of each card's own
 * gradient, since the Figma MCP bridge can't resolve unnamed local gradients any other way). */
const WIN_BOTTOMRIGHT_GLOW_HEX: Record<WinColor, [string, string]> = {
  yellow: ['#F3DA5D', '#FAA147'],
  purple: ['#E88BF5', '#E69EF4'],
  blue: ['#2B39CE', '#A5A6E6'],
  orange: ['#F16722', '#F4B89E'],
  teal: ['#42EB9F', '#9EF4D2'],
  lightblue: ['#42C4EB', '#9EE7F4'],
  pink: ['#EB42AD', '#F49EEE'],
};

/** Each win card's 4px, 4-stop gradient BORDER (stop 1 → 2 → 3 → 4, at 0%/35%/66%/100%), running
 * top-left → bottom-right (Figma `552:5078` "Frame 274", verified via a direct SVG export of the
 * border stroke, cross-confirmed against this file's own `WIN_COLORS` order) — a DIFFERENT
 * gradient per win color, NOT the flat `--color-border` gray `.winCard` used before (wrong, see
 * that rule's own fix comment in `MindsetterProfileView.module.css`). Consumed via the
 * `--win-border-gradient` CSS custom property, set inline per card below (same "shared CSS shape,
 * per-instance color via a prop" pattern as `WinCardGlow`'s own color props, just a CSS variable
 * here since this is a plain masked border, not an SVG). */
const WIN_BORDER_GRADIENT_HEX: Record<WinColor, [string, string, string, string]> = {
  yellow: ['#FEF694', '#F3E259', '#F5B56C', '#FD9836'],
  purple: ['#4C50DC', '#E2B7EF', '#EB72F9', '#E6A3F4'],
  blue: ['#4C50DC', '#BAB7EF', '#7472F9', '#A3AFF4'],
  orange: ['#DC7C4C', '#EFD4B7', '#F9AC72', '#F4C5A3'],
  teal: ['#4CDC86', '#B7EFCF', '#72F98F', '#A3F4C7'],
  lightblue: ['#4CD0DC', '#B7E2EF', '#72EBF9', '#A3F0F4'],
  pink: ['#DC4CA5', '#EFB7E0', '#F972E9', '#F4A3DA'],
};

/** Builds the `--win-border-gradient` CSS custom property value for one win card's color —
 * `to bottom right` matches the Figma citation ("top-left corner to bottom-right corner"), stops
 * pinned at 0%/35%/66%/100% per `WIN_BORDER_GRADIENT_HEX`. */
function winBorderGradient(color: WinColor): string {
  const [stop0, stop35, stop66, stop100] = WIN_BORDER_GRADIENT_HEX[color];
  return `linear-gradient(to bottom right, ${stop0} 0%, ${stop35} 35%, ${stop66} 66%, ${stop100} 100%)`;
}

/** "Topics I'm expert" pill palette — one CSS Module class per pill *position* (not per topic
 * value: `profile.topics` has no per-item color field, and Figma's own coloring is purely
 * illustrative variety, not semantic — `552:4916`/`552:4918`/`552:4920`/`552:4922`/`552:4924`).
 * Onboarding caps this field at 5 topics ("Topics you're expert in · up to 5", E.1), matching
 * Figma's fixed 5-pill mockup exactly, so a 5-entry cycle (`index % length`) covers every real
 * case. See `.topicPill*` in `MindsetterProfileView.module.css` for the actual color values. */
interface TopicItemStyle {
  gradient: string;
  /** Border + text color (claude.txt 2026-07-23 follow-up) — a DIFFERENT palette than the
   * gradient's own accent stop, not a copy/paste guess (e.g. position 1 is gradient `#a139ae`
   * but border/text `#e69ef4`). */
  accent: string;
}

/** "Topics I'm expert" per-item styling (claude.txt 2026-07-23, "1. Блок Topics i'm expert" item
 * 2 + follow-up) — positional, not per-topic-value (`profile.topics` has no per-item color
 * field, and the coloring is purely illustrative variety), cycling once past the 5 given colors
 * ("Якщо більше то по колу" — same cycling precedent as the old `topicPillColorClass` this
 * replaces, and `superpowerCardStyle` below). */
const TOPIC_ITEM_STYLES: readonly [
  TopicItemStyle,
  TopicItemStyle,
  TopicItemStyle,
  TopicItemStyle,
  TopicItemStyle,
] = [
  { gradient: 'linear-gradient(90deg, #1a1a1a 32.43%, #a139ae 100%)', accent: '#e69ef4' },
  { gradient: 'linear-gradient(90deg, #1a1a1a 32.43%, #bf9720 100%)', accent: '#fbf286' },
  { gradient: 'linear-gradient(90deg, #1a1a1a 32.43%, #005a8e 100%)', accent: '#79b9e3' },
  { gradient: 'linear-gradient(90deg, #1a1a1a 32.43%, #a14428 100%)', accent: '#f98866' },
  { gradient: 'linear-gradient(90deg, #1a1a1a 32.43%, #0b0e87 100%)', accent: '#6b6fef' },
];

function topicItemStyle(index: number): TopicItemStyle {
  return TOPIC_ITEM_STYLES[index % TOPIC_ITEM_STYLES.length] ?? TOPIC_ITEM_STYLES[0];
}

/** "Numbers" stat-card gradient-border palette — one CSS Module class per card *position*, same
 * "illustrative variety, not semantic" precedent as `TOPIC_PILL_COLOR_CLASSES` above (Figma:
 * `552:4979`-`552:4988`/`401:7744`-`401:7755`, a distinct two-tone gradient border per card).
 * `profile.numbers` allows up to `MAX_NUMBERS` (10, see `lib/validation/mindsetter.ts`) while
 * Figma's own mockup only shows 4, so the 4-color palette cycles by index the same way. See
 * `.numberStat*` in `MindsetterProfileView.module.css` for the actual gradient/glow values. */
/**
 * "Book a Session" calendar icon (16×16) — provided verbatim by the designer.
 *
 * The one edit to the supplied markup: `fill="#79B9E3"` became `currentColor`, so the glyph
 * tracks the button's own text color through hover/active/disabled instead of staying brand-blue
 * on a dimmed button. Same reason `AddLinkIcon` in `RolesForm.tsx` was switched off a hardcoded
 * fill. The resting color is unchanged — `primaryOutline`'s text is that exact blue.
 */
function BookSessionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.33325 12.6666C1.33325 13.8 2.19992 14.6666 3.33325 14.6666H12.6666C13.7999 14.6666 14.6666 13.8 14.6666 12.6666V7.33331H1.33325V12.6666ZM12.6666 2.66665H11.3333V1.99998C11.3333 1.59998 11.0666 1.33331 10.6666 1.33331C10.2666 1.33331 9.99992 1.59998 9.99992 1.99998V2.66665H5.99992V1.99998C5.99992 1.59998 5.73325 1.33331 5.33325 1.33331C4.93325 1.33331 4.66658 1.59998 4.66658 1.99998V2.66665H3.33325C2.19992 2.66665 1.33325 3.53331 1.33325 4.66665V5.99998H14.6666V4.66665C14.6666 3.53331 13.7999 2.66665 12.6666 2.66665Z"
        fill="currentColor"
      />
    </svg>
  );
}

const NUMBER_STAT_COLOR_CLASSES = [
  'numberStatPink',
  'numberStatBlue',
  'numberStatPurple',
  'numberStatYellow',
] as const;

function numberStatColorClass(index: number): (typeof NUMBER_STAT_COLOR_CLASSES)[number] {
  return (
    NUMBER_STAT_COLOR_CLASSES[index % NUMBER_STAT_COLOR_CLASSES.length] ??
    NUMBER_STAT_COLOR_CLASSES[0]
  );
}

/**
 * Grid columns for the "Numbers" row, keyed by how many cards there actually are.
 *
 * The row used to be a hard `grid-cols-2 md:grid-cols-4`, so a Mindsetter who filled two stats
 * got two cards and half a row of dead space. Now the track count follows the card count and
 * they stretch to fill the width (2026-08-05 product decision). Capped at 4 because
 * `MAX_NUMBERS` is 4.
 *
 * Spelled out as whole class strings rather than built with a template literal: Tailwind scans
 * source text for complete class names, and an interpolated `md:grid-cols-${n}` would simply
 * never be generated.
 */
const NUMBER_GRID_COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1 md:grid-cols-1',
  2: 'grid-cols-2 md:grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

/** Shared base classes for the `CardSlider` items that want the standard 280px mobile card — My
 * F*ckUp(s) / REEL LIFE. Reviews and My WINS are also `CardSlider`-based (2026-08-06) but size
 * their cards per-breakpoint from the CSS module and spell out their own snap behavior, so they
 * deliberately don't use this. Kept in one place so a future section can't forget `snap-start`
 * and silently break scroll-snap. */
const SLIDER_ITEM_BASE = 'w-[280px] shrink-0 snap-start';

interface SuperpowerCardStyle {
  background: string;
  textClassName?: string;
}

/** Superpower(s) per-position card background + title/description text color (claude.txt
 * 2026-07-23, "1. Блок Superpower(s)" items 4/6 — max 3 cards, `MAX_SUPERPOWERS` in
 * `lib/validation/mindsetter.ts`, so a fixed 3-entry tuple indexed by position is exact, not a
 * cycling approximation). Card 3's white background needs black title/description text; cards
 * 1/2 keep the page's default white text. */
const SUPERPOWER_CARD_STYLES: readonly [
  SuperpowerCardStyle,
  SuperpowerCardStyle,
  SuperpowerCardStyle,
] = [
  { background: 'linear-gradient(358.93deg, #1a1a1a 2.16%, #79b9e3 99.53%)' },
  { background: '#1a1a1a' },
  { background: '#fff', textClassName: 'text-[#000]' },
];

/** Same `noUncheckedIndexedAccess`-vs-computed-index situation as `topicItemStyle` above —
 * `index` is always < 3 in practice (`MAX_SUPERPOWERS`), but the type checker can't prove that
 * from a plain array index. */
function superpowerCardStyle(index: number): SuperpowerCardStyle {
  return SUPERPOWER_CARD_STYLES[index % SUPERPOWER_CARD_STYLES.length] ?? SUPERPOWER_CARD_STYLES[0];
}

interface SuperpowerNumberColor {
  text: string;
  icon: string;
}

/** Superpower(s) per-position number/icon color — literal per claude.txt item 2 (card 1's
 * number is white, cards 2 and 3 both share the same gray-text/blue-icon pair despite card 3's
 * own background being white — as specified, not a copy/paste guess). */
const SUPERPOWER_NUMBER_COLORS: readonly [
  SuperpowerNumberColor,
  SuperpowerNumberColor,
  SuperpowerNumberColor,
] = [
  { text: '#FFFFFF', icon: '#FFFFFF' },
  { text: '#A5A5A5', icon: '#79B9E3' },
  { text: '#A5A5A5', icon: '#79B9E3' },
];

function superpowerNumberColor(index: number): SuperpowerNumberColor {
  return (
    SUPERPOWER_NUMBER_COLORS[index % SUPERPOWER_NUMBER_COLORS.length] ?? SUPERPOWER_NUMBER_COLORS[0]
  );
}

/** First letter of the first + last "word" of a reviewer's name, uppercased (e.g. "Erin
 * Glabets" → "EG") — computed rather than hardcoded so this keeps working once the `reviews`
 * content array gets real, distinct reviewer names. */
function getReviewerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Everything this screen renders — one `profiles` row joined 1:1 with `mindsetter_profiles`,
 * plus the Mindsetter's current `session_settings` row. Explicit shape (not `Database['public']`
 * generated types — same staleness precedent as `MemberProfile` in `MemberProfileView.tsx`);
 * both fetch call sites (`app/[locale]/(app)/mindsetters/[username]/page.tsx`, present/future
 * self-preview routes) select exactly this column allow-list, never `select('*')`.
 *
 * `reelLifePhotoUrls` / `promoVideoUrl` are NOT raw DB columns — they're already-resolved signed
 * URLs, computed server-side by the page (see that file's doc comment for why a service-role
 * read is used there) before this purely-presentational component ever runs.
 */
export interface MindsetterProfile {
  username: string;
  full_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tagline: string | null;
  company: string | null;
  role: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  /** Subdivision (US state, oblast…). Shown only when it disambiguates — see resolveLocationText. */
  regionName: string | null;
  languages: string[] | null;
  interests: string[] | null;
  socials: SocialsJson | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  roles: Role[];
  superpowers: Superpower[];
  promoVideo: VideoJson;
  numbers: NumberItem[];
  helpWith: Expertise[];
  wins: Win[];
  myWay: MyWayStage[];
  fckups: Fckup[];
  philosophy: string | null;
  /** Optional attribution for `philosophy` (2026-08-14). */
  philosophyAuthor: string | null;
  videoBlog: VideoJson;
  sessionType: 'free' | 'paid' | null;
  priceCents: number | null;
  currency: string | null;
  topics: string[];
  reelLifePhotoUrls: string[];
  promoVideoUrl: string | null;
  videoBlogUrl: string | null;
}

export interface MindsetterProfileViewProps {
  profile: MindsetterProfile;
  /** `preview` = owner previewing their own profile (adds the top banner + static Edit/Share
   * CTAs in place of the visitor Invite/Book CTAs) — same `variant` convention as
   * `MemberProfileView`. */
  variant: 'preview' | 'public';
  /**
   * The resolved `mindsetterProfile` namespace translator, passed through directly rather than
   * destructured into an individual `labels` object (the pattern `MemberProfileView` uses) —
   * this namespace has far more strings (17 sections' worth of eyebrows/headings/microcopy), and
   * both this component and its translator stay server-side (no client boundary is crossed), so
   * passing the function itself is safe and avoids ~40 lines of prop plumbing for no benefit.
   */
  t: Awaited<ReturnType<typeof getTranslations<'mindsetterProfile'>>>;
}

/** "Free" / "$X" session-price microcopy for the two CTA banners — static per this stage's
 * scope (no live booking widget yet), sourced from `session_settings` when available. */
function formatSessionPrice(
  profile: Pick<MindsetterProfile, 'sessionType' | 'priceCents' | 'currency'>,
  t: MindsetterProfileViewProps['t'],
): string | null {
  if (!profile.sessionType) return null;
  if (profile.sessionType === 'free') return t('sessionPriceFree');
  if (profile.priceCents == null) return null;
  const amount = (profile.priceCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: (profile.currency ?? 'usd').toUpperCase(),
    maximumFractionDigits: 0,
  });
  return t('sessionPricePaid', { price: amount });
}

/** Superpower(s) card number's bolt/flash icon — color is per-card-position (see
 * `SUPERPOWER_NUMBER_COLORS`), not a fixed theme token, hence the `fill` prop rather than a
 * `currentColor` icon. */
function SuperpowerNumberIcon({ className, fill }: { className?: string; fill: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7.58398 5.53325C7.58398 5.69894 7.7183 5.83325 7.88398 5.83325H11.0947C11.3367 5.83325 11.4792 6.10505 11.3414 6.30401L6.96398 12.627C6.79656 12.8688 6.41732 12.7503 6.41732 12.4562V8.46659C6.41732 8.3009 6.283 8.16659 6.11732 8.16659H2.90655C2.66456 8.16659 2.52215 7.89479 2.6599 7.69582L7.03733 1.37287C7.20474 1.13105 7.58398 1.24952 7.58398 1.54363V5.53325Z"
        fill={fill}
      />
    </svg>
  );
}

/** Superpower(s) carousel's bespoke prev/next arrows (claude.txt 2026-07-23, "1. Блок
 * Superpower(s)" item 10) — each SVG draws its own circle/border/fill (unlike the default
 * `CardSlider` arrows, which get their circular chrome from CSS), so `CardSlider`'s `arrows`
 * prop renders these bare. Both base SVGs point one direction as given by the design; the other
 * button reuses the same visual via a horizontal flip (`mirrored`) rather than needing 4 hand-
 * drawn variants. */
function SuperpowerArrowOutline({ mirrored }: { mirrored?: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={mirrored ? 'scale-x-[-1]' : undefined}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="47" height="47" rx="23.5" stroke="#79B9E3" />
      <path
        d="M31.0572 24.9427C31.5779 24.9427 31.9999 24.5206 32 24C32 23.4793 31.5779 23.0572 31.0572 23.0572H19.0627L21.7488 19.8914C22.022 19.5695 22.022 19.0971 21.7488 18.7752C21.4043 18.3692 20.7778 18.3692 20.4333 18.7752L16.549 23.353C16.2323 23.7262 16.2323 24.2738 16.549 24.647L20.4333 29.2247C20.7778 29.6308 21.4043 29.6308 21.7489 29.2247C22.022 28.9028 22.022 28.4304 21.7488 28.1085L19.0627 24.9428L31.0572 24.9427Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

function SuperpowerArrowFilled({ mirrored }: { mirrored?: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={mirrored ? 'scale-x-[-1]' : undefined}
      aria-hidden="true"
    >
      <rect
        x="48"
        y="48"
        width="48"
        height="48"
        rx="24"
        transform="rotate(-180 48 48)"
        fill="#79B9E3"
      />
      <path
        d="M16.9428 23.0573C16.4221 23.0573 16.0001 23.4794 16 24C16 24.5207 16.4221 24.9428 16.9428 24.9428L28.9373 24.9428L26.2512 28.1086C25.978 28.4305 25.978 28.9029 26.2512 29.2248C26.5957 29.6308 27.2222 29.6308 27.5667 29.2248L31.451 24.647C31.7677 24.2738 31.7677 23.7262 31.451 23.353L27.5667 18.7753C27.2222 18.3692 26.5957 18.3692 26.2512 18.7753C25.978 19.0972 25.978 19.5696 26.2512 19.8915L28.9373 23.0572L16.9428 23.0573Z"
        fill="white"
      />
    </svg>
  );
}

/** "All interviews" button's trailing arrow (video-blog section) — provided verbatim by the
 * designer, same "hardcoded fill, not `currentColor`" precedent as `ContinueFillIcon` in
 * `ShineForm.tsx`: a light-blue (`#79B9E3`) rounded-square backdrop with a white right-arrow
 * glyph, single-use so it's kept local rather than in `components/icons/`. */
function VideoBlogArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="16"
        y="16"
        width="16"
        height="16"
        rx="8"
        transform="rotate(-180 16 16)"
        fill="#79B9E3"
      />
      <path
        d="M4.9714 7.52865C4.71107 7.52865 4.50003 7.73968 4.50002 8.00001C4.50001 8.26035 4.71106 8.47141 4.9714 8.47141L10.1601 8.47141L8.95358 10.0964C8.84914 10.2371 8.84914 10.4296 8.95358 10.5702C9.11247 10.7842 9.43285 10.7842 9.59174 10.5702L11.0574 8.59612C11.3202 8.24216 11.3202 7.75786 11.0574 7.4039L9.59176 5.42979C9.43286 5.21577 9.11247 5.21578 8.95358 5.4298C8.84914 5.57047 8.84915 5.76294 8.95359 5.9036L10.1601 7.5286L4.9714 7.52865Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Decorative quotation mark around the Reel Life philosophy quote (Figma `911:11550`/`911:11556`
 * — the same vector used twice, not a mirrored open/close pair).
 *
 * Native 38×29. Rendered in `--color-card` (#1a1a1a) per the frame: on the page's black
 * background that is a deliberately faint watermark, not a legible glyph.
 */
function QuoteMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="38"
      height="29"
      viewBox="0 0 38 29"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.69388 29C6.78571 29 4.42687 27.9595 2.61735 25.8785C0.872449 23.7975 0 20.9444 0 17.3194C0 13.4259 1.09864 10.0694 3.29592 7.25C5.55782 4.36343 8.46599 2.28241 12.0204 1.00694L14.7347 0L17.352 6.74653L14.6378 7.75347C12.6344 8.4919 11.1156 9.26389 10.0816 10.0694C9.04762 10.875 8.30442 11.9491 7.85204 13.2917C8.62755 13.0903 9.37075 12.9896 10.0816 12.9896C12.0204 12.9896 13.7653 13.7951 15.3163 15.4062C16.8673 16.9502 17.6429 18.8299 17.6429 21.0451C17.6429 23.1933 16.835 25.0729 15.2194 26.684C13.6684 28.228 11.8265 29 9.69388 29ZM30.051 29C27.1429 29 24.784 27.9595 22.9745 25.8785C21.2296 23.7975 20.3571 20.9444 20.3571 17.3194C20.3571 13.4259 21.4558 10.0694 23.6531 7.25C25.915 4.36343 28.8231 2.28241 32.3776 1.00694L35.0918 0L37.7092 6.74653L34.9949 7.75347C32.9915 8.4919 31.4728 9.26389 30.4388 10.0694C29.4048 10.875 28.6616 11.9491 28.2092 13.2917C28.9847 13.0903 29.7279 12.9896 30.4388 12.9896C32.3776 12.9896 34.1224 13.7951 35.6735 15.4062C37.2245 16.9502 38 18.8299 38 21.0451C38 23.1933 37.1922 25.0729 35.5765 26.684C34.0255 28.228 32.1837 29 30.051 29Z" />
    </svg>
  );
}

/** A section eyebrow row (icon + bold black uppercase label) reused by every content section
 * on this page — the "ABOUT"/"BEYOND BUSINESS" eyebrow pattern from `MemberProfileView`,
 * generalized here since this page has many more of them. */
function SectionEyebrow({
  icon,
  children,
  textClassName,
}: {
  icon: ReactNode;
  children: ReactNode;
  /** Extra classes merged onto the text span only — e.g. Roles' own `leading-none` (claude.txt
   * 2026-07-23, "1. Блок Roles" item 1), without touching every other section's eyebrow. */
  textClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span className={cn('text-tiny font-bold uppercase', styles.sectionEyebrow, textClassName)}>
        {children}
      </span>
    </span>
  );
}

/**
 * The two repeating CTA banners ("Are you ready…" / "Ready to talk?") — spec-required
 * "sticky, повтори" repeats; static Invite/Book CTAs (booking flow §5.8 isn't built yet), same
 * static-CTA precedent as `MemberProfileView`'s Edit/Share buttons. Session price microcopy is
 * live where `session_settings` data is available.
 *
 * Stage 1.10 pixel-polish pass (ROADMAP "Polish / follow-up" item 1: "CTA banners use gradient
 * cards instead of the Figma photo-background treatment"): re-verified against the real nodes
 * (`327:1443`/`337:2306` "Frame 58" desktop, `327:2636` "Frame 237" desktop, mobile `261:1610`/
 * `261:1609` "Frame 58") — NOT a photo. Each banner is a flat `#1a1a1a` card (`.ctaBanner`) with
 * a soft blurred brand-blue glow blob in the top-right corner (Figma layer named "75", a large
 * blurred shape whose own bounds/fill this MCP's node-read summary can't surface — confirmed by
 * exporting that layer alone as a PNG and visually sampling it: a blue-to-transparent radial
 * blur, not a photo) — approximated here as an absolutely-positioned `.ctaGlow` radial gradient
 * (exact pixel-for-pixel blur data isn't retrievable through this read-only bridge, so this is a
 * close visual match rather than a 1:1 vector reproduction). The heading text itself uses Figma's
 * shared "gradient" text style (`get_styles`), whose 3 stops (`#C3E4F9` 0% → `#79B9E3` ~49.5% →
 * `#21B8E6` 100%) are pixel-identical to this app's own existing `--gradient-primary` token
 * (`effects.css`) — reused via `background-clip: text` instead of repeating the hex triplet.
 * The price pill was previously a bare `<p>`; Figma's actual node (`327:1451`/`327:2640`/mobile
 * `261:1618` "Frame 3") is a bordered pill (1px white border, cornerRadius 12) with a
 * `cash-fill` icon — added below as `.ctaPricePill`.
 */
function CtaBanner({
  heading,
  price,
  inviteLabel,
  bookLabel,
}: {
  heading: string;
  price: string | null;
  inviteLabel: string;
  bookLabel: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-6 overflow-hidden px-4 py-10 text-center max-[600px]:px-[15px] max-[600px]:py-[68px] sm:px-6 md:justify-center md:gap-8 md:px-0 md:pt-[100px] md:pb-[100px]',
        styles.ctaBanner,
      )}
    >
      <span className={styles.ctaGlow} aria-hidden="true" />
      <h2 className={cn('relative font-display', styles.ctaHeading)}>{heading}</h2>
      {price && (
        <p className={cn('relative inline-flex items-center gap-2', styles.ctaPricePill)}>
          <CashFillIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {price}
        </p>
      )}
      {/* Same unbuilt features as the hero's own pair — event invites and session booking.
          Disabled + `NotYetAvailable` rather than left clickable-but-inert. */}
      <div className="relative flex flex-col gap-3 sm:flex-row">
        <NotYetAvailable feature="inviteToEvent" className="max-[600px]:w-full">
          <Button
            type="button"
            variant="ghost"
            disabled
            className={cn(
              'h-14 px-6 text-base font-bold disabled:opacity-50 max-[600px]:w-full md:min-w-[188px]',
              memberStyles.inviteButton,
            )}
          >
            <UserAddFillIcon className="size-4" aria-hidden="true" />
            {inviteLabel}
          </Button>
        </NotYetAvailable>
        <NotYetAvailable feature="bookSession" className="max-[600px]:w-full">
          <Button
            type="button"
            variant="primaryOutline"
            size="lg"
            disabled
            className="shadow-none max-[600px]:w-full md:min-w-[188px]"
          >
            {bookLabel}
          </Button>
        </NotYetAvailable>
      </div>
    </div>
  );
}

/**
 * Presentational Server Component for the "Public Mindsetter Profile" screen (Figma
 * `327:1080`/`383:2070` desktop "Full Profile" — same content, two promo-video-orientation
 * variants — / `187:4294` mobile). Section order below matches the ACTUAL Figma node y-order
 * measured during this build (Hero → micro-nav → Roles → Topics pills → Superpower(s) →
 * Promo video → Numbers → What can I help with → REEL LIFE → My events → Reviews → CTA
 * banner #1 → My WINS → My Way → My F*ckUp(s) → Built Not Burn · Interview → CTA banner #2 →
 * Beyond Business), which differs slightly from the ROADMAP stage-1.10 planning note's
 * prose-listed order (that note was written before this node-level measurement pass — the
 * measured layout is the ground truth per CLAUDE.md: "Figma design is the source of truth").
 * Micro-navigation and "My events" have no located Figma frame (ROADMAP open items) — added per
 * product-owner decision as, respectively, static anchor links and a neutral empty state.
 *
 * STAGE 1.11 RE-VERIFICATION (2026-07-21): re-measured against `552:4484` ("Public Mindsetter's
 * Full Profile (video vertical)"), a newer duplicate of the same frame elsewhere on the canvas
 * (higher node-ID range = the more recently edited copy; the last two styling passes — Topics'
 * card wrapper, the dark-theme re-theme — already cited `552:xxxx` nodes exclusively as ground
 * truth). Two corrections from that duplicate: (1) **My WINS → My Way → My F*ckUp(s)** is the
 * real order (confirmed via each section's direct-child `y` offset under `552:4484`'s own root:
 * Reviews `552:4496` y=6716 → CTA1 `552:4630` y=7505 → My WINS `552:5069` y=8205 → My Way
 * `552:4650` y=8851 → My F*ckUp(s) `552:4700` y=9670 → video blog `552:4655` y=10470 → CTA2
 * `552:4741` y=10958) — the PREVIOUS pass had F*ckUp(s) first and WINS last, measured off the
 * older `327:1080` duplicate; this fixes that regression. (2) Reviews / My WINS / My F*ckUp(s)
 * are genuine overflowing CAROUSELS in Figma, not static grids — each card row is measurably
 * wider than the ~1300px content column (Reviews 1740px / 4×420px cards, My WINS 4600px /
 * 7×640px cards, My F*ckUp(s) 1964px / 3×641px cards) and each has an identical circular
 * prev/next control centered below the row (`552:4605`/`552:4625`/`552:4620`) — see
 * `CardSlider.tsx` for the implementation (native scroll-snap + `scrollBy`, no carousel library).
 * REEL LIFE is a FOURTH such carousel, added this pass (previously mis-built as a static
 * grid/horizontal-scroll-on-mobile-only from a stale `187:4294` reading) — see that section's own
 * inline comment below for the re-measurement citation (desktop `552:4610`, mobile `401:7830`).
 *
 * "Short" vs "Full" Figma frames are the SAME page — every optional section (Promo video, Reel
 * Life, Numbers, My Way, video blog, F*ckUps, My WINS) renders ONLY when its underlying data is
 * non-empty (data-driven visibility, mirrors the onboarding "shine" block-picker model); Roles /
 * Topics pills / Superpower(s) / What can I help with are core onboarding steps (never empty
 * once onboarding is complete) but are still defensively guarded the same way. Reviews, My
 * events, and the two CTA banners are static/decorative (no backing data at all) and always
 * render — likewise the micro-nav's OWN items are gated per-target (an anchor only appears once
 * its target section actually renders), except the two always-rendering targets above.
 */
export function MindsetterProfileView({ profile, variant, t }: MindsetterProfileViewProps) {
  const displayName = resolveDisplayName(profile);
  const locationText = resolveLocationText(profile);
  const languageText = resolveLanguageText(profile);
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

  // Philosophy no longer feeds the hero (2026-08-05 product decision) — it heads the REEL LIFE
  // section instead, see `reelLifeHeading` below. The hero falls back to the bio alone.
  const heroText = profile.bio?.trim() || null;

  /**
   * REEL LIFE's heading: the Mindsetter's own philosophy quote when they wrote one, otherwise
   * the generic copy. Capped at `MAX_PHILOSOPHY_LENGTH` (200) upstream, so it stays within what
   * a display-size heading can carry.
   */
  /**
   * The Mindsetter's own quote, rendered as its own block UNDER Reel Life's static heading
   * (Figma `911:11550`–`911:11556`).
   *
   * It used to REPLACE that heading — a misreading of the frame, corrected 2026-08-14 after
   * re-checking it: the heading and the quote are separate, simultaneous layers there, so a
   * Mindsetter who wrote a philosophy was silently losing "My business, my life — in pictures".
   */
  const philosophyQuote = profile.philosophy?.trim() || null;
  /** Attribution line — only when there IS a quote and someone else is credited for it. */
  const philosophyAuthor = philosophyQuote ? profile.philosophyAuthor?.trim() || null : null;
  const price = formatSessionPrice(profile, t);
  /**
   * Which promo layout to use. Stored at write time (`resolveVideoOrientation`, `lib/video-embed`)
   * because only the URL can say it for YouTube (`/shorts/` = portrait) and only an oEmbed call
   * can say it for Vimeo — neither belongs in a render path. Rows saved before this existed carry
   * no value, so they fall back to landscape, which is what they were being drawn as anyway.
   */
  const promoOrientation: VideoOrientation =
    profile.promoVideo?.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const hasPromoVideo = Boolean(
    profile.promoVideoUrl || profile.promoVideo?.youtube || profile.promoVideo?.vimeo,
  );
  const promoEmbedUrl = profile.promoVideoUrl
    ? null // direct upload — rendered via <video>, not an iframe embed
    : toEmbedUrl(profile.promoVideo?.youtube || profile.promoVideo?.vimeo || null);
  const hasVideoBlog = Boolean(
    profile.videoBlogUrl || profile.videoBlog?.youtube || profile.videoBlog?.vimeo,
  );
  const videoBlogEmbedUrl = profile.videoBlogUrl
    ? null // direct upload — rendered via <video>, not an iframe embed
    : toEmbedUrl(profile.videoBlog?.youtube || profile.videoBlog?.vimeo || null);
  const reviews = t.raw('reviews.items') as { name: string; role: string; quote: string }[];

  /**
   * REEL LIFE's two staggered rows (stage 1.12, see that section's own JSX comment for the full
   * Figma re-verification: `552:4642`-`552:4649` desktop / `401:7881`-`401:7886` mobile draw a
   * genuine 2-row masonry, row 1 with one more tile than row 2). This app has no per-photo
   * row/layout metadata to mirror Figma's exact placeholder assignment, so photos are simply
   * split in document order — first `ceil(n/2)` into row 1, the rest into row 2 — which
   * reproduces the same "row 1 slightly longer" shape for any photo count. A single photo (or
   * zero, though that's gated by `reelLifePhotoUrls.length > 0` at the call site) renders as one
   * row — a 2-row stagger needs at least 2 photos to mean anything.
   */
  const reelLifePhotoRows =
    profile.reelLifePhotoUrls.length > 1
      ? [
          profile.reelLifePhotoUrls.slice(0, Math.ceil(profile.reelLifePhotoUrls.length / 2)),
          profile.reelLifePhotoUrls.slice(Math.ceil(profile.reelLifePhotoUrls.length / 2)),
        ]
      : [profile.reelLifePhotoUrls];

  return (
    <div className={styles.section}>
      {variant === 'preview' && (
        <div className={cn(memberStyles.banner, 'flex items-center')}>
          <div className="mx-auto flex w-full max-w-[1440px] flex-row items-center justify-between gap-2 px-4 py-2 sm:px-6 sm:gap-4 md:py-0 lg:px-[70px]">
            <div className="flex items-center gap-2">
              <PublicViewEyeIcon className={cn('size-5 shrink-0', memberStyles.bannerHighlight)} />
              <p className={cn('text-tiny', memberStyles.bannerText)}>
                <span className={cn('font-bold', memberStyles.bannerHighlight)}>
                  {t('banner.highlight')}
                </span>
                <span className="hidden md:inline"> {t('banner.rest')}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              {/* Edit Profile goes to the cabinet's My Profile tab — the one place every section
                  of this page is editable (2026-08-12). Share Profile has nothing behind it yet,
                  so it gets the app's standard `NotYetAvailable` treatment instead of looking live. */}
              <Button
                asChild
                variant="ghost"
                className={cn(
                  'h-8 gap-1 rounded-[8px] px-2 py-2 text-tiny font-normal md:h-14 md:w-[171px] md:gap-3 md:rounded-lg md:px-5 md:py-[15px] md:text-base md:font-bold',
                  memberStyles.editButton,
                )}
              >
                <Link href="/dashboard/profile">
                  <BallPenFillIcon className="size-4" aria-hidden="true" />
                  {t('editProfile')}
                </Link>
              </Button>
              <NotYetAvailable feature="shareProfile" className="hidden md:inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  disabled
                  className={cn(
                    'h-14 w-[171px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold disabled:opacity-50',
                    memberStyles.shareButton,
                  )}
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  {t('shareProfile')}
                </Button>
              </NotYetAvailable>
            </div>
          </div>
        </div>
      )}

      {/* ============================== HERO ==============================
          STAGE 1.12 LAYOUT PASS (2026-07-23, explicit user direction after re-reviewing Figma):
          every section on this page now owns its OWN top-level `mx-auto w-full max-w-[1440px]
          px-4 sm:px-6 lg:px-[70px]` wrapper (verified against `552:4484`/`401:7567`: every
          section's content column is x=70/w=1300 out of the 1440-wide desktop frame, x=16 of
          375 on mobile — i.e. this same px-4/sm:px-6/lg:px-[70px] triple is correct EVERYWHERE,
          no per-section deviation), replacing the single shared wrapper this file used to open
          here and close after "Help" (~40 lines down) — a colleague was about to strip that
          shared wrapper's own padding, which would have silently unpadded 6 sections at once.
          Vertical rhythm between every section (including the ones already standalone below:
          Reel Life/My events/Reviews/CTA/My WINS/My Way/F*ckUps/video blog/Beyond Business) is
          now a uniform `mt-20 lg:mt-[150px]` (80px mobile / 150px desktop) on each section's own
          wrapper, replacing the old `mt-16` (64px) self-margin AND the standalone sections' old
          `py-16` (64px top+bottom, which relied on BOTH neighbors padding toward each other —
          confirmed as the exact double-spacing bug this pass fixes: e.g. CTA banner #1 had NO
          top margin of its own, silently depending on Reviews' `pb-16`). Re-measured directly
          against `552:4811` ("Frame 445", the old shared-wrapper's Figma equivalent, which itself
          nests Roles→Topics→Superpowers→Promo video→Numbers→Help): every one of those 5
          section-to-section gaps reads exactly 150px (Roles frame height 1070 ends at y=1070,
          Topics starts at y=1220 = +150; Topics ends 1671, Superpowers starts 1821 = +150; ... —
          same +150 pattern repeats for Superpowers→Promo, Promo→Numbers, Numbers→Help), and the
          same +150 repeats once more from Beyond Business (`552:5234`, ends y=11821) to the
          footer (`552:5170`, starts y=11971) — i.e. 150 is Figma's OWN real rhythm here, not just
          the user's stated number coincidentally matching. Mobile (`401:7567`) samples mostly at
          +80 too (Roles→Superpowers, Numbers→Help, Reel Life→Reviews, Reviews→CTA1, CTA1→Wins all
          read exactly 80px) with two ~150-ish outliers immediately adjacent to overflowing-
          carousel sections (Superpowers→Promo video, My WINS→My Way) — those carousels' own
          Figma auto-layout frames don't include their overflow card row in their declared height
          (the row scrolls past the frame's own bounds), which throws off a naive end-of-frame
          measurement; not evidence of a genuinely different intended gap. Net: 80/150 stands as
          the correct uniform value, matching both the user's explicit instruction AND the
          overwhelming majority of clean Figma measurements. The Hero section itself drops the
          old `pb-10 md:pb-16` bottom padding it used to carry — that was this file's old
          mechanism for "gap to Roles"; Roles' own new `mt-20 lg:mt-[150px]` now owns that gap
          instead, so keeping Hero's bottom padding too would double it.

          TOP-PADDING FIX (client-reported "excess top padding above the banner", re-verified
          against `327:1084`/`383:2040`/`401:7569` this pass): the row used to carry one shared
          `lg:pt-16` (64px) on this OUTER wrapper, applied equally to both the text column AND
          the portrait photo. Figma has NO such shared gap — the photo (`327:1084` "Rectangle 2"
          desktop, `401:7569` "Rectangle 2" mobile) sits flush against the header's own bottom
          edge at every breakpoint (`y=88` desktop / `y=115` mobile, exactly the header's own
          height, i.e. 0px extra gap), while only the TEXT column starts lower (`383:2040`
          "Frame 430" `y=175` desktop, i.e. 175-88=87px below the header — measured directly, not
          a round Tailwind step). `lg:pt-16` is removed from here; the 87px offset moves to the
          text column alone, below. */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-0 sm:px-6 lg:px-[70px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex w-full flex-col gap-6 lg:max-w-[464px] lg:pt-[87px]">
            <div className="flex flex-wrap items-center gap-2">
              {/* TEMPORARY DEMO OVERRIDE (claude.txt 2026-07-23 follow-up: "Verified для демо
                  виведи просто в коді, не з бази, щоб показати бізнесу, потім приберемо його") —
                  unconditional instead of gated on `profile.verification_status === 'verified'`
                  (no test account is actually verified yet), so the pill is visible for a
                  business demo. REVERT to `{profile.verification_status === 'verified' && (...)}`
                  once the demo is done. */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-tiny',
                  styles.pillVerified,
                )}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-3 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M6 1C3.25 1 1 3.25 1 6C1 8.75 3.25 11 6 11C8.75 11 11 8.75 11 6C11 3.25 8.75 1 6 1ZM8.1 5.15L5.7 7.55C5.5 7.75 5.2 7.75 5 7.55L3.9 6.45C3.7 6.25 3.7 5.95 3.9 5.75C4.1 5.55 4.4 5.55 4.6 5.75L5.35 6.5L7.4 4.45C7.6 4.25 7.9 4.25 8.1 4.45C8.3 4.65 8.3 4.95 8.1 5.15Z"
                    fill="#08D6AD"
                  />
                </svg>
                {t('verified')}
              </span>
              {profile.username && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 pt-1.5 pb-1.5 text-tiny md:pb-2',
                    styles.pillHandle,
                  )}
                >
                  @{profile.username}
                </span>
              )}
            </div>

            <h1 className={cn('font-display', styles.heroName)}>{displayName}</h1>

            {heroText && <p className="text-body">{heroText}</p>}

            {metaPills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metaPills.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      'inline-flex h-7 items-center px-2 text-tiny md:px-3',
                      styles.metaPill,
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            {(locationText || languageText) && (
              <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-tiny lg:order-3">
                {locationText && (
                  <div className="flex items-center gap-2">
                    <LocationPinIcon
                      className={cn('size-4 shrink-0', memberStyles.metaIcon)}
                      aria-hidden="true"
                    />
                    {locationText}
                  </div>
                )}
                {languageText && (
                  <div className="flex items-center gap-2">
                    <LanguageBubbleIcon
                      className={cn('size-4 shrink-0', memberStyles.metaIcon)}
                      aria-hidden="true"
                    />
                    {languageText}
                  </div>
                )}
              </div>
            )}

            {(socialEntries.length > 0 || websiteHref) && (
              // `lg:mt-auto` pushes the socials to the bottom of the hero's text column on
              // desktop, absorbing whatever slack the column has.
              <div className="flex flex-wrap items-center gap-3 lg:order-4 lg:mt-auto">
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
                    <Link2 className="size-3.5" aria-hidden="true" /> {t('website')}
                  </a>
                )}
              </div>
            )}

            {/*
             * CTA row (Invite to event / Book a Session / favorite) — Figma's DEDICATED preview
             * mockup (`383:4089` "Mindsetter's profile when he views a preview") re-checked this
             * pass shows this exact same row (same 3 controls, same styling) underneath the
             * owner's own "Public view — this is how others see your profile" banner — i.e. the
             * design does NOT hide these for the profile owner, unlike the old `variant ===
             * 'public'` gate here (which left the owner's `preview` variant with nothing, even
             * though it also shows the "this is how others see your profile" banner promising
             * exactly this). Rendered for both variants now; a Mindsetter obviously can't book
             * themselves or invite themselves to their own event, so all three controls are
             * `disabled` (+ `aria-disabled`, redundant with `disabled` on a real `<button>` but
             * kept explicit per this stage's own ask) in `preview` — Figma has no distinct
             * "disabled" visual for this state, so this reuses each control's own already-built
             * `disabled:` treatment (`Button`'s `ghost`/`primaryOutline` variants both ship one)
             * rather than inventing a new one, plus a shared `disabled:opacity-50` fallback for
             * `.inviteButton`'s `!important` color overrides, which don't have a `disabled:`
             * step of their own. */}
            {/* Placement differs by breakpoint, so the row keeps ONE DOM position and moves via
                CSS `order` — the same "keep DOM order fixed, swap via CSS order" approach
                `WhoIsMindsetterDialog`'s choice row and `MindsetterCongratsCtas` already use, and the
                only way to avoid rendering the buttons twice.
                  · mobile — DOM order, i.e. directly under the socials row (no `order-*` applies)
                  · desktop — `lg:order-*` lifts it ABOVE the location/languages block
                The location and socials blocks carry the matching `lg:order-3`/`lg:order-4`;
                everything above them keeps the default `order-0` and so stays first. */}
            <div className="flex flex-wrap items-center gap-3 lg:order-2 lg:mt-0">
              {/* Disabled unconditionally, for two independent reasons that will NOT expire
                  together: neither event invites nor session booking exists yet (hence
                  `NotYetAvailable`), and separately a Mindsetter can never invite or book
                  themselves, so `preview` must keep these inert even once the features ship.
                  Whoever removes the `NotYetAvailable` wrapper must restore
                  `disabled={variant === 'preview'}` rather than dropping `disabled` entirely. */}
              <NotYetAvailable feature="inviteToEvent" className="w-full lg:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  disabled
                  className={cn(
                    // Full-width on phones (each CTA gets its own line), auto-width from `lg` up
                    // where they sit side by side.
                    'h-14 w-full px-5 text-base font-bold disabled:opacity-50 lg:w-auto',
                    memberStyles.inviteButton,
                  )}
                >
                  <UserAddFillIcon className="size-4" aria-hidden="true" />
                  {t('inviteToEvent')}
                </Button>
              </NotYetAvailable>
              <NotYetAvailable feature="bookSession" className="w-full lg:w-auto">
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="lg"
                  disabled
                  className="w-full lg:w-auto"
                >
                  <BookSessionIcon />
                  {t('bookSession')}
                </Button>
              </NotYetAvailable>

              {/* Mobile-only twin of the "Intro about me" pill that sits on the photo from `lg`
                  up. Figma puts no such control on the mobile hero photo, so on phones it lives
                  here instead, directly under "Book a Session" — `basis-full` forces it onto its
                  own line rather than letting flex-wrap decide. Borderless and background-free
                  per the request, so it reads as a tertiary action next to the two real CTAs.
                  Not disabled in `preview`: unlike Invite/Book this only scrolls to the promo
                  video, which the owner can do on their own profile. */}
              {hasPromoVideo && (
                <a
                  href="#promo-video"
                  className="inline-flex h-14 w-full basis-full items-center justify-center gap-2 border-0 bg-transparent text-base font-bold text-foreground transition-colors hover:text-primary lg:hidden"
                >
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  {t('introVideo')}
                </a>
              )}
            </div>
          </div>

          <div
            className={cn(
              // `lg:self-start` matters more than it looks: as a flex row item this column
              // otherwise stretches to the TALLER sibling (the text column), so its box ran well
              // past the bottom of the photo — measured 612px of container under a 394px image
              // at a 1100px viewport. The "Intro about me" pill is absolutely positioned against
              // this box, so it hung ~200px below the picture and appeared frozen in place while
              // the image shrank away from it. Hugging the content pins the pill to the photo.
              'relative order-first -mx-4 w-[calc(100%_+_2rem)] sm:-mx-6 sm:w-[calc(100%_+_3rem)] lg:order-none lg:mx-0 lg:w-auto lg:max-w-[710px] lg:flex-1 lg:self-start',
            )}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className={cn(
                  'aspect-[375/440] w-full object-cover lg:aspect-[710/670]',
                  styles.portraitFrame,
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex aspect-[375/440] w-full items-center justify-center lg:aspect-[710/670]',
                  styles.portraitPlaceholder,
                )}
              >
                <User className="size-16 text-foreground/30" aria-hidden="true" />
              </div>
            )}

            {hasPromoVideo && (
              // "Intro about me" — Figma `337:1292` "Frame 424" (re-verified this pass against
              // the dedicated preview mockup `383:4089`, same button, same position): a small
              // pill OVERLAID on the portrait's bottom-left corner (NOT a plain inline link
              // below the social icons, as this used to be built — no Figma frame ever placed
              // it there), 16px from both the image's left and bottom edges (`x=746,y=705` vs
              // the image's own `x=730,y=88,w=710,h=670` → left offset 16px, bottom offset
              // 670-(705-88)-35=18px, rounded to Tailwind's 16px/`-4` step). `cornerRadius: 8`,
              // 8px/12px padding, a `gradient / brand` 1px border (same 3-stop gradient as this
              // app's own `--gradient-primary` token — see `get_styles`' `"gradient / brand"`
              // paint, pixel-identical stops) around a fully transparent interior (Figma's own
              // node carries no `fills` at all, just the border) — implemented via the same
              // masked-pseudo-element ring technique as `.winCard::before` below, since a solid
              // backdrop would incorrectly paint over the photo Figma leaves showing through.
              // `text-tiny`/14px brand-blue text, matching `.roleLinkText`'s color precedent.
              // Absent from BOTH mobile Figma frames (`401:7567`/`187:4294` — no matching text
              // node anywhere), so this is `lg:`-only, same as `.topicsCard` above.
              <a
                href="#promo-video"
                className={cn(
                  // Brand blue (#79b9e3 = `--color-primary`) at rest, matching Figma. The MOBILE
                  // twin further up is deliberately white instead — it sits on the page rather
                  // than over the photo, where blue-on-black reads as a plain link.
                  'absolute bottom-4 left-4 z-10 hidden items-center gap-2 rounded-[8px] px-3 py-2 text-tiny font-normal text-primary transition-colors hover:text-primary-hover lg:inline-flex',
                  styles.introButton,
                )}
              >
                <Play className="size-4 shrink-0 fill-current text-current" aria-hidden="true" />
                {t('introVideo')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============================== ROLES ==============================
          Stage 1.10 pixel-polish pass (ROADMAP item 2): rebuilt as an expand/collapse
          accordion — see `ExpandableAccordion.tsx` (shared with Help below) for the full Figma
          citation + the `isSafeHttpUrl` stored-XSS guard. Two-column layout (eyebrow+title left,
          accordion right) + block-level width/padding per claude.txt 2026-07-23 "1. Блок Roles"
          — see the className comments below for the individual item citations.
          STAGE 1.12: own top-level section wrapper now (see HERO's doc comment above for the
          80/150 rhythm + per-section padding citation) — was nested in the old shared wrapper. */}
      {profile.roles.length > 0 && (
        <div
          id="roles"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-[61px]">
            <div className="flex flex-col gap-8 lg:flex-1">
              <SectionEyebrow
                icon={<MagicFillIcon className="size-4 shrink-0" />}
                textClassName="leading-none"
              >
                {t('roles.eyebrow')}
              </SectionEyebrow>
              {/* Hidden on mobile per item 11 ("На телефоні тайтл приховуємо") — ROLES stays as
                  the lone header above the accordion there. */}
              <h2 className={cn('font-display max-[600px]:hidden', styles.accordionSectionHeading)}>
                {t('roles.heading')}
              </h2>
            </div>
            {/* `max-w-[643px]` + `flex-1` (item 4: capped max-width, left column absorbs the
                rest, both shrink together) — same recipe as the Hero banner's own capped column. */}
            <div className="lg:max-w-[643px] lg:flex-1">
              <ExpandableAccordion
                items={profile.roles}
                icon={<MagicFillIcon className="size-3 shrink-0 md:size-3.5" />}
                learnMoreLabel={t('roles.learnMore')}
                expandLabel={t('roles.expand')}
                collapseLabel={t('roles.collapse')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================== TOPICS I'M EXPERT (desktop-only card, `552:4907`
          "Frame 433") ==============================
          Re-verified against the current Figma pass (2026-07-21): unlike every other section
          on this page, Topics renders as its OWN self-contained dark card (`#1a1a1a`,
          32px radius, 56px padding — `552:4907`), with its eyebrow + heading CENTER-aligned
          (`552:4909`/`552:4913`, `textAlignHorizontal: CENTER`) rather than left-aligned like
          Roles/Superpowers, and the pill row centered as a group below. This block is
          genuinely ABSENT from both mobile frames (`187:4294` and the newer `401:7567` —
          scanned node-by-node: Roles is immediately followed by Superpower(s) on mobile, no
          Topics text nodes anywhere in either frame) — confirming `lg:`-only visibility is
          correct per design, not a bug, so that part of the prior build stands.
          claude.txt 2026-07-23, "1. Блок Topics i'm expert" pass: full restyle of the card
          wrapper (item 5, unchanged shape) and per-pill backgrounds (item 2, replacing the old
          `TOPIC_PILL_COLOR_CLASSES` CSS-class cycling with per-position inline gradients + a
          distinct border/text accent color — see `TOPIC_ITEM_STYLES`/`topicItemStyle` above),
          plus the heading's own dedicated gradient (`.topicsHeading`, with a forced line break
          after "mentoring" via `white-space: pre-line` — see `messages/en.json`).
          STAGE 1.12: own top-level section wrapper now (`hidden`/`lg:block` unchanged — still
          desktop-only). */}
      {profile.topics.length > 0 && (
        <div className="mx-auto mt-20 hidden w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:block lg:px-[70px]">
          <div
            className={cn(
              'flex flex-col items-center gap-8 px-8 py-10 text-center lg:px-14 lg:py-14',
              styles.topicsCard,
            )}
          >
            <SectionEyebrow icon={<MicAiFillIcon className="size-4 shrink-0" />}>
              {t('topics.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display', styles.topicsHeading)}>{t('topics.heading')}</h2>
            <div className="mx-auto flex max-w-[640px] flex-wrap items-center justify-center gap-3">
              {profile.topics.map((topic, index) => {
                const itemStyle = topicItemStyle(index);
                return (
                  <span
                    key={topic}
                    className="rounded-full border px-6 py-4 text-base font-bold"
                    style={{
                      background: itemStyle.gradient,
                      borderColor: itemStyle.accent,
                      color: itemStyle.accent,
                    }}
                  >
                    {topic}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================== SUPERPOWER(S) ==============================
          claude.txt 2026-07-23, "1. Блок Superpower(s)" — mobile is a peek-carousel (item 8:
          319px cards, next one visible at the edge) with bespoke nav arrows (items 9/10);
          desktop is a static 3-up row (no scrolling possible since `MAX_SUPERPOWERS` caps the
          data at 3), so the arrow row is hidden there — same `CardSlider` component the other
          carousels use, just with its cards' width made responsive and its default arrow chrome
          swapped out via the `arrows` prop (see `CardSlider.tsx`).
          STAGE 1.12: own top-level section wrapper now (unchanged). */}
      {profile.superpowers.length > 0 && (
        <div
          id="superpowers"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="mb-6 lg:mb-8">
            <SectionEyebrow icon={<FlashlightFillIcon className="size-4 shrink-0" />}>
              {t('superpowers.eyebrow')}
            </SectionEyebrow>
          </div>
          <h2
            className={cn(
              'font-display lg:mb-[50px] max-[600px]:hidden',
              styles.superpowersHeading,
            )}
          >
            {t('superpowers.heading')}
          </h2>
          <CardSlider
            prevLabel={t('carousel.prev')}
            nextLabel={t('carousel.next')}
            // Bleed the TRACK past the section's own `px-4 sm:px-6` on mobile/tablet (negative
            // margin + width compensation reaches the true viewport edge) — the gutter comes
            // back as real spacer flex items (below), NOT track padding: padding interacting
            // with `scroll-snap` left `scrollLeft` resting at a non-zero value (the first card
            // looked stuck to the edge AND the prev arrow read as scrollable at rest — claude.txt
            // 2026-07-23 follow-up). A plain flex spacer has no such snap ambiguity. Cancelled at
            // `lg:`, a static non-scrolling row.
            trackClassName="-mx-4 w-[calc(100%_+_2rem)] gap-4 sm:-mx-6 sm:w-[calc(100%_+_3rem)] lg:mx-0 lg:w-auto lg:gap-5"
            arrowGapClassName="gap-4"
            arrowRowClassName="lg:hidden"
            arrows={{
              prevEnabled: <SuperpowerArrowFilled mirrored />,
              prevDisabled: <SuperpowerArrowOutline />,
              nextEnabled: <SuperpowerArrowFilled />,
              nextDisabled: <SuperpowerArrowOutline mirrored />,
            }}
          >
            {/* Real flex-item spacers (not track padding — see the `trackClassName` comment
                above for why), `w-0` since the track's own `gap-4` already contributes the full
                16px gutter next to each spacer — a nonzero width here would stack on top of
                that gap (16+16=32px, not 16px). `snap-start` on the spacer itself is required,
                not optional — without it, `scroll-snap-type: mandatory` had no valid snap point
                at `scrollLeft: 0` (only the real cards were snap targets, and the nearest one
                sits a gap-width in), so the browser force-corrected the initial scroll position
                to card 1's own snap point on load — hiding the spacer and leaving `scrollLeft`
                non-zero, which also made the prev arrow read as scrollable at rest. */}
            <div className="w-0 shrink-0 snap-start lg:hidden" aria-hidden="true" />
            {profile.superpowers.map((superpower, index) => {
              const cardStyle = superpowerCardStyle(index);
              const numberColor = superpowerNumberColor(index);
              // The first/last card do NOT get their own `snap-start` — only the (zero-width)
              // leading/trailing spacers do. Two snap points 16px apart at each end (spacer's
              // AND the edge card's own) meant `scrollByPage` could land on either one somewhat
              // arbitrarily: the card's own point shows it flush against the bled edge (no
              // gutter), needing one more "prev" press to reach the spacer's point and reveal
              // the gutter. One snap point per end removes the ambiguity.
              const isEdgeCard = index === 0 || index === profile.superpowers.length - 1;
              return (
                <div
                  key={`${superpower.title}-${index}`}
                  className={cn(
                    'flex w-[319px] min-h-[285px] shrink-0 flex-col gap-4 rounded-[12px] p-4 lg:w-auto lg:min-h-[370px] lg:shrink lg:flex-1 lg:rounded-[24px] lg:p-8',
                    !isEdgeCard && 'snap-start',
                  )}
                  style={{ background: cardStyle.background }}
                >
                  <span
                    className="mb-auto inline-flex items-center gap-1 text-tiny font-bold tracking-[0.3em] uppercase"
                    style={{ color: numberColor.text }}
                  >
                    <SuperpowerNumberIcon className="size-3.5 shrink-0" fill={numberColor.icon} />
                    {index + 1}
                  </span>
                  <h3 className={cn('font-display text-[24px] lg:text-l', cardStyle.textClassName)}>
                    {superpower.title}
                  </h3>
                  <p className={cn('text-body whitespace-pre-line', cardStyle.textClassName)}>
                    {superpower.description}
                  </p>
                </div>
              );
            })}
            <div className="w-0 shrink-0 snap-start lg:hidden" aria-hidden="true" />
          </CardSlider>
        </div>
      )}

      {/* ============================== PROMO VIDEO ==============================
          See `.promoCard`'s doc comment in `MindsetterProfileView.module.css` for the full
          Figma re-verification (`552:4953` desktop / `401:8067`-`401:8076` mobile): desktop is
          a full-bleed card (text left, portrait thumbnail right); mobile drops the card
          background/padding AND the heading, showing only the eyebrow above a flush full-width
          thumbnail. The thumbnail's click-to-reveal play state lives in `PromoVideoPlayer.tsx`
          (small client island — this page is otherwise a Server Component).
          STAGE 1.12: split into an outer section wrapper (standard `mx-auto max-w-[1440px]
          px-4 sm:px-6 lg:px-[70px]` + the new `mt-20 lg:mt-[150px]` rhythm, id/scroll-mt moved
          here) and an inner card div that keeps its EXACT previous classes (`md:px-[70px]
          md:py-16` etc.) unchanged — re-verified against `552:4953`: the card's own rounded
          background spans the SAME 1296px-wide content column as every other section (it does
          NOT bleed further), so its internal `md:px-[70px]` text-inset and the outer wrapper's
          `lg:px-[70px]` page-edge inset are two distinct, non-overlapping paddings (previously
          both lived on one div, which worked by coincidence since both values happen to be
          70px — separated now for clarity, not because the old value was wrong). */}
      {hasPromoVideo && (
        <div
          id="promo-video"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div
            className={cn(
              'flex flex-col gap-8',
              'md:flex-row md:items-center md:justify-between md:gap-12 md:overflow-hidden md:px-[70px] md:py-16',
              styles.promoCard,
            )}
          >
            <div className="flex flex-col gap-6 md:max-w-[580px]">
              {/* STAGE 1.11 follow-up: Figma's actual eyebrow glyph here (`552:4963`/`552:4964`
                  desktop, `401:8069`/`401:8070` mobile — both named "triangle") is a small
                  filled play-triangle, the SAME shape as the video thumbnail's own big
                  "Click for watching" play glyph (`552:4958`/`401:8074`) — NOT
                  `PromoVideoBlockIcon`'s camera/video-recorder silhouette (that icon is for the
                  onboarding "Make your profile shine" block-picker row, `ShineForm.tsx` via
                  `SHINE_BLOCK_ICONS`, a different context — left untouched there). Reusing
                  `lucide-react`'s `Play`, already used for this exact glyph elsewhere on this
                  same page (the hero's "watch intro" link above, and `PromoVideoPlayer.tsx`'s
                  own big play button), keeps one glyph for one shape instead of adding a
                  duplicate hand-drawn triangle SVG. */}
              <SectionEyebrow
                icon={<Play className="size-4 fill-primary text-primary" aria-hidden="true" />}
              >
                {t('promo.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('font-display text-h2 max-[600px]:hidden', styles.gradientHeading)}>
                {t('promo.heading')}
              </h2>
            </div>
            <PromoVideoPlayer
              videoUrl={profile.promoVideoUrl}
              embedUrl={promoEmbedUrl}
              title={t('promo.heading')}
              clickToWatchLabel={t('promo.clickToWatch')}
              /* STAGE 1.12 mobile re-verification: `401:8072` "Frame 37" is 345×450 on mobile
                 (~0.766 ratio), NOT the same 372×524 (~0.710 ratio) as the desktop thumbnail
                 `552:4956` — was applying the desktop ratio at every breakpoint, which rendered
                 mobile ~7% taller than Figma.
                 Follow-up: `max-w-[372px]` was capping the mobile thumbnail well below the
                 section's own content width, leaving dead space either side inside the normal
                 `px-4 sm:px-6` section padding. Moved the cap to `md:` only, so mobile now fills
                 the section's full padded width (not edge-to-edge past it — same inset every
                 other section on this page uses), while desktop keeps its bounded side-by-side
                 thumbnail width. */
              /* ORIENTATION (2026-08-14): the two profile frames — `327:1080` "video vertical"
                 and `383:2070` "video horizontal" — differ ONLY in this box's aspect and width;
                 the eyebrow, heading, card background and play button are identical in both. So
                 there is one layout here and a swapped ratio, not two layouts.
                 Portrait: 372×524 desktop / 345×450 mobile (the frames' own two ratios).
                 Landscape: ~523×371 desktop, and 16:9 on mobile where the design has no
                 horizontal variant at all — extrapolated, since a portrait box would letterbox a
                 landscape video with black bars down both sides. */
              className={cn(
                'relative w-full shrink-0',
                promoOrientation === 'vertical'
                  ? 'aspect-[345/450] md:aspect-[372/524] md:max-w-[372px]'
                  : 'aspect-video md:aspect-[523/371] md:max-w-[523px]',
              )}
            />
          </div>
        </div>
      )}

      {/* ============================== NUMBERS ==============================
          STAGE 1.12: own top-level section wrapper now (content unchanged).
          STAGE 1.12 mobile re-verification: `401:7739` "Frame 38" (mobile Numbers eyebrow) is
          followed directly by the stat-card grid — no "The track record" H2 text node anywhere
          on `401:7567` — so the heading is mobile-`hidden` (was rendering unconditionally).
          Follow-up precision re-verification pass (double-checked border/size/font against
          `552:4979`-`552:4988` desktop, `401:7744`-`401:7755` mobile):
          - Desktop card content isn't a tight `gap-2` stack — Figma's frame is a fixed 302×258
            box with the value pinned to the top and the label pinned to the bottom (huge
            effective spacing between them, ~107px), while mobile genuinely is a tight ~9px
            stack. `md:aspect-[151/129]` (302:258 reduced) + `md:justify-between md:gap-0`
            reproduce that; mobile keeps its own `gap-2`.
          - Label ("years in entrepreneurship" etc.) is Manrope **Medium (500)** on mobile vs
            **Regular (400)** on desktop in Figma — was rendering at the same (default/regular)
            weight on both. `font-medium md:font-normal` on the label span fixes this. */}
      {profile.numbers.length > 0 && (
        <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
          <div className="flex flex-col gap-8">
            <SectionEyebrow icon={<NumbersBlockIcon className="size-4" />}>
              {t('numbers.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h2 max-[600px]:hidden', styles.gradientHeading)}>
              {t('numbers.heading')}
            </h2>
            <div
              className={cn(
                'grid gap-2.5 md:gap-5',
                NUMBER_GRID_COLUMN_CLASSES[Math.min(profile.numbers.length, 4)] ??
                  'grid-cols-2 md:grid-cols-4',
              )}
            >
              {profile.numbers.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={cn(
                    'flex flex-col gap-2 p-4 md:justify-between md:gap-0 md:p-8',
                    // A full row of four keeps the design's exact card proportion. Anything
                    // fewer swaps it for a plain min-height, because a stretched card is much
                    // wider and `aspect-[151/129]` would scale its height to match — two cards
                    // across a 1300px row would stand ~550px tall. Capping that with
                    // `max-height` does NOT work either: with an aspect ratio set, the browser
                    // shrinks the WIDTH to preserve the ratio, so the card stops filling its
                    // track (measured: 421px inside a 537px column). Dropping the ratio is the
                    // only way to actually stretch.
                    profile.numbers.length === 4
                      ? 'md:aspect-[151/129]'
                      : 'md:min-h-[220px] md:justify-between',
                    styles.numberStat,
                    styles[numberStatColorClass(index)],
                  )}
                >
                  <span
                    className={cn(
                      'break-words font-display text-h3 md:text-h2',
                      styles.numberStatValue,
                    )}
                  >
                    {item.value}
                  </span>
                  <span className="text-body font-medium md:font-normal">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================== WHAT CAN I HELP WITH ==============================
          Figma (`552:4991` "Frame 444" desktop / `401:7758` "Frame 480" mobile): NOT a static
          `divide-y` list of always-visible descriptions with a circular `NumberBadge` — it's
          an accordion identical in shape to Roles (`RolesAccordion.tsx`/`HelpWithAccordion.tsx`
          for the full node citation), and desktop additionally splits into two columns —
          eyebrow+heading in a 499px-wide left column (`552:4992` "Frame 268"), the accordion in
          a 643px-wide right column (`552:4997` "Frame 211"), ~154px gutter between (approximated
          here with `lg:justify-between` + explicit widths rather than a hardcoded gap). Collapses
          to a single stacked column on mobile — `401:7567` has no matching two-column split.
          STAGE 1.12: own top-level section wrapper now (content unchanged).
          STAGE 1.12 mobile re-verification: `401:7758` "Frame 480" goes straight from the
          eyebrow (`401:7759` "Frame 44") to the accordion (`401:7762` "Frame 210") — no "The
          challenges I help founders navigate" H2 text node anywhere on `401:7567` — so the
          heading is mobile-`hidden`, same as Promo video/Numbers (was rendering
          unconditionally). Row gap/index-number/title sizing were already correct (24px
          `gap-6` between rows matches Figma's own 24px row-to-row gap exactly; `text-tiny`'s
          existing 12px-mobile/14px-desktop step and the row title's explicit `text-[24px]
          md:text-l` already match Figma's mobile/desktop type sizes) — no other change needed
          in `HelpWithAccordion.tsx`. */}
      {profile.helpWith.length > 0 && (
        <div
          id="help"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-8 lg:max-w-[499px]">
              <SectionEyebrow icon={<BagIcon className="size-3 shrink-0" />}>
                {t('help.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('font-display text-h2 max-[600px]:hidden', styles.gradientHeading)}>
                {t('help.heading')}
              </h2>
            </div>
            <HelpWithAccordion
              items={profile.helpWith}
              expandLabel={t('help.expand')}
              collapseLabel={t('help.collapse')}
            />
          </div>
        </div>
      )}

      {/* ============================== REEL LIFE ==============================
          Shown only once there are `MIN_REEL_LIFE_PHOTOS_TO_DISPLAY` (7) photos — enough to fill
          the grid's two rows (2026-08-14 product rule). Below that the section is hidden rather
          than rendered half-empty. Uploading fewer is still allowed and still saves; the cabinet
          card and the wizard step both say so. */}
      {profile.reelLifePhotoUrls.length >= MIN_REEL_LIFE_PHOTOS_TO_DISPLAY && (
        <div id="reel-life" className="mt-20 scroll-mt-24 lg:mt-[150px]">
          {/* Eyebrow/heading stay in the normal constrained content column (STAGE 1.12: own
              top-level section wrapper like every other section, see HERO's doc comment) — only
              the tile track itself breaks out full-bleed below. Figma (`552:4490` "Frame 271")
              CENTER-aligns this eyebrow+heading across the full 1440px frame width (not
              left-aligned within the 1300px content column like every other section's own
              heading) — confirmed via its own bounds: a 814px-wide block sitting at x=313, and
              313 = (1440-814)/2 exactly. Reproduced on desktop (`lg:items-center lg:text-center`)
              per explicit user direction; mobile keeps the page's normal left-aligned style since
              Figma's mobile frame shows no such centering. */}
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
            <div className="flex flex-col gap-8 lg:items-center lg:text-center">
              <SectionEyebrow icon={<ReelLifeBlockIcon className="size-4" />}>
                {t('reelLife.eyebrow')}
              </SectionEyebrow>
              {/* Heading and quote are DESKTOP ONLY (2026-08-14 request): the mobile frames show
                  the photo strip under the eyebrow alone, with no heading and no quote. */}
              <h2
                className={cn(
                  'font-display text-h3 max-[600px]:hidden md:text-h2',
                  styles.gradientHeading,
                )}
              >
                {/* The break after the em dash is the frame's own two-line split, so it's real
                    markup rather than trusting the column width to wrap in the same place. */}
                {t.rich('reelLife.heading', { br: () => <br /> })}
              </h2>

              {philosophyQuote ? (
                // 583px block in the frame, centred on the same axis as the heading. The two
                // decorative marks hang OUTSIDE it — top-left of the quote and bottom-right of the
                // attribution — so they sit in the margin rather than pushing the text around.
                <figure className="relative mx-auto w-full max-w-[583px] px-10 max-[600px]:hidden lg:px-0">
                  <QuoteMarkIcon className="absolute -top-4 left-0 text-card lg:-left-14" />
                  <blockquote className="font-display text-[24px] leading-[1.31] text-foreground md:text-[32px]">
                    {philosophyQuote}
                  </blockquote>
                  {philosophyAuthor ? (
                    <figcaption
                      className={cn(
                        'mt-2 text-right text-tiny font-bold tracking-[0.3em] uppercase',
                        styles.quoteAuthor,
                      )}
                    >
                      —{philosophyAuthor}
                    </figcaption>
                  ) : null}
                  <QuoteMarkIcon className="absolute -bottom-4 right-0 text-card lg:-right-14" />
                </figure>
              ) : null}
            </div>
          </div>

          {/* STAGE 1.12 RE-VERIFICATION (2026-07-23, explicit user direction — reverses the
              STAGE 1.11 "flatten to one CardSlider row" simplification below): re-measured the
              tile rectangles directly (desktop `552:4642`-`552:4649` "Rectangle 13"-"20", mobile
              `401:7881`-`401:7886` "Rectangle 13"-"19") rather than just their containing frame.
              Findings: (1) genuinely 2 rows, not 1 — desktop row 1 (y=5632: x=-370,180,730,1280,
              4 tiles) and row 2 (y=6069: x=-95,455,1005, 3 tiles) both step every 550px (530
              tile + ~20 gap), with row 2 offset by exactly +275 from row 1 — a clean half-tile-
              step stagger; mobile row 1 (y=4603: x=-147,73,293, 3 tiles) and row 2 (y=4778:
              x=-33,187, 2 tiles) step every 220px (212 tile + ~8 gap), row 2 offset by ~+114 —
              same half-step pattern at roughly half the scale. (2) BOTH rows genuinely bleed
              past the frame's own edges on both sides — desktop row 1 spans -370..1810 against
              a 1440-wide frame (370px overflow each side), row 2 spans -95..1535 (95px overflow
              each side); mobile row 1 spans -147..505 against a 375-wide frame. This is Figma's
              own way of signalling "this content continues past what the mockup can show" (a
              frame can't depict true 100vw), which is exactly what the user's own re-look at
              Figma concluded: a real full-viewport-width slider, not a contained one — so this
              rebuilds the STAGE 1.11 flat single row as this full-bleed 2-row version instead.
              (3) only ONE prev/next control exists per breakpoint (desktop `552:4610` "Frame
              227", mobile `401:7830` "Frame 228" — same single circular pair as before, not one
              per row), so both rows scroll together as ONE unit rather than two independently
              scrollable tracks: `reelLifePhotoRows` (see this component's own top-of-function
              comment) is rendered as a single flex-col two-row block and passed as `CardSlider`'s
              lone `children`, so the existing single-ref `scrollBy`/arrow-disabled-state
              mechanism keeps working completely unmodified — the visual stagger is achieved with
              a static `ml-[…]` offset on row 2 alone (CSS, not scroll position), so it holds at
              any scroll offset. `CardSlider` gained one new `snap={false}` opt-out for this case
              (see that component's own doc comment) since per-card scroll-snap doesn't cleanly
              apply to a mixed two-row block. The track's OUTER wrapper below breaks out to full
              viewport width via the standard `w-screen relative left-1/2 right-1/2 -mx-[50vw]`
              technique, deliberately OUTSIDE the `max-w-[1440px] px-…` column the heading above
              stays inside (per this stage's explicit instruction). Tile aspect ratio (530:417
              desktop, 212:167 mobile) is unchanged from STAGE 1.11 — still `.reelLifeTile`'s
              `aspect-ratio`, not a hardcoded pixel width, so it keeps scaling cleanly.

              STAGE 1.12 PRECISION FIX (2026-07-23, explicit user direction): the rest state (no
              interaction yet) rendered left-aligned (native `overflow-x-auto` default
              `scrollLeft: 0`), which doesn't match the arrangement above — re-deriving the exact
              arithmetic from the same Figma coordinates shows both rows are actually centered on
              their frame's own center (desktop `(-370+1810)/2 === (-95+1535)/2 === 720 ===
              1440/2` exactly; mobile close to the same, `179`/`183` vs frame-center `187.5`), so
              Figma's snapshot IS the intended rest state, just constrained by its own fixed-width
              frame — not a mid-scroll frame to reproduce literally. `CardSlider` now gained an
              `initialScrollAlign="center"` opt-in (see that component's own doc comment for the
              full derivation, the mobile-vs-desktop math, and the ≳1622px desktop / not-really-
              achievable-on-phones mobile thresholds) that centers the track's real, live-measured
              `scrollWidth`/`clientWidth` on mount instead of a hardcoded pixel offset — the only
              mechanism that stays correct regardless of viewport width or how many photos a real
              profile has (`reelLifePhotoRows`' `ceil(total/2)` split isn't breakpoint-conditional,
              so there's no single "correct" fixed margin to hardcode here). */}
          {/* 48px from the quote's attribution down to the photo grid — the frame's own gap
              (2026-08-14 request). Applies to the eyebrow-only mobile case too, where this is the
              space under the eyebrow. */}
          <div className="relative left-1/2 right-1/2 mt-12 w-screen -mx-[50vw]">
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              trackClassName="px-4 sm:px-6 lg:px-[70px]"
              snap={false}
              initialScrollAlign="center"
            >
              <div className="flex w-max shrink-0 flex-col gap-4">
                {reelLifePhotoRows.map((rowUrls, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={cn('flex gap-4', rowIndex === 1 && 'ml-[148px] lg:ml-[273px]')}
                  >
                    {rowUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className={cn(SLIDER_ITEM_BASE, 'lg:w-[530px]', styles.reelLifeTile)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private-bucket URL */}
                        <img src={url} alt="" className="size-full object-cover" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardSlider>
          </div>
        </div>
      )}

      {/* ============================== MY EVENTS ==============================
          Hidden per product decision (2026-07-23) — no Events system exists yet (ROADMAP stage
          1.10 open item), and the previous neutral "no events yet" empty-state placeholder isn't
          part of this pass's restyle. Markup kept here (commented out) for that later stage:
      <div
        id="my-events"
        className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
      >
        <div className="flex flex-col gap-8">
          <SectionEyebrow
            icon={<CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />}
          >
            {t('myEvents.eyebrow')}
          </SectionEyebrow>
          <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
            {t('myEvents.heading')}
          </h2>
          <div
            className={cn(
              'flex flex-col items-center gap-3 px-6 py-16 text-center',
              styles.sectionCard,
            )}
          >
            <CalendarOff className="size-8 text-foreground/30" aria-hidden="true" />
            <p className="font-display text-l">{t('myEvents.emptyTitle')}</p>
            <p className="max-w-[420px] text-tiny text-foreground/60">
              {t('myEvents.emptyDescription')}
            </p>
          </div>
        </div>
      </div>
      */}

      {/* ============================== REVIEWS (static, carousel) ==============================
          Figma `552:4496` "Frame 448": the card row (`552:4512` "Frame 273") is 1740px wide across
          4×420px cards — wider than the ~1300px content column — with a dedicated prev/next
          control (`552:4605`) centered below it, i.e. a real carousel (`CardSlider.tsx` — see the
          note at the call site below for why it is that and not `EmblaCarousel.tsx`), not the
          static `md:grid-cols-3` this section rendered before. */}
      {/* Top/bottom padding is intentionally asymmetric: 86px (not 150px) on top because "My
          Events" directly above already contributes its own 64px bottom padding (`py-16`) — 64 +
          86 = the requested 150px visible gap. The bottom side has no such neighbor contribution
          (CTA Banner #1's wrapper below has zero vertical padding of its own), so it stays a flat
          150px. Do NOT "simplify" this back to a symmetric `py-[150px]` — that would double the
          gap above this section to 214px. The responsive-spacing pass (150/100/80 tiers via
          `styles.paddingBottom150`) kept this asymmetric-padding shape rather than adopting the
          stage-1.12 `mt-20 lg:mt-[150px]` margin form, since this section's full-bleed carousel
          (below) needs the outer `#reviews` div to stay a bare, max-width-less wrapper. */}
      <div id="reviews" className={cn('scroll-mt-24 pt-16 md:pt-[86px]', styles.paddingBottom150)}>
        {/* `px-4` (16px) is the unprefixed base tier here — already exactly the requested ≤600px
            side padding with no change needed (`sm:`/`lg:` only widen it above 640px/1024px). */}
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 sm:px-6 lg:px-[70px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-4 md:gap-8">
              <SectionEyebrow icon={<ReviewChatIcon className="size-3 shrink-0" />}>
                {t('reviews.eyebrow')}
              </SectionEyebrow>
              <h2
                className={cn(
                  'font-display text-h3 max-[600px]:hidden md:text-h2 md:max-w-[588px]',
                  styles.gradientHeading,
                  styles.reviewsHeading,
                )}
              >
                {t('reviews.heading')}
              </h2>
            </div>
            {/* Leaving a review has no backend yet (post-session review flow is a later stage). */}
            {/* Full-width on phones (the heading row stacks there, so a 250px button floating
                on its own line reads as unfinished), natural width from `sm` up where it sits
                beside the heading. The wrapper has to stretch too — it is the flex item. */}
            <NotYetAvailable feature="reviews" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="primaryOutline"
                disabled
                className="w-full shadow-none disabled:opacity-50 sm:w-auto sm:min-w-[250px]"
              >
                <ReviewLeaveIcon className="size-4" />
                {t('reviews.leaveReview')}
              </Button>
            </NotYetAvailable>
          </div>
        </div>
        {/* Cards live INSIDE the content grid, not full-bleed to the viewport (2026-08-06
            request: "slides should start at the left edge of the content grid").
            This mirrors My WINS above exactly, which already had the requested behaviour:
              · the same `max-w-[1440px]` + `px-4 sm:px-6 lg:px-[70px]` column, so the first card
                lines up with the eyebrow/heading rather than with the window edge;
              · `max-[600px]:px-0 max-[600px]:pl-4` — below 600px only the LEFT gutter survives,
                so cards still start on the grid but run off the right edge, which is what makes
                a phone carousel read as swipeable;
              · `align="start"` so embla parks a slide's left edge on that gutter instead of
                centring the row.
            The previous `w-screen -translate-x-1/2` full-bleed wrapper is gone — that is what
            pushed the first card out to the raw viewport edge.
            NOTE on the Superpowers comparison: its zero-width `snap-start` spacers can't be
            reused here. That slider is native CSS scroll-snap, where a spacer is just a snap
            target; embla positions slides by transform and would count a spacer as a real slide,
            throwing off both the slide count and the arrow-visibility test. Column padding
            achieves the same visual gutter without fighting the library. */}
        {/* No `max-w-[1440px]` and no padding here, unlike every other section wrapper on this
            page — deliberately, and this is the whole fix for "the container clips slides above
            1440px" (2026-08-06). The track used to live inside the capped column and bleed back
            out of it with `-mx-[70px]`, which reaches the COLUMN's edge — 1440px wide, centred,
            with dead space either side on a wider monitor. Cards were therefore cut at 1440
            rather than at the window. This wrapper is now full-width so the track is too, and the
            content-grid gutter is handed back by the two spacers below (which grow past 1440 to
            follow the centred column) instead of by padding-plus-negative-margin. */}
        <div className="mt-8 w-full md:mt-[50px]">
          {/* `CardSlider`, not `EmblaCarousel` — deliberately switched on 2026-08-06.
              Removing the infinite loop exposed that embla was the wrong tool for THIS row:
              embla sizes slides as a fraction of its track, but these review cards are a fixed
              420px and `shrink-0`, so they overflow a track that stays at viewport width
              (measured: 1425px of track holding 2234px of cards). Looping hid it — that code
              path never consults the scroll limit — but with `loop: false` embla derived a
              ~14px travel and disabled the next arrow with four cards still off-screen. That
              is exactly the "next stays live, one more press nudges it slightly" report.
              `CardSlider` is native CSS scroll-snap over real overflow, which is what a row of
              fixed-width cards actually is; it has no loop, and its arrows already track true
              scroll position. It is also the very component Superpowers uses, so the
              bleed-plus-spacer gutter below is now the identical technique rather than an
              approximation of it. */}
          <CardSlider
            prevLabel={t('carousel.prev')}
            nextLabel={t('carousel.next')}
            // One card per press at every width, desktop included (2026-08-06 request).
            scrollStep="item"
            // Gap only. The track already spans the window because its wrapper does (see the
            // comment above it) — the previous negative-margin bleed is gone, since bleeding out
            // of a `max-w-[1440px]` column only ever reached that column's edge, not the screen's.
            // The gutter now comes from `scroll-padding` plus edge-card margins (`.reviewsTrack`),
            // which is what the other three full-bleed sections use.
            trackClassName={cn('gap-4', styles.reviewsTrack)}
          >
            {reviews.map((review, index) => (
              <div
                key={`${review.name}-${index}`}
                className={cn(
                  'shrink-0',
                  'flex min-h-[330px] flex-col gap-4 p-6',
                  styles.reviewCard,
                  // EVERY card is a snap target, and always start-aligned. This replaced a
                  // spacer-based setup (two `snap-start` gutter spacers, `snap-center` on phones,
                  // both edge cards excluded from snapping) on 2026-08-06, because that left the
                  // snap positions UNEVENLY spaced: the spacers' own points sat one gutter away
                  // from the card grid, so a one-card press travelled 506px against a 436px card
                  // pitch and parked middle cards flush against the window edge. Uniform
                  // `snap-start` + the track's `scroll-padding` puts every stop exactly one pitch
                  // apart AND every card on the content grid.
                  // Resting positions are unchanged on phones: the card is `100% - 32px` there, so
                  // start-aligning it behind a 16px scroll-padding lands it exactly where
                  // centring used to.
                  'snap-start',
                  // The row's inset to the grid rides on the edge cards themselves — see
                  // `.winsFirstCard` for why not spacer elements.
                  index === 0 && styles.reviewsFirstCard,
                  index === reviews.length - 1 && styles.reviewsLastCard,
                  // NOTE: the last slide used to carry `mr-4` here. That was a `loop: true`-only
                  // workaround (CSS `gap` never renders at the loop seam, because looping wraps
                  // from the last item straight back to the first with no "next" item for the
                  // gap to sit against). Looping is off as of 2026-08-06, so the margin no
                  // longer patches anything — it just added 16px of empty scrollable space past
                  // the final card, which is what left the "next" arrow live at the end and made
                  // one more press nudge the row a little further. Removed deliberately; do not
                  // reinstate it without turning `loop` back on.
                )}
              >
                <span
                  className={cn(
                    'inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-tiny',
                    styles.reviewBadge,
                  )}
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {t('reviews.verifiedMember')}
                </span>
                <ReviewQuoteText
                  quote={review.quote}
                  readMoreLabel={t('reviews.readMore')}
                  // The reviewer's own name is the most useful heading for the full quote.
                  dialogTitle={review.name}
                  closeLabel={t('closeDialog')}
                />
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-white text-primary">
                        {getReviewerInitials(review.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{review.name}</p>
                      <p className="text-tiny text-foreground/60">{review.role}</p>
                    </div>
                  </div>
                  <ReviewCompanyLogoIcon className="h-[42px] w-auto shrink-0 opacity-70" />
                </div>
              </div>
            ))}
          </CardSlider>
        </div>
      </div>

      {/* ============================== CTA BANNER #1 ==============================
          `max-w-[1440px]` + `lg:px-[70px]` is the standard content column (stage 1.12 fixed a
          prior `max-w-[1300px]` double-inset bug — Figma `552:4630` "Frame 58" is `x=70,
          width=1300` directly under the 1440-wide root, i.e. the SAME 70px-inset column every
          section uses). Bottom spacing uses this page's own responsive 150/100/80 tier
          (`styles.spacingBottom150`) rather than stage-1.12's coarser `mt-20 lg:mt-[150px]`. */}
      <div
        id="cta-banner-1"
        className={cn(
          'mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:px-[70px]',
          styles.spacingBottom150,
        )}
      >
        <CtaBanner
          heading={t('ctaBanner1.heading')}
          price={price}
          inviteLabel={t('inviteToEvent')}
          bookLabel={t('bookSession')}
        />
      </div>

      {/* ============================== MY WINS (carousel) ==============================
          Figma `552:5069` "Frame 446": the card row (`552:5078` "Frame 274") is 4600px wide
          across 7×640px sample cards — wider than the content column — with its own prev/next
          control (`552:4625`) centered below, i.e. a carousel, not the `md:grid-cols-3` this
          section rendered before. Order fix: this section is FIRST of the three (right after CTA
          banner #1), not last — see this component's own top doc comment for the full
          re-measurement citation. STAGE 1.12: own top-level section wrapper now (was nested with
          My Way/F*ckUp(s)/video blog in one shared `max-w-[1440px]` div).
          Fix (2026-07-23), reverting the immediately preceding round's full-bleed + peek-viewport
          treatment: re-verified against precise Figma measurements (still `552:5078`/node
          `327:1080`, 1440px-wide frame) — the card row sits at x=70, the SAME 70px left inset
          every other section on this page uses (`lg:px-[70px]`), NOT bled to the literal browser
          viewport edge. 2 cards (640px each) + 1 gap (20px, NOT 16px/`gap-4` — a real correction)
          = 1300px exactly, which is this page's own standard content-column width (1440 − 70 − 70
          = 1300, matching e.g. the CTA banner's `max-w-[1300px]`); card 3 starts at x=1390,
          entirely outside that column — ZERO peek, not a partial sliver. So this section is back
          to a normal (non-full-bleed) content column, same shape as My Events/Beyond Business
          above/below, with no separate viewport cap needed: the carousel's viewport is just
          100% of its own padded parent, which is naturally ~1300px on desktop — exactly the
          640+20+640 math above. `align="start"` (not the default `'center'`) shows flush-left
          pairs — embla's default `slidesToScroll: 1` plus a ~1300px viewport that exactly fits
          2×640+20 naturally shows exactly 2 full cards and scrolls one at a time, matching "2
          visible, cyclic, one loop step at a time" without any extra config.
          Card-width breakpoint (2026-07-23 follow-up, code review): the 640px width below is
          gated on `min-[1450px]:` rather than the more obvious `lg:` (1024px). This wrapper's
          content column is `viewport − 140px` (70px × 2 side padding) for any real viewport
          between 1024px and 1440px, only reaching the full 1300px (2×640+20) two-card width once
          the real viewport hits 1440px (`1440 − 140 = 1300`); above 1440px the wrapper's own
          `max-w-[1440px]` caps it flat at 1300px. So `lg:` (1024px) would flip cards to 640px
          while the actual content column is still narrower than 1300px for the very common
          1024–1439px desktop window range, cropping the second card mid-card inside embla's
          `overflow-hidden` viewport — contradicting the "always exactly 2 full cards, never
          cropped" requirement above. `min-[1450px]` (an arbitrary-value Tailwind breakpoint, not
          a stock one) waits until the column has genuinely reached 1300px, plus a small 10px
          safety margin for zoom/font-scaling edge cases, before promoting cards to 640px; below
          that they stay at the existing 280px width (no width was ever defined for the
          1024–1449px range, so nothing is being removed — only delayed until it's safe). */}
      {profile.wins.length > 0 && (
        <div id="wins" className="mt-16 w-full scroll-mt-24">
          {/* Heading keeps the standard capped content column; the carousel below deliberately
              does NOT (see its own comment). They used to share one wrapper, whose
              `max-[600px]:px-0 max-[600px]:pl-4` was how the OLD carousel got its mobile
              right-edge bleed — that trick is obsolete now the track is genuinely full-width, so
              this half goes back to the plain column padding every other section uses. */}
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
            <div className="flex flex-col gap-8 max-[768px]:gap-6 max-[768px]:mb-6 md:mb-[50px]">
              {/* Heading(or, ≤600px, just the eyebrow since the H2 is hidden there)→cards gap:
                50px on desktop (`md:mb-[50px]`, restored — the section's own carousel wrapper
                below carries no margin of its own precisely so THIS is the single source of
                truth for that gap), 24px at ≤768px (`max-[768px]:mb-6`) regardless of whether
                the H2 itself is visible (601–768px) or hidden (≤600px, `max-[600px]:hidden`) —
                margin-bottom on this wrapper always lands right after its own last VISIBLE
                child, so one rule covers both mobile states without extra conditions. */}
              <SectionEyebrow icon={<MyWinsBlockIcon className="size-4" />}>
                {t('wins.eyebrow')}
              </SectionEyebrow>
              <h2
                className={cn(
                  'font-display text-h3 max-[600px]:hidden md:text-h2',
                  styles.gradientHeading,
                )}
              >
                {t('wins.heading')}
              </h2>
            </div>
          </div>
          {/* No top margin/gap here on purpose (explicit request, both desktop and mobile) — this
              is a SIBLING of the eyebrow+heading `gap-8` wrapper above, not a child of it, so the
              carousel sits flush against the heading instead of stacking a flex `gap-8` on top of
              its own former `mt-8 md:mt-[50px]` (a double-gap bug, same shape as this page's
              other padding+margin doubling fixes). */}
          {/* Full-width, no `max-w`/padding — the same fix Reviews got (2026-08-06): a track that
              bleeds out of a `max-w-[1440px]` column only ever reaches that COLUMN's edge, so on a
              wider monitor cards were cut at 1440 with dead space either side. The content-grid
              gutter is handed back by the spacers below instead.
              `CardSlider`, not `EmblaCarousel`, for the same reason Reviews switched: embla
              positions slides by transform and would count a gutter spacer as a real slide,
              throwing off both its slide count and its arrow-visibility test, while padding on its
              viewport breaks its own measurement. Native scroll-snap over real overflow is what a
              row of fixed-width cards actually is. NOTE this drops the infinite wrap-around embla
              gave this section (Reviews dropped it too, by explicit request) — the arrows now
              disable at the two ends instead of cycling. */}
          <div>
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              // One card per press at every width, desktop included (2026-08-06 request).
              scrollStep="item"
              trackClassName={cn('gap-5', styles.winsTrack)}
            >
              {profile.wins.map((win, index) => (
                <div
                  key={index}
                  style={
                    {
                      '--win-border-gradient': winBorderGradient(win.color),
                    } as CSSProperties
                  }
                  className={cn(
                    'shrink-0 flex min-h-[250px] flex-col gap-3 p-6',
                    styles.winCard,
                    // Every card is a snap target, including both edge ones — unlike Reviews,
                    // which has to exclude its ends. The difference is `scroll-padding-inline-
                    // start` on this track (`.winsTrack`): it offsets the snap position by the
                    // gutter, so a card parks AT the content grid rather than flush against the
                    // bled screen edge, and the first card's snap lands at `scrollLeft: 0`
                    // exactly. Reviews solves the same problem with spacer-only snap points at
                    // the ends, which is why it needs the exclusions and this doesn't.
                    'snap-start',
                    // The row's inset to the content grid lives on the edge cards themselves
                    // here, not on spacer elements — see `.winsFirstCard` for why spacers can't
                    // work against this track's 20px gap.
                    index === 0 && styles.winsFirstCard,
                    index === profile.wins.length - 1 && styles.winsLastCard,
                  )}
                >
                  <WinCardGlow
                    idSuffix={index}
                    bottomRightGradient={WIN_BOTTOMRIGHT_GLOW_HEX[win.color]}
                    topLeftColor={WIN_TOPLEFT_GLOW_HEX[win.color]}
                  />
                  {/* Trophy + year pinned to the TOP of the (now taller, `min-h-[250px]`) card —
                        `z-10` alongside the pre-existing `relative` makes the paint-order-above-the-
                        glow explicit rather than relying on implicit DOM-order stacking (see
                        `WinCardGlow`'s own doc comment for the investigation). */}
                  <span className="relative z-10 inline-flex items-center gap-2 text-tiny font-bold">
                    <WinTrophyIcon fill={WIN_TROPHY_HEX[win.color]} className="shrink-0" />
                    {win.year}
                  </span>
                  {/* Title + description pinned to the BOTTOM of the card via `mt-auto` — same
                        "pin to bottom" pattern as the Reviews card's avatar/name row below. */}
                  <div className="relative z-10 mt-auto flex flex-col gap-3">
                    <h3 className="font-display text-l">{win.win}</h3>
                    <p className="text-tiny opacity-90 md:text-[16px]">{win.description}</p>
                  </div>
                </div>
              ))}
            </CardSlider>
          </div>
        </div>
      )}

      {/* This used to be the shared `max-w-[1440px]` + `px-4 sm:px-6 lg:px-[70px]` column for all
          three sections inside it. My Way needed to bleed to the window (2026-08-06), which is
          impossible from INSIDE a capped column — the negative margin that would escape it depends
          on the window width, and `100%` in here means the column, not the window. Rather than
          reindent the whole block, the column moved down onto the two children that still want it
          (My F*ckUp(s) and the interview section); My Way now carries its own, on its heading
          only. */}
      <div className="w-full">
        {/* ============================== MY WAY (carousel) ==============================
            STAGE re-architecture (2026-07-23): the previous pass built this as a static CSS Grid
            (3 separate `.map()` passes + a dynamic `gridTemplateColumns` sized to
            `profile.myWay.length`) — wrong. Fresh re-verification against `327:1080` (1440px
            frame) shows this is a genuine horizontally-scrolling CAROUSEL, the same "peek" pattern
            My WINS had (it has since moved off `EmblaCarousel.tsx`; this is now that component's
            only caller — see its doc comment for why the others left): on the
            1440px frame only 3 of the 4 stages are fully visible, the 4th is cropped to a ~24px
            sliver at the frame's right edge (its year text spans x=1416–1578, starting inside the
            frame but extending 138px past the 1440px boundary). Stage pitch (start-to-start
            spacing, derived from the 4 stages' year x-positions 100→527→968→1416) is ~440px —
            approximated below as a 420px slide (`w-[420px]`) + a 20px track gap
            (`trackClassName="gap-5"`, same gap size as My WINS), landing on the 440px pitch
            exactly. Figma doesn't expose a clean separate "card width" vs "gap" number here (same
            limitation `WIN_BORDER_GRADIENT_HEX` etc. cite elsewhere), so this split is a
            best-estimate that may need a follow-up visual check, not a claim of pixel-perfect
            accuracy. Kept inside this section's existing non-full-bleed `max-w-[1440px] px-4
            sm:px-6 lg:px-[70px]` wrapper (same shape as My WINS, NOT Reviews' full-bleed
            `w-screen` treatment) — this section already lived in a normal content column like
            every other section on the page, and My Way's peek is far smaller than Reviews' own
            (Reviews' cards visibly peek on both sides via `align="center"`; My Way only needs a
            small trailing peek of the next stage via `align="start"`, the same "N full slides, no
            single centered active one" shape My WINS already uses, not Reviews' pattern).
            `align="start"` (not `"center"`) matches that.

            Each stage is now ONE self-contained slide, used identically at every breakpoint — no
            vertical gap within a slide anymore (removed per explicit instruction: spacing now
            comes only from each piece's own margin, e.g. `.wayConnector`'s `margin-top: 20px`),
            top to bottom: year → a vertical connector bar (`.wayConnector`, `position: relative`,
            `z-index: -1`, with a small white 7×7px circle `::before` at its own top edge so the
            line visually starts from that circle's center — genuinely absent from Figma, added
            per explicit, repeated product-owner request, not a missed design detail) → the
            numbered step badge + title/description row (`.wayCard` now padding-free, per explicit
            instruction). The ONE shared dashed rule (`.wayLongLine`) is no longer per-slide — it's
            a single absolutely-positioned overlay rendered ONCE for the whole carousel (see the
            `relative` wrapper around `<EmblaCarousel>` below), since Figma's own `Line 9` really
            is one element spanning every stage and a per-slide copy can't reproduce that in a
            real horizontally-scrolling carousel. Includes the mandatory embla "gap missing at
            loop seam" fix (`mr-5` on the last slide only — same pattern as Reviews/My WINS). */}
        {profile.myWay.length > 0 && (
          <div
            id="my-way"
            className={cn('flex w-full flex-col gap-6 scroll-mt-24', styles.spacing150)}
          >
            {/* Heading keeps the standard capped column; the carousel below is full-width so its
                slides are clipped by the WINDOW rather than by a 1440px column (2026-08-06, same
                change Reviews and My WINS got). The old `max-[600px]:-mx-4 max-[600px]:pl-4` on
                this section — which cancelled the shared parent's padding to fake a mobile
                right-edge bleed — is gone: the track genuinely bleeds now, at every width. */}
            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
              <div className="flex flex-col gap-8">
                <SectionEyebrow icon={<MyWayBlockIcon className="size-4" />}>
                  {t('myWay.eyebrow')}
                </SectionEyebrow>
                <h2
                  className={cn(
                    'font-display text-h3 max-[600px]:hidden md:max-w-[635px] md:text-h2',
                    styles.gradientHeading,
                  )}
                >
                  {t('myWay.heading')}
                </h2>
              </div>
            </div>
            <div className={cn('relative', styles.wayCarousel)}>
              {/* The dashed rule used to be ONE overlay pinned OUTSIDE the track, so it stayed
                  visually still while the stages scrolled underneath it. Reverted to a per-slide
                  segment on 2026-08-06 by explicit request ("щоб вона теж слайдилась") — see
                  `.wayLongLine` for how consecutive segments still read as one continuous line
                  and why only the first one carries the start-marker dot. */}
              {/* `CardSlider`, not `EmblaCarousel` — the last section to move across, for the same
                  reason Reviews and My WINS did: embla positions slides by transform and can't be
                  inset to the content grid once its track bleeds to the window (see
                  `EmblaCarousel.tsx`'s doc comment). NOTE this drops the infinite wrap-around;
                  the arrows now disable at the two ends instead of cycling. */}
              <CardSlider
                prevLabel={t('carousel.prev')}
                nextLabel={t('carousel.next')}
                // One stage per press at every width, desktop included (2026-08-06 request).
                scrollStep="item"
                trackClassName={cn('gap-5', styles.wayTrack)}
              >
                {profile.myWay.map((stage, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex shrink-0 flex-col',
                      styles.waySlide,
                      // `scroll-padding-inline-start` on the track parks a snapped slide ON the
                      // content grid rather than flush against the bled window edge, so every
                      // slide can carry a plain `snap-start` — same setup as My WINS.
                      'snap-start',
                      // The row's inset to the grid rides on the edge slides themselves (this
                      // track's 20px gap is wider than the 16px mobile gutter, which rules out
                      // spacer elements — see `.winsFirstCard` for the full reasoning).
                      index === 0 && styles.wayFirstSlide,
                      index === profile.myWay.length - 1 && styles.wayLastSlide,
                    )}
                  >
                    <div className={cn('relative', styles.wayYearBlock)}>
                      <span className={styles.wayYear}>
                        {stage.yearFrom}–{stage.yearTo}
                      </span>
                      <div className={styles.wayConnector} aria-hidden="true" />
                    </div>
                    <div
                      className={cn(
                        'relative flex items-start gap-6 max-[768px]:flex-col max-[768px]:gap-4',
                        styles.wayStepRow,
                      )}
                    >
                      {/* This slide's piece of the dashed timeline. Anchored to THIS row rather
                          than to a magic offset from the carousel's top, so "32px above the
                          slide's text" holds at every breakpoint on its own — the year's fluid
                          font-size and the connector's shorter mobile height used to make that a
                          per-breakpoint guess. */}
                      <div
                        className={cn(
                          'pointer-events-none',
                          styles.wayLongLine,
                          index === 0 && styles.wayLongLineStart,
                          index === profile.myWay.length - 1 && styles.wayLongLineEnd,
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-tiny font-bold',
                          styles.wayStep,
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className={cn('flex flex-col gap-2', styles.wayCard)}>
                        <h3 className={cn('font-display text-l', styles.wayProjectHeading)}>
                          {stage.project}
                        </h3>
                        <p className="text-[16px] text-foreground">{stage.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardSlider>
            </div>
          </div>
        )}

        {/* ============================== MY F*CKUP(S) (carousel) ==============================
            Figma `552:4700` "Frame 453": the card row (`552:4707` "Frame 452") is 1964px wide
            across 3×641px cards — wider than the content column — with its own prev/next control
            (`552:4620`) centered below, i.e. a carousel (see `CardSlider.tsx`), not the
            `md:grid-cols-3` this section rendered before (that grid already fit all 3 cards at
            desktop width without overflow, which is why it never visually read as a slider).
            Order fix: this section is LAST of the three (right before the video-blog section),
            not first — see this component's own top doc comment for the full re-measurement
            citation. This section's OWN visibility is unchanged (`profile.fckups.length > 0`,
            data-driven, matching every other optional section on this page) — if it isn't
            rendering on a specific live profile, re-check that account's
            `mindsetter_profiles.fckups` jsonb value rather than this component's logic; the
            onboarding step that fills it in is `app/[locale]/mindsetter-onboarding/blocks/
            fckups/page.tsx`. */}
        {profile.fckups.length > 0 && (
          <div
            id="fckups"
            className={cn(
              // Carries the standard content column itself now that the shared parent wrapper no
              // longer does (see its comment above). The ≤600px right-edge bleed is unchanged in
              // effect, just expressed directly (`px-0` + `pl-4`) instead of as a negative margin
              // cancelling a parent's padding.
              'flex w-full flex-col gap-8 scroll-mt-24 md:gap-[50px]',
              styles.spacing150,
            )}
          >
            {/* Heading keeps the standard capped column; the carousel below is full-width so its
                cards are clipped by the WINDOW rather than by a 1440px column (2026-08-06, the
                same change Reviews / My WINS / My Way got). The section's old
                `max-[600px]:px-0 max-[600px]:pl-4` mobile-bleed trick is gone with it — the track
                genuinely bleeds now, at every width. */}
            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
              <div className="flex flex-col gap-8">
                <SectionEyebrow icon={<FckupsBlockIcon className="size-4 text-[#FF4C58]" />}>
                  {t('fckups.eyebrow')}
                </SectionEyebrow>
                <h2
                  className={cn(
                    'font-display text-h3 max-[600px]:hidden md:max-w-[770px] md:text-h2',
                    styles.gradientHeading,
                    styles.fckupsHeading,
                  )}
                >
                  {t('fckups.heading')}
                </h2>
              </div>
            </div>
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              // One card per press at every width, desktop included (2026-08-06 request).
              scrollStep="item"
              trackClassName={cn('gap-4', styles.fckupsTrack)}
            >
              {profile.fckups.map((fckup, index) => (
                <div
                  key={index}
                  className={cn(
                    // `SLIDER_ITEM_BASE` already supplies the `snap-start` these cards need; the
                    // track's `scroll-padding-inline-start` is what parks a snapped card ON the
                    // content grid instead of flush against the bled window edge.
                    SLIDER_ITEM_BASE,
                    'flex flex-col gap-4 p-6 md:p-8',
                    styles.sectionCard,
                    styles.fckupsCard,
                    // The row's inset to the grid rides on the edge cards themselves — see
                    // `.winsFirstCard` for why not spacer elements.
                    index === 0 && styles.fckupsFirstCard,
                    index === profile.fckups.length - 1 && styles.fckupsLastCard,
                  )}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <FckupsBlockIcon className="size-3.5 shrink-0 text-[#FF4C58]" />
                    {/* Figma (`552:4713` etc.): a bare number, NOT the circled `NumberBadge` Roles/
                        Help use — no fill/stroke/corner-radius behind it at all. */}
                    <span className="text-tiny font-bold tracking-[0.3em] text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <ReviewQuoteText
                    quote={fckup.story}
                    readMoreLabel={t('reviews.readMore')}
                    // A f*ckup card has no name of its own, so the dialog is titled by the
                    // section plus the card's position — carrying over the card's own red
                    // marker icon so the modal reads as that card's continuation.
                    dialogTitle={
                      <>
                        {t('fckups.dialogTitle')}
                        <FckupsBlockIcon className="size-3.5 shrink-0 text-[#FF4C58]" />
                        {index + 1}
                      </>
                    }
                    closeLabel={t('closeDialog')}
                    gapClassName="gap-8"
                    preserveNewlines
                  />
                </div>
              ))}
            </CardSlider>
          </div>
        )}

        {/* ============================== BUILT NOT BURN · INTERVIEW ============================== */}
        {hasVideoBlog && (
          <div
            id="video-blog"
            className={cn(
              // Carries the standard content column itself — see the `#fckups` note above.
              'mx-auto flex w-full max-w-[1440px] flex-col gap-6 scroll-mt-24 px-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-8 lg:px-[70px]',
              styles.spacing150,
            )}
          >
            <div className="flex flex-col gap-6 md:max-w-[500px]">
              <SectionEyebrow icon={<VideoBlogBlockIcon className="size-4" />}>
                {t('videoBlog.eyebrow')}
              </SectionEyebrow>
              <h2
                className={cn(
                  'font-display text-h3 max-[600px]:hidden md:text-h2',
                  styles.gradientHeading,
                  styles.videoBlogHeading,
                )}
              >
                {t('videoBlog.heading')}
              </h2>
              {/* Desktop-only button — mobile has its own copy AFTER the video below, since at
                  ≤600px the requested order is eyebrow → video → full-width button, which needs
                  the button to be a sibling of the video (not nested in this text column) to
                  reorder via plain DOM order rather than fighting `flex` with `order` across two
                  different containers. */}
              {/* No interview archive route exists yet. */}
              <NotYetAvailable feature="interviews" className="hidden md:inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="w-fit gap-2 disabled:opacity-50"
                >
                  {t('videoBlog.allInterviews')}
                  <VideoBlogArrowIcon />
                </Button>
              </NotYetAvailable>
            </div>
            {(profile.videoBlogUrl || videoBlogEmbedUrl) && (
              <div
                className={cn(
                  'relative h-[400px] w-full max-w-[640px] overflow-hidden max-[600px]:h-[220px]',
                  styles.videoPanel,
                )}
              >
                {profile.videoBlogUrl ? (
                  <VideoBlogPlayer
                    src={profile.videoBlogUrl}
                    title={t('videoBlog.heading')}
                    clickToWatchLabel={t('videoBlog.clickToWatch')}
                  />
                ) : (
                  <iframe
                    className="size-full"
                    src={videoBlogEmbedUrl!}
                    title={t('videoBlog.heading')}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            )}
            {/* Mobile twin of the desktop "All interviews" button above. */}
            <NotYetAvailable feature="interviews" className="w-full md:hidden">
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full gap-2 disabled:opacity-50"
              >
                {t('videoBlog.allInterviews')}
                <VideoBlogArrowIcon />
              </Button>
            </NotYetAvailable>
          </div>
        )}
      </div>

      {/* ============================== CTA BANNER #2 ============================== */}
      <div
        id="cta-banner-2"
        className={cn(
          'mx-auto mt-16 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:px-[70px]',
          styles.spacingBottom150,
        )}
      >
        <CtaBanner
          heading={t('ctaBanner2.heading')}
          price={price}
          inviteLabel={t('inviteToEvent')}
          bookLabel={t('bookSession')}
        />
      </div>

      {/* ============================== BEYOND BUSINESS ============================== */}
      {interestGroups.length > 0 && (
        <div
          id="beyond-business"
          className={cn(
            'mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-[70px]',
            styles.spacing150,
          )}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-8">
              <span className="inline-flex items-center gap-2">
                <QuillPenAiFillIcon
                  className={cn('size-4 shrink-0', memberStyles.metaIcon)}
                  aria-hidden="true"
                />
                <span className={cn('text-tiny font-bold uppercase', styles.sectionEyebrow)}>
                  {t('beyondBusiness.eyebrow')}
                </span>
              </span>
              <h2
                className={cn(
                  'hidden font-display text-h2 md:block',
                  styles.gradientHeading,
                  styles.beyondBusinessHeading,
                )}
              >
                {t('beyondBusiness.heading')}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {interestGroups.map(({ category, items }) => (
                <div key={category} className={styles.interestCard}>
                  <h3
                    className={cn(
                      'font-display leading-none font-normal text-white',
                      memberStyles.interestCardHeading,
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
        </div>
      )}
    </div>
  );
}
