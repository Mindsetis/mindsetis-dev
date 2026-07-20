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
  PromoVideoBlockIcon,
  ReelLifeBlockIcon,
  VideoBlogBlockIcon,
} from '@/components/icons/shine-block-icons';
import {
  groupInterestsByCategory,
  isSafeHttpUrl,
  resolveDisplayName,
  resolveLanguageText,
  resolveLocationText,
  SOCIAL_ICON_MAP,
  SOCIAL_KEYS,
} from '@/components/profile/MemberProfileView';
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
 * banner #1 → My F*ckUp(s) → My Way → My WINS → Built Not Burn · Interview → CTA banner #2 →
 * Beyond Business), which differs slightly from the ROADMAP stage-1.10 planning note's
 * prose-listed order (that note was written before this node-level measurement pass — the
 * measured layout is the ground truth per CLAUDE.md: "Figma design is the source of truth").
 * Micro-navigation and "My events" have no located Figma frame (ROADMAP open items) — added per
 * product-owner decision as, respectively, static anchor links and a neutral empty state.
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

        {/* ============================== TOPICS I'M EXPERT (desktop-only) ============================== */}
        {profile.topics.length > 0 && (
          <div className="mt-16 hidden flex-col gap-8 lg:flex">
            <SectionEyebrow icon={<MicAiFillIcon className="size-4 shrink-0" />}>
              {t('topics.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h2', styles.gradientHeading)}>
              {t('topics.heading')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.topics.map((topic) => (
                <span
                  key={topic}
                  className={cn('rounded-full px-4 py-3 text-base font-bold', styles.topicPill)}
                >
                  {topic}
                </span>
              ))}
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
            {/* Stage 1.10 mobile-verification pass (ROADMAP item 4): Figma's mobile frame
                (`187:4294`) shows Reel Life as a single-row horizontal carousel (arrow-nav
                buttons flank the heading, node `261:1262` "Frame 228") rather than a stacked
                2-column grid — the arrow buttons themselves are decorative (native touch/
                trackpad scroll already covers the interaction, and adding JS-driven prev/next
                controls here would need client interactivity beyond this pass's scope, see
                `RolesAccordion.tsx`'s own note on why only Roles became a client component).
                Reused the same horizontal-scroll-on-mobile / grid-on-desktop pattern this file
                already established for My F*ckUp(s) / My Way / My WINS below. */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
              {profile.reelLifePhotoUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={cn(
                    'aspect-square w-[45%] shrink-0 sm:w-[30%] md:w-auto',
                    styles.reelLifeTile,
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private-bucket URL */}
                  <img src={url} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
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

      {/* ============================== REVIEWS (static) ============================== */}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.name} className={cn('flex flex-col gap-4 p-6', styles.reviewCard)}>
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
          </div>
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
        {/* ============================== MY F*CKUP(S) ============================== */}
        {profile.fckups.length > 0 && (
          <div className="mt-16 flex flex-col gap-8">
            <SectionEyebrow icon={<FckupsBlockIcon className="size-4" />}>
              {t('fckups.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('fckups.heading')}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
              {profile.fckups.map((fckup, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex w-[280px] shrink-0 flex-col gap-4 p-6 md:w-auto',
                    styles.sectionCard,
                  )}
                >
                  <NumberBadge index={index + 1} />
                  <p className="text-body whitespace-pre-line">{fckup.story}</p>
                </div>
              ))}
            </div>
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

        {/* ============================== MY WINS ============================== */}
        {profile.wins.length > 0 && (
          <div id="wins" className="mt-16 flex flex-col gap-8 scroll-mt-24">
            <SectionEyebrow icon={<MyWinsBlockIcon className="size-4" />}>
              {t('wins.eyebrow')}
            </SectionEyebrow>
            <h2 className={cn('font-display text-h3 md:text-h2', styles.gradientHeading)}>
              {t('wins.heading')}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
              {profile.wins.map((win, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex w-[280px] shrink-0 flex-col gap-3 p-6 md:w-auto',
                    styles.winCard,
                  )}
                  style={{ backgroundColor: WIN_COLOR_HEX[win.color] }}
                >
                  <span className="text-tiny font-bold">{win.year}</span>
                  <h3 className="font-display text-l">{win.win}</h3>
                  <p className="text-tiny opacity-90">{win.description}</p>
                </div>
              ))}
            </div>
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
