import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Eye,
  Heart,
  Link2,
  Play,
  Share2,
  User,
} from 'lucide-react';
import type { getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';

import type { SocialsJson } from '@/app/[locale]/member-profile/page';
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
  QuillPenAiFillIcon,
  UserAddFillIcon,
} from '@/components/icons/profile-meta-icons';
import { ReviewCompanyLogoIcon, ReviewLeaveIcon } from '@/components/icons/review-icons';
import {
  FckupsBlockIcon,
  MyWayBlockIcon,
  MyWinsBlockIcon,
  NumbersBlockIcon,
  PromoVideoBlockIcon,
  ReelLifeBlockIcon,
  VideoBlogBlockIcon,
} from '@/components/icons/shine-block-icons';
import { WinCardGlow, WinTrophyIcon } from '@/components/icons/win-card-glow';
import { CardSlider } from '@/components/profile/CardSlider';
import { EmblaCarousel } from '@/components/profile/EmblaCarousel';
import {
  groupInterestsByCategory,
  isSafeHttpUrl,
  resolveDisplayName,
  resolveLanguageText,
  resolveLocationText,
  SOCIAL_ICON_MAP,
  SOCIAL_KEYS,
} from '@/components/profile/MemberProfileView';
import { ReviewQuoteText } from '@/components/profile/ReviewQuoteText';
import { RolesAccordion } from '@/components/profile/RolesAccordion';
import { VideoBlogPlayer } from '@/components/profile/VideoBlogPlayer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
const TOPIC_PILL_COLOR_CLASSES = [
  'topicPillPurple',
  'topicPillYellow',
  'topicPillBlue',
  'topicPillOrange',
  'topicPillIndigo',
] as const;

/** `index % TOPIC_PILL_COLOR_CLASSES.length` is always in-range, but `noUncheckedIndexedAccess`
 * can't prove that from a plain array index, hence the small helper (with a same-value fallback
 * that's unreachable in practice) instead of a non-null assertion at the call site. */
function topicPillColorClass(index: number): (typeof TOPIC_PILL_COLOR_CLASSES)[number] {
  return (
    TOPIC_PILL_COLOR_CLASSES[index % TOPIC_PILL_COLOR_CLASSES.length] ?? TOPIC_PILL_COLOR_CLASSES[0]
  );
}

/** Shared base classes for every `CardSlider` item (My F*ckUp(s) / REEL LIFE — Reviews and, as of
 * this pass, My WINS both moved to `EmblaCarousel.tsx`'s `embla-carousel-react` track and keep
 * their own base classes without `snap-start`, see those sections below) — same mobile width +
 * scroll-snap participation across the remaining two, kept in one place so a future
 * `CardSlider`-based section can't forget `snap-start` and silently break scroll-snap. */
const SLIDER_ITEM_BASE = 'w-[280px] shrink-0 snap-start';

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

/** A section eyebrow row (icon + bold black uppercase label) reused by every content section
 * on this page — the "ABOUT"/"BEYOND BUSINESS" eyebrow pattern from `MemberProfileView`,
 * generalized here since this page has many more of them. */
