import { CalendarDays, CalendarOff, CheckCircle2, Link2, User } from 'lucide-react';
import type { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import type { SocialsJson } from '@/app/[locale]/member-profile/page';
import {
  BagIcon,
  FlashlightFillIcon,
  MagicFillIcon,
  MicAiFillIcon,
  ReviewChatIcon,
} from '@/components/icons/mindsetter-eyebrow-icons';
import {
  CashFillIcon,
  LanguageBubbleIcon,
  LocationPinIcon,
  QuillPenAiFillIcon,
  UserAddFillIcon,
} from '@/components/icons/profile-meta-icons';
import {
  FckupsBlockIcon,
  MyWayBlockIcon,
  MyWinsBlockIcon,
  NumbersBlockIcon,
  PromoVideoBlockIcon,
  ReelLifeBlockIcon,
  VideoBlogBlockIcon,
} from '@/components/icons/shine-block-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { ExpandableAccordion } from '@/components/profile/ExpandableAccordion';
import {
  groupInterestsByCategory,
  isSafeHttpUrl,
  resolveDisplayName,
  resolveLanguageText,
  resolveLocationText,
  SOCIAL_ICON_MAP,
  SOCIAL_KEYS,
} from '@/components/profile/MemberProfileView';
import { Button } from '@/components/ui/button';
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
import { toEmbedUrl } from '@/lib/video-embed';

import memberStyles from './MemberProfileView.module.css';
import styles from './MindsetterProfileView.module.css';

/** Read-side shape of `mindsetter_profiles.promo_video` / `.video_blog` — see
 * `PromoForm.tsx`/`VideoBlogForm.tsx` for the same manual-cast precedent (jsonb has no DB-level
 * shape constraint, so this is not re-validated with the write-time Zod schema on read). */
type VideoJson = {
  youtube?: string | null;
  vimeo?: string | null;
  videoPath?: string | null;
} | null;

/** Per-win swatch hex, copied verbatim from `WinsForm.tsx`'s own palette map — see that file's
 * comment for the source (design-provided palette of 7 colors). Kept in sync manually; if that
 * map ever changes, update this one too. */
const WIN_COLOR_HEX: Record<WinColor, string> = {
  yellow: '#F2C601',
  purple: '#7729F4',
  blue: '#172AFB',
  orange: '#FF5F24',
  teal: '#17FBD9',
  lightblue: '#79B9E3',
  pink: '#FB17AF',
};

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
 * replaces, and `superpowerCardStyle` above). */
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

/** Shared base classes for every `CardSlider` item (Reviews / My WINS / My F*ckUp(s) / REEL
 * LIFE) — same mobile width + scroll-snap participation across all four, kept in one place so a
 * future 5th slider section can't forget `snap-start` and silently break scroll-snap. */
const SLIDER_ITEM_BASE = 'w-[280px] shrink-0 snap-start';

interface SuperpowerCardStyle {
  background: string;
  textClassName?: string;
}

/** Superpower(s) per-position card background + title/description text color (claude.txt
 * 2026-07-23, "1. Блок Superpower(s)" items 4/6 — max 3 cards, `MAX_SUPERPOWERS` in
 * `lib/validation/mindsetter.ts`, so a fixed 3-entry tuple indexed by position is exact, not a
 * cycling approximation like `TOPIC_PILL_COLOR_CLASSES` above). Card 3's white background needs
 * black title/description text; cards 1/2 keep the page's default white text. */
const SUPERPOWER_CARD_STYLES: readonly [
  SuperpowerCardStyle,
  SuperpowerCardStyle,
  SuperpowerCardStyle,
] = [
  { background: 'linear-gradient(358.93deg, #1a1a1a 2.16%, #79b9e3 99.53%)' },
  { background: '#1a1a1a' },
  { background: '#fff', textClassName: 'text-[#000]' },
];

