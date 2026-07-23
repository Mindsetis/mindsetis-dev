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
  BallPenFillIcon,
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
  ReelLifeBlockIcon,
  VideoBlogBlockIcon,
} from '@/components/icons/shine-block-icons';
import { CardSlider } from '@/components/profile/CardSlider';
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
import { RolesAccordion } from '@/components/profile/RolesAccordion';
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

/** "Numbers" stat-card gradient-border palette — one CSS Module class per card *position*, same
 * "illustrative variety, not semantic" precedent as `TOPIC_PILL_COLOR_CLASSES` above (Figma:
 * `552:4979`-`552:4988`/`401:7744`-`401:7755`, a distinct two-tone gradient border per card).
 * `profile.numbers` allows up to `MAX_NUMBERS` (10, see `lib/validation/mindsetter.ts`) while
 * Figma's own mockup only shows 4, so the 4-color palette cycles by index the same way. See
 * `.numberStat*` in `MindsetterProfileView.module.css` for the actual gradient/glow values. */
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

/** Shared base classes for every `CardSlider` item (Reviews / My WINS / My F*ckUp(s) / REEL
 * LIFE) — same mobile width + scroll-snap participation across all four, kept in one place so a
 * future 5th slider section can't forget `snap-start` and silently break scroll-snap. */
const SLIDER_ITEM_BASE = 'w-[280px] shrink-0 snap-start';

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