function SectionEyebrow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span className={cn('text-tiny font-bold uppercase', styles.sectionEyebrow)}>{children}</span>
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
      <div className="relative flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-14 px-6 text-base font-bold max-[600px]:w-full md:min-w-[188px]',
            memberStyles.inviteButton,
          )}
        >
          <UserAddFillIcon className="size-4" aria-hidden="true" />
          {inviteLabel}
        </Button>
        <Button
          type="button"
          variant="primaryOutline"
          size="lg"
          className="shadow-none max-[600px]:w-full md:min-w-[188px]"
        >
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

  const heroText = profile.philosophy?.trim() || profile.bio?.trim() || null;
  const price = formatSessionPrice(profile, t);
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
   * Micro-navigation (spec §5.4 "мікро-навігація") — STATIC markup only this stage (ROADMAP
   * decision, 2026-07-20): plain anchor links to each section's `id`, no scroll-spy/active-state
   * JS. Items mirror the same data-driven-visibility rule the sections themselves already use
   * (an item only appears when its target section actually renders) — "Reviews" and "My events"
   * are always included since both sections always render (static/decorative, see their own
   * comments below).
   */
  const microNavItems: { href: string; label: string }[] = [
    profile.roles.length > 0 && { href: '#roles', label: t('microNav.roles') },
    profile.superpowers.length > 0 && { href: '#superpowers', label: t('microNav.superpowers') },
    profile.helpWith.length > 0 && { href: '#help', label: t('microNav.help') },
    profile.reelLifePhotoUrls.length > 0 && { href: '#reel-life', label: t('microNav.reelLife') },
    { href: '#my-events', label: t('microNav.myEvents') },
    { href: '#reviews', label: t('microNav.reviews') },
    profile.wins.length > 0 && { href: '#wins', label: t('microNav.wins') },
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <div className={styles.section}>
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

      {/* ============================== HERO ============================== */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-0 pb-10 sm:px-6 md:pb-16 lg:px-[70px] lg:pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex w-full flex-col gap-6 lg:max-w-[464px]">
            <div className="flex flex-wrap items-center gap-2">
              {profile.verification_status === 'verified' && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-tiny',
                    memberStyles.pillVerified,
                  )}
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {t('verified')}
                </span>
              )}
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
              <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-tiny">
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
                      'inline-flex h-8 items-center gap-1 rounded-md px-3 text-tiny',
                      styles.websitePill,
                    )}
                  >
                    <Link2 className="size-3.5" aria-hidden="true" /> {t('website')}
                  </a>
                )}
              </div>
            )}

            {hasPromoVideo && (
              // Static, decorative: scrolls to the Promo video section (`#promo-video`) rather
              // than opening a lightbox — no dedicated hero-intro video field exists in the data
              // model (Figma's "Intro about me" button re-triggers the same asset).
              <a
                href="#promo-video"
                className="inline-flex w-fit items-center gap-2 text-tiny font-bold text-foreground/70 hover:text-foreground"
              >
                {/* Was `bg-black` — now that the page itself is `--color-background` (#000000),
                    a pure-black circle would have no visible edge; `bg-card` (--color-card,
                    #1a1a1a) is this app's standard "elevated surface on black" step, giving the
                    circle a visible boundary again (decorative element, no Figma frame). */}
                <span className="flex size-8 items-center justify-center rounded-full bg-card text-white">
                  <Play className="size-3.5" aria-hidden="true" />
                </span>
                {t('introVideo')}
              </a>
            )}

            {variant === 'public' && (
              <div className="flex flex-wrap items-center gap-3 lg:mt-auto">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('h-14 px-5 text-base font-bold', memberStyles.inviteButton)}
                >
                  <UserAddFillIcon className="size-4" aria-hidden="true" />
                  {t('inviteToEvent')}
                </Button>
                <Button type="button" variant="primaryOutline" size="lg">
                  {t('bookSession')}
                </Button>
                <button
                  type="button"
                  aria-label={t('favorite')}
                  className="flex size-14 items-center justify-center rounded-lg border border-border text-white transition-colors hover:bg-card"
                >
                  <Heart className="size-5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div
            className={cn(
              'order-first -mx-4 w-[calc(100%_+_2rem)] sm:-mx-6 sm:w-[calc(100%_+_3rem)] lg:order-none lg:mx-0 lg:w-auto lg:max-w-[608px] lg:flex-1',
            )}
          >
            {profile.avatar_url ? (
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
                <User className="size-16 text-foreground/30" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* ============================== MICRO-NAVIGATION (static markup, no scroll-spy) ============================== */}
        {microNavItems.length > 0 && (
          <nav
            aria-label={t('microNav.ariaLabel')}
            className={cn('-mx-4 mt-10 overflow-x-auto sm:-mx-6 lg:mx-0 lg:mt-16', styles.microNav)}
          >
            <ul className="flex w-max items-center gap-6 px-4 py-3 sm:px-6 lg:w-full lg:px-0">
              {microNavItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={cn(
                      'whitespace-nowrap text-tiny font-bold uppercase',
                      styles.microNavLink,
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ============================== ROLES ==============================
            Stage 1.10 pixel-polish pass (ROADMAP item 2): rebuilt as an expand/collapse
            accordion — see `RolesAccordion.tsx` for the full Figma citation + the
            `isSafeHttpUrl` stored-XSS guard (unchanged, just relocated into that component). */}
        {profile.roles.length > 0 && (
          <div id="roles" className="mt-16 flex flex-col gap-8 scroll-mt-24">
            <SectionEyebrow icon={<MagicFillIcon className="size-4 shrink-0" />}>
              {t('roles.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('roles.heading')}
            </h2>
            <RolesAccordion
              roles={profile.roles}
              learnMoreLabel={t('roles.learnMore')}
              expandLabel={t('roles.expand')}
              collapseLabel={t('roles.collapse')}
            />
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
            correct per design, not a bug, so that part of the prior build stands. What was
            wrong: no card wrapper, left-aligned text, and a single flat pill color (the prior
            pass's doc comment reasoned the per-pill rainbow coloring away as "no per-item color
            field in the data model" — but the coloring is positional/illustrative, not
            data-driven, so it doesn't need one; restored via `TOPIC_PILL_COLOR_CLASSES` cycling
            through the 5 pill positions Figma itself uses, `552:4916`-`552:4924`). Figma's pill
            border reads as a soft color-matched gradient glow — approximated here with a solid
            border + colored box-shadow halo (`.topicPill`), same "close visual match, not a 1:1
            vector reproduction" precedent as `.ctaGlow` above. */}
        {profile.topics.length > 0 && (
          <div className="mt-16 hidden lg:block">
            <div
              className={cn(
                'flex flex-col items-center gap-8 px-8 py-10 text-center lg:px-14 lg:py-14',
                styles.topicsCard,
              )}
            >
              <SectionEyebrow icon={<MicAiFillIcon className="size-4 shrink-0" />}>
                {t('topics.eyebrow')}
              </SectionEyebrow>
              <h2 className={cn('font-display text-h2', styles.gradientHeading)}>
                {t('topics.heading')}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {profile.topics.map((topic, index) => (
                  <span
                    key={topic}
                    className={cn(
                      'rounded-full px-6 py-4 text-base font-bold',
                      styles.topicPill,
                      styles[topicPillColorClass(index)],
                    )}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================== SUPERPOWER(S) ============================== */}
        {profile.superpowers.length > 0 && (
          <div id="superpowers" className="mt-16 flex flex-col gap-8 scroll-mt-24">
            <SectionEyebrow icon={<FlashlightFillIcon className="size-4 shrink-0" />}>
              {t('superpowers.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('superpowers.heading')}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {profile.superpowers.map((superpower, index) => (
                <div
                  key={`${superpower.title}-${index}`}
                  className={cn('flex flex-col gap-4 p-6', styles.superpowerCard)}
                >
                  <NumberBadge index={index + 1} />
                  <h3 className="font-display text-l">{superpower.title}</h3>
                  <p className="text-body whitespace-pre-line">{superpower.description}</p>
                </div>
              ))}
            </div>
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

        {/* ============================== WHAT CAN I HELP WITH ============================== */}
        {profile.helpWith.length > 0 && (
          <div id="help" className="mt-16 flex flex-col gap-8 scroll-mt-24">
            <SectionEyebrow icon={<BagIcon className="size-3 shrink-0" />}>
              {t('help.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('help.heading')}
            </h2>
            <div className="flex flex-col divide-y divide-border">
              {profile.helpWith.map((item, index) => (
                <div key={`${item.title}-${index}`} className="flex flex-col gap-2 py-5">
                  <div className="flex items-center gap-3">
                    <NumberBadge index={index + 1} />
                    <h3 className="font-display text-l">{item.title}</h3>
                  </div>
                  <p className="pl-11 text-body">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
          control (`552:4605`) centered below it, i.e. a real carousel (see `EmblaCarousel.tsx`, the
          shared `embla-carousel-react`-backed track used by this section and My WINS — see that
          file's doc comment for why it isn't `CardSlider.tsx`), not the static `md:grid-cols-3`
          this section rendered before. */}
      {/* Top/bottom padding is intentionally asymmetric: 86px (not 150px) on top because "My
          Events" directly above already contributes its own 64px bottom padding (`py-16`) — 64 +
          86 = the requested 150px visible gap. The bottom side has no such neighbor contribution
          (CTA Banner #1's wrapper below has zero vertical padding of its own), so it stays a flat
          150px. Do NOT "simplify" this back to a symmetric `py-[150px]` — that would double the
          gap above this section to 214px. */}
      <div id="reviews" className={cn('pt-16 md:pt-[86px]', styles.paddingBottom150)}>
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
            <Button type="button" variant="primaryOutline" className="min-w-[250px] shadow-none">
              <ReviewLeaveIcon className="size-4" />
              {t('reviews.leaveReview')}
            </Button>
          </div>
        </div>
        {/* Full-bleed wrapper for the card row only — breaks out of the max-w-[1440px] grid above
            so the slider reaches the true viewport edges on screens wider than 1440px, instead of
            being letterboxed inside the centered column. The `w-screen` + `-translate-x-1/2`
            full-bleed technique can make this box wider than its ancestors on browsers with a
            real (non-overlay) scrollbar, which would otherwise introduce a page-wide horizontal
            scrollbar — the actual guard for that lives on `<body>` in `app/[locale]/layout.tsx`
            (`overflow-x-hidden`), NOT on this element (an `overflow-x-hidden` here would only
            clip this element's own overflowing children, not stop this box itself from widening
            `body`). */}
        <div className="relative left-1/2 mt-8 w-screen -translate-x-1/2 md:mt-[50px]">
          <EmblaCarousel prevLabel={t('carousel.prev')} nextLabel={t('carousel.next')}>
            {reviews.map((review, index) => (
              <div
                key={`${review.name}-${index}`}
                className={cn(
                  'shrink-0',
                  'flex min-h-[330px] flex-col gap-4 p-6',
                  styles.reviewCard,
                  // embla's own docs: CSS `gap` (this track's `gap-4`) never applies between the
                  // LAST slide and the first when `loop: true` — the seam simply has no gap,
                  // since `gap` only ever renders *between* items and looping wraps straight back
                  // to item 0 with no "next" item after the last one for the gap to sit against.
                  // Official fix: a matching margin on the last slide only (see
                  // https://www.embla-carousel.com/docs/guides/slide-gaps/).
                  index === reviews.length - 1 && 'mr-4',
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
                  readLessLabel={t('reviews.readLess')}
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
          </EmblaCarousel>
        </div>
      </div>

      {/* ============================== CTA BANNER #1 ============================== */}
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
          re-measurement citation.
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
        <div
          id="wins"
          className="mx-auto mt-16 w-full max-w-[1440px] scroll-mt-24 px-4 max-[600px]:px-0 max-[600px]:pl-4 sm:px-6 lg:px-[70px]"
        >
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
          {/* No top margin/gap here on purpose (explicit request, both desktop and mobile) — this
              is a SIBLING of the eyebrow+heading `gap-8` wrapper above, not a child of it, so the
              carousel sits flush against the heading instead of stacking a flex `gap-8` on top of
              its own former `mt-8 md:mt-[50px]` (a double-gap bug, same shape as this page's
              other padding+margin doubling fixes). */}
          <div>
            <EmblaCarousel
              prevLabel={t('carousel.prev')}
              nextLabel={t('carousel.next')}
              align="start"
              trackClassName="gap-5"
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
                    // embla's own docs: CSS `gap` (this track's `gap-5`) never applies between
                    // the LAST slide and the first when `loop: true` — see the identical fix +
                    // comment on the Reviews cards above (Reviews stays `gap-4`/`mr-4`; Wins is
                    // `gap-5`/`mr-5` per the 20px gap measured above).
                    index === profile.wins.length - 1 && 'mr-5',
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
            </EmblaCarousel>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-[70px]">
        {/* ============================== MY WAY (carousel) ==============================
            STAGE re-architecture (2026-07-23): the previous pass built this as a static CSS Grid
            (3 separate `.map()` passes + a dynamic `gridTemplateColumns` sized to
            `profile.myWay.length`) — wrong. Fresh re-verification against `327:1080` (1440px
            frame) shows this is a genuine horizontally-scrolling CAROUSEL, the exact same "peek"
            pattern already built for My WINS below (`EmblaCarousel.tsx`, `align="start"`): on the
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
            className={cn(
              // At ≤600px: cancel the shared parent wrapper's own `px-4` (16px each side) via
              // a matching negative margin, then re-add ONLY the left 16px — so this section's
              // right edge bleeds to the true viewport edge (paddings: 0, except pl-4) without
              // touching that parent wrapper (also shared by fckups/video-blog, not all of which
              // were asked to bleed this way).
              'flex flex-col gap-6 scroll-mt-24 max-[600px]:-mx-4 max-[600px]:pl-4',
              styles.spacing150,
            )}
          >
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
            <div className="relative">
              {/* ONE shared dashed rule for the whole carousel (not per-slide) — Figma's own
                  `Line 9` really is a single element spanning every stage at once, which doesn't
                  work as a per-slide copy in a real horizontally-scrolling carousel (the earlier
                  `.wayLongLine`-per-slide approach). Fixed here as an absolutely-positioned
                  overlay OUTSIDE the scrolling track, anchored to this `relative` wrapper, so it
                  stays visually still while slides scroll underneath it — same trick used to make
                  a "shared" element coexist with an independently-draggable carousel.
                  Desktop: 18px above the step-badge/number row (`top-[161px]`, corrected from an
                  earlier 36px-above estimate). Mobile/tablet (≤768px) gets its own smaller
                  estimate (`top-[99px]`) since both the year's fluid font-size and
                  `.wayConnector`'s own shorter mobile height change how tall everything above the
                  badge row is at these widths — still an estimate pending live visual check, same
                  as before. Its `left` lives on `.wayLongLine` itself (`left: -7px`). */}
              <div
                className={cn(
                  'pointer-events-none absolute top-[99px] right-0 md:top-[161px]',
                  styles.wayLongLine,
                )}
                aria-hidden="true"
              />
              <EmblaCarousel
                prevLabel={t('carousel.prev')}
                nextLabel={t('carousel.next')}
                align="start"
                trackClassName="gap-5"
              >
                {profile.myWay.map((stage, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex shrink-0 flex-col',
                      styles.waySlide,
                      // embla's own docs: CSS `gap` (this track's `gap-5`) never applies between the
                      // LAST slide and the first when `loop: true` — same fix as Reviews/My WINS.
                      index === profile.myWay.length - 1 && 'mr-5',
                    )}
                  >
                    <div className={cn('relative', styles.wayYearBlock)}>
                      <span className={styles.wayYear}>
                        {stage.yearFrom}–{stage.yearTo}
                      </span>
                      <div className={styles.wayConnector} aria-hidden="true" />
                    </div>
                    <div className="flex items-start gap-6 max-[768px]:flex-col max-[768px]:gap-4">
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
              </EmblaCarousel>
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
              // Same shared-parent-padding-bleed trick as My Way above — see that section's own
              // comment.
              'flex flex-col gap-8 scroll-mt-24 md:gap-[50px] max-[600px]:-mx-4 max-[600px]:pl-4',
              styles.spacing150,
            )}
          >
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
                    'flex flex-col gap-4 p-6 md:p-8',
                    styles.sectionCard,
                    styles.fckupsCard,
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
                    readLessLabel={t('reviews.readLess')}
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
              'flex flex-col gap-6 scroll-mt-24 md:flex-row md:items-center md:justify-between md:gap-8',
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
              <Button type="button" variant="outline" className="hidden w-fit gap-2 md:inline-flex">
                {t('videoBlog.allInterviews')}
                <VideoBlogArrowIcon />
              </Button>
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
            <Button type="button" variant="outline" className="w-full gap-2 md:hidden">
              {t('videoBlog.allInterviews')}
              <VideoBlogArrowIcon />
            </Button>
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