/** Same `noUncheckedIndexedAccess`-vs-computed-index situation as `topicPillColorClass` above —
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

/**
 * Everything this screen renders — one `profiles` row joined 1:1 with `mindsetter_profiles`,
 * plus the Mindsetter's current `session_settings` row. Explicit shape (not `Database['public']`
 * generated types — same staleness precedent as `MemberProfile` in `MemberProfileView.tsx`);
 * both fetch call sites (`app/[locale]/mindsetters/[username]/page.tsx`, present/future
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
  videoBlog: VideoJson;
  sessionType: 'free' | 'paid' | null;
  priceCents: number | null;
  currency: string | null;
  topics: string[];
  reelLifePhotoUrls: string[];
  promoVideoUrl: string | null;
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

/** Small bold outlined index badge shared by Roles / Help / F*ckUps' numbered card lists. */
function NumberBadge({ index }: { index: number }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-tiny font-bold',
        styles.numberBadge,
      )}
    >
      {index}
    </span>
  );
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
        'relative flex flex-col items-center gap-6 overflow-hidden px-6 py-10 text-center md:px-16 md:py-16',
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
      <div className="relative flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className={cn('h-14 px-6 text-base font-bold', memberStyles.inviteButton)}
        >
          <UserAddFillIcon className="size-4" aria-hidden="true" />
          {inviteLabel}
        </Button>
        <Button type="button" variant="primaryOutline" size="lg">
          {bookLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Presentational Server Component for the "Public Mindsetter Profile" screen (Figma
 * `327:1080`/`383:2070` desktop "Full Profile" — same content, two promo-video-orientation
 * variants — / `187:4294` mobile). Section order below matches the ACTUAL Figma node y-order
 * measured during this build (Hero → Roles → Topics pills → Superpower(s) →
 * Promo video → Numbers → What can I help with → REEL LIFE → My events → Reviews → CTA
 * banner #1 → My WINS → My Way → My F*ckUp(s) → Built Not Burn · Interview → CTA banner #2 →
 * Beyond Business), which differs slightly from the ROADMAP stage-1.10 planning note's
 * prose-listed order (that note was written before this node-level measurement pass — the
 * measured layout is the ground truth per CLAUDE.md: "Figma design is the source of truth").
 * "My events" has no located Figma frame (ROADMAP open item) — added per product-owner
 * decision as a neutral empty state. Micro-navigation was removed per product-owner decision
 * (2026-07-23) — section `id`/`scroll-mt-24` anchors are kept in place in case it returns.
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
 * render.
 */
export function MindsetterProfileView({
  profile,
  // Unused now that the owner-only "Public view" banner is commented out (claude.txt
  // 2026-07-23 follow-up) — kept in the props interface for when that banner returns.
  variant: _variant,
  t,
}: MindsetterProfileViewProps) {
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

  const heroText = profile.philosophy?.trim() || profile.bio?.trim() || null;
  const price = formatSessionPrice(profile, t);
  const hasPromoVideo = Boolean(
    profile.promoVideoUrl || profile.promoVideo?.youtube || profile.promoVideo?.vimeo,
  );
  const promoEmbedUrl = profile.promoVideoUrl
    ? null // direct upload — rendered via <video>, not an iframe embed
    : toEmbedUrl(profile.promoVideo?.youtube || profile.promoVideo?.vimeo || null);
  const hasVideoBlog = Boolean(profile.videoBlog?.youtube || profile.videoBlog?.vimeo);
  const videoBlogEmbedUrl = toEmbedUrl(
    profile.videoBlog?.youtube || profile.videoBlog?.vimeo || null,
  );
  const reviews = t.raw('reviews.items') as { name: string; role: string; quote: string }[];

  return (
    <div className={styles.section}>
      {/* Owner-only "Public view — this is how others see your profile" banner (Edit/Share
          Profile CTAs) hidden per claude.txt 2026-07-23 follow-up ("Приховай поки блок Public
          view... бо це для наступних етапів") — markup kept here (commented out) for that later
          stage:
      {variant === 'preview' && (
        <div className={cn(memberStyles.banner, 'flex items-center')}>
          <div className="mx-auto flex w-full max-w-[1440px] flex-row items-center justify-between gap-2 px-4 py-2 sm:px-6 sm:gap-4 md:py-0 lg:px-[70px]">
            <div className="flex items-center gap-2">
              <Eye
                className={cn('size-5 shrink-0', memberStyles.bannerHighlight)}
                aria-hidden="true"
              />
              <p className={cn('text-tiny', memberStyles.bannerText)}>
                <span className={cn('font-bold', memberStyles.bannerHighlight)}>
                  {t('banner.highlight')}
                </span>
                <span className="hidden md:inline"> {t('banner.rest')}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'h-8 gap-1 rounded-[8px] px-2 py-2 text-tiny font-normal md:h-14 md:w-[171px] md:gap-3 md:rounded-lg md:px-5 md:py-[15px] md:text-base md:font-bold',
                  memberStyles.editButton,
                )}
              >
                <BallPenFillIcon className="size-4" aria-hidden="true" />
                {t('editProfile')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'hidden h-14 w-[171px] gap-2 rounded-xl px-5 py-[15px] text-base font-bold md:inline-flex',
                  memberStyles.shareButton,
                )}
              >
                <Share2 className="size-4" aria-hidden="true" />
                {t('shareProfile')}
              </Button>
            </div>
          </div>
        </div>
      )}
      */}

      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-16 flex flex-col gap-0 lg:mb-[150px] lg:flex-row lg:justify-between">
          {/* `max-w-[604px]` = 464px content cap (claude.txt 2026-07-23 follow-up: "максимальна
              ширина лівої частини без врахування падінгів 464px") + 70px×2 padding, since global
              preflight is `box-sizing: border-box` (width includes padding). */}
          <div className="flex w-full flex-col pt-4 pr-[14px] pl-4 lg:max-w-[604px] lg:flex-1 lg:pt-[87px] lg:px-[70px]">
            <div className="flex flex-wrap items-center gap-2">
              {/* TEMPORARY DEMO OVERRIDE (claude.txt 2026-07-23 follow-up: "Verified для демо
                  виведи просто в коді, не з бази, щоб показати бізнесу, потім приберемо його") —
                  unconditional instead of gated on `profile.verification_status === 'verified'`
                  (no test account is actually verified yet), so the pill is visible for a
                  business demo. REVERT to `{profile.verification_status === 'verified' && (...)}`
                  once the demo is done. */}
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-[59px] px-2 pt-1.5 pb-2 text-tiny leading-none font-normal',
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
                    'inline-flex h-6 items-center rounded-[59px] px-2 pt-1.5 pb-2 text-tiny leading-none font-normal',
                    styles.pillHandle,
                  )}
                >
                  @{profile.username}
                </span>
              )}
            </div>

            <h1 className={cn('mt-4 font-display lg:mt-3', styles.heroName)}>{displayName}</h1>

            {heroText && <p className="mt-1 text-body lg:mt-3">{heroText}</p>}

            {metaPills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1 lg:mt-6">
                {metaPills.map((label) => (
                  <span
                    key={label}
                    className={cn(
                      'inline-flex h-6 items-center px-2 text-tiny leading-none md:px-3',
                      styles.metaPill,
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="order-1 mt-[22px] flex flex-col gap-2 lg:order-none lg:mt-6 lg:flex-row lg:gap-4">
              <Button
                type="button"
                variant="ghost"
                className={cn('h-14 px-5 text-base font-bold', memberStyles.inviteButton)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M8.5705 9.36357C9.02423 9.41187 9.33268 9.82029 9.33268 10.2766V13.6667C9.33268 14.219 8.88497 14.6667 8.33268 14.6667H3.66601C3.11373 14.6667 2.65622 14.2148 2.75859 13.6721C3.22451 11.2019 5.39372 9.33335 7.99935 9.33335C8.19229 9.33335 8.38285 9.3436 8.5705 9.36357ZM7.99935 8.66669C5.78935 8.66669 3.99935 6.87669 3.99935 4.66669C3.99935 2.45669 5.78935 0.666687 7.99935 0.666687C10.2093 0.666687 11.9993 2.45669 11.9993 4.66669C11.9993 6.87669 10.2093 8.66669 7.99935 8.66669ZM11.9993 11.3334V10C11.9993 9.63183 12.2978 9.33335 12.666 9.33335C13.0342 9.33335 13.3327 9.63183 13.3327 10V11.3334H14.666C15.0342 11.3334 15.3327 11.6318 15.3327 12C15.3327 12.3682 15.0342 12.6667 14.666 12.6667H13.3327V14C13.3327 14.3682 13.0342 14.6667 12.666 14.6667C12.2978 14.6667 11.9993 14.3682 11.9993 14V12.6667H10.666C10.2978 12.6667 9.99935 12.3682 9.99935 12C9.99935 11.6318 10.2978 11.3334 10.666 11.3334H11.9993Z"
                    fill="black"
                  />
                </svg>
                {t('inviteToEvent')}
              </Button>
              <Button type="button" variant="primaryOutline" size="lg">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M1.33398 12.6666C1.33398 13.8 2.20065 14.6666 3.33398 14.6666H12.6673C13.8007 14.6666 14.6673 13.8 14.6673 12.6666V7.33331H1.33398V12.6666ZM12.6673 2.66665H11.334V1.99998C11.334 1.59998 11.0673 1.33331 10.6673 1.33331C10.2673 1.33331 10.0007 1.59998 10.0007 1.99998V2.66665H6.00065V1.99998C6.00065 1.59998 5.73398 1.33331 5.33398 1.33331C4.93398 1.33331 4.66732 1.59998 4.66732 1.99998V2.66665H3.33398C2.20065 2.66665 1.33398 3.53331 1.33398 4.66665V5.99998H14.6673V4.66665C14.6673 3.53331 13.8007 2.66665 12.6673 2.66665Z"
                    fill="#79B9E3"
                  />
                </svg>
                {t('bookSession')}
              </Button>
              {/* Favorite (heart) button hidden per claude.txt 2026-07-23 follow-up
                  ("Приховай поки кнопку сердечка, це в наступних етапах") — favoriting isn't
                  built yet; markup kept here (commented out) for that later stage:
              <button
                type="button"
                aria-label={t('favorite')}
                className="flex size-14 items-center justify-center rounded-lg border border-border text-white transition-colors hover:bg-card"
              >
                <Heart className="size-5" aria-hidden="true" />
              </button>
              */}
              {hasPromoVideo && (
                <Button asChild variant="ghost" className="h-14 px-5 text-base font-bold lg:hidden">
                  {/* `asChild` (real `<a href>`, not a plain `<button>`) so this actually
                      navigates/scrolls to `#promo-video` — a bare `<button>` had no href and did
                      nothing on tap. `fill="currentColor"` (was a hardcoded `white`) so the icon
                      follows the ghost variant's own text-color transitions (hover/active) instead
                      of staying frozen white. */}
                  <a href="#promo-video">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M4.56758 14.0631L12.9247 8.9799C12.9782 8.92342 13.0318 8.86694 13.0854 8.81046C13.2461 8.52805 13.1925 8.18917 12.9247 8.01973L4.56758 2.93651C4.51401 2.82355 4.40687 2.82355 4.29973 2.82355C3.9783 2.82355 3.76402 3.04947 3.76402 3.38835V13.5548C3.76402 13.6678 3.76402 13.7242 3.81759 13.8372C3.9783 14.1196 4.29973 14.1761 4.56758 14.0631Z"
                        fill="currentColor"
                      />
                    </svg>
                    {t('introVideo')}
                  </a>
                </Button>
              )}
            </div>

            {(locationText || languageText) && (
              <div className="mt-4 flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-tiny lg:mt-6">
                {locationText && (
                  <div className="flex items-center gap-1">
                    <LocationPinIcon
                      className={cn('size-4 shrink-0', memberStyles.metaIcon)}
                      aria-hidden="true"
                    />
                    {locationText}
                  </div>
                )}
                {languageText && (
                  <div className="flex items-center gap-1">
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
              <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-[112px]">
                {socialEntries.map(({ key, Icon, href }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-[8px]',
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
                      'inline-flex h-8 items-center gap-1 rounded-[8px] px-3 text-tiny',
                      styles.websitePill,
                    )}
                  >
                    <Link2 className="size-3.5" aria-hidden="true" /> {t('website')}
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="relative order-first w-full lg:order-none lg:h-[670px] lg:w-[710px]">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className={cn(
                  'aspect-[375/440] w-full object-cover lg:aspect-auto lg:h-full',
                  styles.portraitFrame,
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex aspect-[375/440] w-full items-center justify-center lg:aspect-auto lg:h-full',
                  styles.portraitPlaceholder,
                )}
              >
                <User className="size-16 text-foreground/30" aria-hidden="true" />
              </div>
            )}
            {hasPromoVideo && (
              <a
                href="#promo-video"
                className="absolute bottom-[18px] left-4 hidden items-center gap-2 rounded-lg border border-primary px-3 py-2 text-tiny font-normal text-primary shadow-[0_4px_12px_0_rgba(111,186,237,0.8)] lg:inline-flex"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.77963 3.17334C3.79763 3.02196 3.8507 2.87688 3.93461 2.74961C4.01853 2.62235 4.13097 2.51642 4.26301 2.44023C4.39505 2.36405 4.54304 2.31972 4.69522 2.31077C4.8474 2.30182 4.99957 2.32849 5.13963 2.38867C5.84763 2.69134 7.43429 3.41067 9.44763 4.57267C11.4616 5.73534 12.8783 6.75067 13.4936 7.21134C14.019 7.60534 14.0203 8.38667 13.4943 8.782C12.885 9.24001 11.4856 10.242 9.44763 11.4193C7.40762 12.5967 5.83963 13.3073 5.13829 13.606C4.53429 13.864 3.85829 13.4727 3.77963 12.8213C3.68763 12.06 3.51562 10.3313 3.51562 7.99667C3.51562 5.66334 3.68696 3.93534 3.77963 3.17334Z"
                    fill="#79B9E3"
                  />
                </svg>
                {t('introVideo')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ============================== ROLES ==============================
            Stage 1.10 pixel-polish pass (ROADMAP item 2): rebuilt as an expand/collapse
            accordion — see `ExpandableAccordion.tsx` (shared with Help below since 2026-07-23)
            for the full Figma citation + the `isSafeHttpUrl` stored-XSS guard.
            Two-column layout (eyebrow+title left, accordion right) + block-level width/padding
            per claude.txt 2026-07-23 "1. Блок Roles" — see the className comments below for the
            individual item citations. */}
      {profile.roles.length > 0 && (
        <div
          id="roles"
          className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 mt-16 mb-20 lg:px-[70px] lg:mt-[150px] lg:mb-[150px]"
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
              <h2 className={cn('hidden font-display lg:block', styles.accordionSectionHeading)}>
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

      {/* ============================== TOPICS I'M EXPERT ==============================
          claude.txt 2026-07-23, "1. Блок Topics i'm expert" — now visible on mobile too (title
          hidden there, eyebrow stays as the lone header, item 1), block-level width/margin
          matching Roles/Superpower(s)' own now-established pattern (item 4), and a full
          restyle of the card wrapper (item 5) and per-pill backgrounds (item 2, replacing the
          previous border+glow treatment — see `TOPIC_ITEM_GRADIENTS` above). */}
      {profile.topics.length > 0 && (
        <div className="mx-auto mt-20 mb-20 w-full max-w-[1440px] px-4 lg:mt-[150px] lg:mb-[150px] lg:px-[70px]">
          <div
            className={cn(
              'flex flex-col items-center rounded-xl p-8 text-center lg:rounded-[32px] lg:p-14',
              styles.topicsCard,
            )}
          >
            <div className="mb-6 lg:mb-8">
              <SectionEyebrow icon={<MicAiFillIcon className="size-4 shrink-0" />}>
                {t('topics.eyebrow')}
              </SectionEyebrow>
            </div>
            <h2 className={cn('hidden font-display lg:mb-[40px] lg:block', styles.topicsHeading)}>
              {t('topics.heading')}
            </h2>
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
          swapped out via the new `arrows` prop. */}
      {profile.superpowers.length > 0 && (
        <div
          id="superpowers"
          className="mx-auto mt-16 mb-20 w-full max-w-[1440px] scroll-mt-24 px-4 lg:mt-[150px] lg:mb-[150px] lg:px-[70px]"
        >
          <div className="mb-6 lg:mb-8">
            <SectionEyebrow icon={<FlashlightFillIcon className="size-4 shrink-0" />}>
              {t('superpowers.eyebrow')}
            </SectionEyebrow>
          </div>
          <h2
            className={cn('hidden font-display lg:mb-[50px] lg:block', styles.superpowersHeading)}
          >
            {t('superpowers.heading')}
          </h2>
          <CardSlider
            prevLabel={t('carousel.prev')}
            nextLabel={t('carousel.next')}
            // Bleed the TRACK past the section's own `px-4` on mobile (`-mx-4` + width
            // compensation reaches the true viewport edge) — the gutter comes back as real
            // spacer flex items (below), NOT track padding: padding interacting with
            // `scroll-snap` left `scrollLeft` resting at a non-zero value (the first card looked
            // stuck to the edge AND the prev arrow read as scrollable at rest — claude.txt
            // 2026-07-23 follow-up). A plain flex spacer has no such snap ambiguity. Cancelled at
            // `lg:`, a static non-scrolling row.
            trackClassName="-mx-4 w-[calc(100%_+_2rem)] gap-4 lg:mx-0 lg:w-auto lg:gap-5"
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

      {/* ============================== PROMO VIDEO ============================== */}
      {hasPromoVideo && (
        <div id="promo-video" className="mt-16 flex flex-col gap-8 scroll-mt-24">
          <SectionEyebrow icon={<PromoVideoBlockIcon className="size-4" />}>
            {t('promo.eyebrow')}
          </SectionEyebrow>
          <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
            {t('promo.heading')}
          </h2>
          <div
            className={cn(
              'relative aspect-video w-full max-w-[900px] overflow-hidden',
              styles.videoPanel,
            )}
          >
            {profile.promoVideoUrl ? (
              <video src={profile.promoVideoUrl} controls className="size-full object-cover" />
            ) : promoEmbedUrl ? (
              <iframe
                className="size-full"
                src={promoEmbedUrl}
                title={t('promo.heading')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : null}
          </div>
        </div>
      )}

      {/* ============================== NUMBERS ============================== */}
      {profile.numbers.length > 0 && (
        <div className="mt-16 flex flex-col gap-8">
          <SectionEyebrow icon={<NumbersBlockIcon className="size-4" />}>
            {t('numbers.eyebrow')}
          </SectionEyebrow>
          <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
            {t('numbers.heading')}
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {profile.numbers.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={cn('flex flex-col gap-2 p-6', styles.numberStat)}
              >
                <span className={cn('font-display text-h3', styles.numberStatValue)}>
                  {item.value}
                </span>
                <span className="text-tiny">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================== WHAT CAN I HELP WITH ==============================
          Styled identically to Roles (2026-07-23 follow-up: "зроби блок по стилях такий як
          Roles, бо він впринципі такий же тільки в нього немає силок і превю") — same
          `ExpandableAccordion`, same two-column layout/block width/margins, just `BagIcon`
          (this section's own eyebrow icon) instead of `MagicFillIcon` for the row numbering,
          and `helpWith` items never have `links`, so that part of the accordion simply never
          renders here. */}
      {profile.helpWith.length > 0 && (
        <div
          id="help"
          className="mx-auto mt-16 mb-20 w-full max-w-[1440px] scroll-mt-24 px-4 lg:mt-[150px] lg:mb-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-[61px]">
            <div className="flex flex-col gap-8 lg:flex-1">
              <SectionEyebrow
                icon={<BagIcon className="size-4 shrink-0" />}
                textClassName="leading-none"
              >
                {t('help.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('hidden font-display lg:block', styles.accordionSectionHeading)}>
                {t('help.heading')}
              </h2>
            </div>
            <div className="lg:max-w-[643px] lg:flex-1">
              <ExpandableAccordion
                items={profile.helpWith}
                icon={<BagIcon className="size-3 shrink-0 md:size-3.5" />}
                expandLabel={t('help.expand')}
                collapseLabel={t('help.collapse')}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================== REEL LIFE ============================== */}
      {profile.reelLifePhotoUrls.length > 0 && (
        <div
          id="reel-life"
          className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-[70px]"
        >
          <div className="flex flex-col gap-8">
            <SectionEyebrow icon={<ReelLifeBlockIcon className="size-4" />}>
              {t('reelLife.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('reelLife.heading')}
            </h2>
            {/* STAGE 1.11 RE-VERIFICATION (2026-07-21): re-measured against the newest `552:xxxx`/
                `401:7567` duplicates (desktop `552:4484`, mobile `401:7567` — supersedes the stale
                `187:4294`/`261:1262` citation this comment used to carry). Corrected findings:
                (1) this genuinely IS a carousel on BOTH breakpoints — desktop's photo row
                (`552:4642`-`552:4649` "Rectangle 13"-"20", 530×417 tiles) spans x=-370..2085,
                far wider than the ~1300px content column; mobile's row (`401:7881`-`401:7886`
                "Rectangle 13"-"19", 212×167 tiles) spans x=-147..619 against a 375px frame — same
                overflowing-row shape as Reviews/My WINS/My F*ckUp(s) below, not a static grid.
                (2) the prev/next control (desktop `552:4610` "Frame 227", mobile `401:7830`
                "Frame 228", each a 48px circular pair) sits centered BELOW the photo row on both
                breakpoints (y mid-way through the row's own span) — NOT flanking the eyebrow/
                heading as the stale citation claimed; that's the exact same control placement as
                the other three `CardSlider` sections, so it's reused here unmodified (no new prop
                needed). (3) Figma draws the tiles in a 2-row staggered/masonry offset (alternating
                column x-offsets, not a flat single row) — simplified here to a flat CardSlider row
                like the other three sections rather than hand-rolling a masonry track, since this
                app has no per-photo layout metadata (crop/offset) to drive that staggering and the
                task's own instruction is not to overcomplicate. Tile aspect ratio (530:417 desktop,
                212:167 mobile — effectively the same ~1.27:1 ratio at both breakpoints) is kept via
                `.reelLifeTile`'s `aspect-ratio` instead of the previous `aspect-square`. */}
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              trackClassName="gap-4"
            >
              {profile.reelLifePhotoUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={cn(SLIDER_ITEM_BASE, 'lg:w-[530px]', styles.reelLifeTile)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private-bucket URL */}
                  <img src={url} alt="" className="size-full object-cover" />
                </div>
              ))}
            </CardSlider>
          </div>
        </div>
      )}

      {/* ============================== MY EVENTS ==============================
          Spec §5.4 requires this section; no Figma frame located and no Events system exists yet
          (ROADMAP stage 1.10 open item). Product decision: render a minimal, neutral empty state
          (heading + "no events yet" placeholder) rather than inventing rich markup — same
          "static/decorative until the real system exists" precedent as Reviews below. Always
          renders (no backing data to gate visibility on yet). */}
      <div
        id="my-events"
        className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-[70px]"
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

      {/* ============================== REVIEWS (static, carousel) ==============================
          Figma `552:4496` "Frame 448": the card row (`552:4512` "Frame 273") is 1740px wide across
          4×420px cards — wider than the ~1300px content column — with a dedicated prev/next
          control (`552:4605`) centered below it, i.e. a real carousel (see `CardSlider.tsx`), not
          the static `md:grid-cols-3` this section rendered before. */}
      <div
        id="reviews"
        className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6 lg:px-[70px]"
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-4">
              <SectionEyebrow icon={<ReviewChatIcon className="size-3 shrink-0" />}>
                {t('reviews.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
                {t('reviews.heading')}
              </h2>
            </div>
            <Button type="button" variant="outline">
              {t('reviews.leaveReview')}
            </Button>
          </div>
          <CardSlider
            prevLabel={t('carousel.prev')}
            nextLabel={t('carousel.next')}
            trackClassName="gap-4"
          >
            {reviews.map((review) => (
              <div
                key={review.name}
                className={cn(
                  SLIDER_ITEM_BASE,
                  'flex flex-col gap-4 p-6 sm:w-[340px] lg:w-[420px]',
                  styles.reviewCard,
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
                <p className={cn('text-body', styles.reviewQuote)}>{review.quote}</p>
                <div>
                  <p className="font-bold">{review.name}</p>
                  <p className="text-tiny text-foreground/60">{review.role}</p>
                </div>
              </div>
            ))}
          </CardSlider>
        </div>
      </div>

      {/* ============================== CTA BANNER #1 ============================== */}
      <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-[70px]">
        <CtaBanner
          heading={t('ctaBanner1.heading')}
          price={price}
          inviteLabel={t('inviteToEvent')}
          bookLabel={t('bookSession')}
        />
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
        {/* ============================== MY WINS (carousel) ==============================
            Figma `552:5069` "Frame 446": the card row (`552:5078` "Frame 274") is 4600px wide
            across 7×640px sample cards — wider than the content column — with its own prev/next
            control (`552:4625`) centered below, i.e. a carousel (see `CardSlider.tsx`), not the
            `md:grid-cols-3` this section rendered before. Order fix: this section is FIRST of
            the three (right after CTA banner #1), not last — see this component's own top doc
            comment for the full re-measurement citation. */}
        {profile.wins.length > 0 && (
          <div id="wins" className="mt-16 flex flex-col gap-8 scroll-mt-24">
            <SectionEyebrow icon={<MyWinsBlockIcon className="size-4" />}>
              {t('wins.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('wins.heading')}
            </h2>
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              trackClassName="gap-4"
            >
              {profile.wins.map((win, index) => (
                <div
                  key={index}
                  className={cn(
                    SLIDER_ITEM_BASE,
                    'flex flex-col gap-3 p-6 lg:w-[640px]',
                    styles.winCard,
                  )}
                  style={{ backgroundColor: WIN_COLOR_HEX[win.color] }}
                >
                  <span className="text-tiny font-bold">{win.year}</span>
                  <h3 className="font-display text-l">{win.win}</h3>
                  <p className="text-tiny opacity-90">{win.description}</p>
                </div>
              ))}
            </CardSlider>
          </div>
        )}

        {/* ============================== MY WAY ============================== */}
        {profile.myWay.length > 0 && (
          <div className="mt-16 flex flex-col gap-8">
            <SectionEyebrow icon={<MyWayBlockIcon className="size-4" />}>
              {t('myWay.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('myWay.heading')}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
              {profile.myWay.map((stage, index) => (
                <div key={index} className="flex w-[280px] shrink-0 flex-col gap-3 md:w-auto">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-tiny font-bold',
                        styles.wayStep,
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className={cn('font-display text-l', styles.wayYear)}>
                      {stage.yearFrom}–{stage.yearTo}
                    </span>
                  </div>
                  <div className={cn('flex flex-col gap-2 p-6', styles.wayCard)}>
                    <h3 className="font-display text-l">{stage.project}</h3>
                    <p className="text-tiny text-foreground/70">{stage.description}</p>
                  </div>
                </div>
              ))}
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
          <div className="mt-16 flex flex-col gap-8">
            <SectionEyebrow icon={<FckupsBlockIcon className="size-4" />}>
              {t('fckups.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('fckups.heading')}
            </h2>
            <CardSlider
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              trackClassName="gap-4"
            >
              {profile.fckups.map((fckup, index) => (
                <div
                  key={index}
                  className={cn(
                    SLIDER_ITEM_BASE,
                    'flex flex-col gap-4 p-6 lg:w-[640px]',
                    styles.sectionCard,
                  )}
                >
                  <NumberBadge index={index + 1} />
                  <p className="text-body whitespace-pre-line">{fckup.story}</p>
                </div>
              ))}
            </CardSlider>
          </div>
        )}

        {/* ============================== BUILT NOT BURN · INTERVIEW ============================== */}
        {hasVideoBlog && (
          <div className="mt-16 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-6 md:max-w-[500px]">
              <SectionEyebrow icon={<VideoBlogBlockIcon className="size-4" />}>
                {t('videoBlog.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
                {t('videoBlog.heading')}
              </h2>
              <Button type="button" variant="outline" className="w-fit">
                {t('videoBlog.allInterviews')}
              </Button>
            </div>
            {videoBlogEmbedUrl && (
              <div
                className={cn(
                  'relative aspect-[9/16] w-full max-w-[372px] overflow-hidden',
                  styles.videoPanel,
                )}
              >
                <iframe
                  className="size-full"
                  src={videoBlogEmbedUrl}
                  title={t('videoBlog.heading')}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================== CTA BANNER #2 ============================== */}
      <div className="mx-auto mt-16 w-full max-w-[1300px] px-4 sm:px-6 lg:px-[70px]">
        <CtaBanner
          heading={t('ctaBanner2.heading')}
          price={price}
          inviteLabel={t('inviteToEvent')}
          bookLabel={t('bookSession')}
        />
      </div>

      {/* ============================== BEYOND BUSINESS ============================== */}
      {interestGroups.length > 0 && (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-[70px]">
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
              <h2 className={cn('hidden font-display text-h2 md:block', styles.gradientHeading)}>
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