/** Small bold outlined index badge shared by Superpowers / F*ckUps' numbered card lists.
 * (Roles and Help both moved to their own accordion components — `RolesAccordion.tsx` /
 * `HelpWithAccordion.tsx` — after re-checking their actual Figma node structure; neither uses
 * this badge anymore.) */
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
  const hasVideoBlog = Boolean(profile.videoBlog?.youtube || profile.videoBlog?.vimeo);
  const videoBlogEmbedUrl = toEmbedUrl(
    profile.videoBlog?.youtube || profile.videoBlog?.vimeo || null,
  );
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
          overwhelming majority of clean Figma measurements. The Hero section itself keeps its
          pre-existing `lg:pt-16` (page-top → hero-content spacing, unrelated to inter-section
          rhythm) but drops the old `pb-10 md:pb-16` bottom padding it used to carry — that was
          this file's old mechanism for "gap to Roles"; Roles' own new `mt-20 lg:mt-[150px]` now
          owns that gap instead, so keeping Hero's bottom padding too would double it. */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-0 sm:px-6 lg:px-[70px] lg:pt-16">
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
      </div>

      {/* ============================== ROLES ==============================
          Stage 1.10 pixel-polish pass (ROADMAP item 2): rebuilt as an expand/collapse
          accordion — see `RolesAccordion.tsx` for the full Figma citation + the
          `isSafeHttpUrl` stored-XSS guard (unchanged, just relocated into that component).
          STAGE 1.12: own top-level section wrapper now (see HERO's doc comment above for the
          80/150 rhythm + per-section padding citation) — was nested in the old shared wrapper. */}
      {profile.roles.length > 0 && (
        <div
          id="roles"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-8">
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
          vector reproduction" precedent as `.ctaGlow` above.
          STAGE 1.12: own top-level section wrapper now (`hidden`/`lg:block` unchanged — still
          desktop-only); the inner `.topicsCard` card itself is untouched. */}
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

      {/* ============================== SUPERPOWER(S) ==============================
          STAGE 1.12: own top-level section wrapper now (content unchanged). */}
      {profile.superpowers.length > 0 && (
        <div
          id="superpowers"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-8">
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
              <h2 className={cn('hidden font-display text-h2 md:block', styles.gradientHeading)}>
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
              className="relative aspect-[345/450] w-full shrink-0 md:aspect-[372/524] md:max-w-[372px]"
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
            <h2 className={cn('hidden font-display text-h2 md:block', styles.gradientHeading)}>
              {t('numbers.heading')}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-5">
              {profile.numbers.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={cn(
                    'flex flex-col gap-2 p-4 md:aspect-[151/129] md:justify-between md:gap-0 md:p-8',
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
              <h2 className={cn('hidden font-display text-h2 md:block', styles.gradientHeading)}>
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

      {/* ============================== REEL LIFE ============================== */}
      {profile.reelLifePhotoUrls.length > 0 && (
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
              <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
                {t('reelLife.heading')}
              </h2>
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
          <div className="relative left-1/2 right-1/2 mt-8 w-screen -mx-[50vw]">
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
          Spec §5.4 requires this section; no Figma frame located and no Events system exists yet
          (ROADMAP stage 1.10 open item). Product decision: render a minimal, neutral empty state
          (heading + "no events yet" placeholder) rather than inventing rich markup — same
          "static/decorative until the real system exists" precedent as Reviews below. Always
          renders (no backing data to gate visibility on yet).
          STAGE 1.12: `mt-20 lg:mt-[150px]` replaces the old `py-16` (see HERO's doc comment). */}
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

      {/* ============================== REVIEWS (static, carousel) ==============================
          Figma `552:4496` "Frame 448": the card row (`552:4512` "Frame 273") is 1740px wide across
          4×420px cards — wider than the ~1300px content column — with a dedicated prev/next
          control (`552:4605`) centered below it, i.e. a real carousel (see `CardSlider.tsx`), not
          the static `md:grid-cols-3` this section rendered before.
          STAGE 1.12: `mt-20 lg:mt-[150px]` replaces the old `py-16` (see HERO's doc comment). */}
      <div
        id="reviews"
        className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
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

      {/* ============================== CTA BANNER #1 ==============================
          STAGE 1.12: was `max-w-[1300px]` PLUS `lg:px-[70px]` on the same div — a pre-existing
          double-inset bug (Figma `552:4630` "Frame 58" is `x=70,width=1300` directly under the
          1440-wide root, i.e. the SAME 70px-inset content column every other section uses, not a
          further-inset 1300px column of its own) that only went unnoticed because 1300-70-70=1160
          still looked plausible. Fixed to the standard `max-w-[1440px]` + padding pattern; also
          gains its own `mt-20 lg:mt-[150px]` (it previously had NONE of its own, silently relying
          on Reviews' now-removed `pb-16` for the gap above it — the exact double-spacing/
          missing-spacing bug this whole pass fixes, see HERO's doc comment). */}
      <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
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
          control (`552:4625`) centered below, i.e. a carousel (see `CardSlider.tsx`), not the
          `md:grid-cols-3` this section rendered before. Order fix: this section is FIRST of
          the three (right after CTA banner #1), not last — see this component's own top doc
          comment for the full re-measurement citation.
          STAGE 1.12: own top-level section wrapper now (content unchanged) — was nested with My
          Way/F*ckUp(s)/video blog in one shared `max-w-[1440px]` div. */}
      {profile.wins.length > 0 && (
        <div
          id="wins"
          className="mx-auto mt-20 w-full max-w-[1440px] scroll-mt-24 px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]"
        >
          <div className="flex flex-col gap-8">
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
        </div>
      )}

      {/* ============================== MY WAY ==============================
          STAGE 1.12: own top-level section wrapper now (content unchanged). */}
      {profile.myWay.length > 0 && (
        <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
          <div className="flex flex-col gap-8">
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
          fckups/page.tsx`.
          STAGE 1.12: own top-level section wrapper now (content unchanged). */}
      {profile.fckups.length > 0 && (
        <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
          <div className="flex flex-col gap-8">
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
        </div>
      )}

      {/* ============================== BUILT NOT BURN · INTERVIEW ==============================
          STAGE 1.12: own top-level section wrapper now (content unchanged). */}
      {hasVideoBlog && (
        <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
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
        </div>
      )}

      {/* ============================== CTA BANNER #2 ==============================
          STAGE 1.12: same `max-w-[1300px]`+`lg:px-[70px]` double-inset bug fix as CTA banner #1
          above (Figma `552:4741` "Frame 237" is also `x=70,width=1300` under the 1440-wide root).
          `mt-16` → `mt-20 lg:mt-[150px]` (see HERO's doc comment). */}
      <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
        <CtaBanner
          heading={t('ctaBanner2.heading')}
          price={price}
          inviteLabel={t('inviteToEvent')}
          bookLabel={t('bookSession')}
        />
      </div>

      {/* ============================== BEYOND BUSINESS ==============================
          STAGE 1.12: `mt-20 lg:mt-[150px]` replaces the old `py-16` (see HERO's doc comment) —
          also matches Figma's own footer-approach gap (`552:5234` "Frame 533" ends y=11821, the
          footer component `552:5170` starts y=11971 → +150). */}
      {interestGroups.length > 0 && (
        <div className="mx-auto mt-20 w-full max-w-[1440px] px-4 sm:px-6 lg:mt-[150px] lg:px-[70px]">
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
