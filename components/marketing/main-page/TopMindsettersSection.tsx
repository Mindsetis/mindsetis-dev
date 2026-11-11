import { getTranslations } from 'next-intl/server';

import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { GroupFillIcon } from '@/components/icons/main-page-icons';
import { LanguageBubbleIcon, LocationPinIcon } from '@/components/icons/profile-meta-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { resolveLanguageText, resolveLocationText } from '@/components/profile/MemberProfileView';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { FOUNDER_USERNAME } from '@/lib/config/brand-links';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { resolveBecomeMindsetterHref } from './become-mindsetter-href';
import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { MindsetterDirectoryDialog } from './MindsetterDirectoryDialog';
import { SectionEyebrow } from './SectionEyebrow';

type CardContent = { name: string; title: string; location: string; languages: string };

/**
 * The founder's card shows HER OWN profile data, live ("Mindsetis. Super final", 10.11.2026: «виведи
 * її дані які вона ввела під час онбордингу») — edit the profile and the card follows. Title is
 * role + the FIRST company only (the owner's call, same day): she lists three companies in one
 * field, and the card has room for "Founder, Mindsetis". Read with the request-scoped client, the
 * same public read `/mindsetters/[username]` does for anonymous visitors. `null` (profile gone, not
 * a Mindsetter, query failed) falls back to the dictionary copy, so the row never breaks.
 */
async function loadFounderCard(): Promise<CardContent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'full_name, last_name, role, company, city, country, region_name, languages, account_type',
    )
    .eq('username', FOUNDER_USERNAME)
    .maybeSingle();
  if (error || !data || data.account_type !== 'mindsetter') return null;

  const name = [data.full_name, data.last_name].filter(Boolean).join(' ').trim();
  const firstCompany = data.company?.split(',')[0]?.trim();
  const title = [data.role?.trim(), firstCompany].filter(Boolean).join(', ');
  if (!name) return null;
  return {
    name,
    title,
    location:
      resolveLocationText({
        city: data.city,
        country: data.country,
        regionName: data.region_name,
      }) ?? '',
    languages: resolveLanguageText({ languages: data.languages }) ?? '',
  };
}

/* Portraits, in card order. The first is the founder; the other five are illustrative people
   whose names/roles the client wrote for them (10.11.2026, `topMindsetters.people`). The last two
   photos are shared with the Ambassadors section's own set. */
const PHOTOS = [
  '/images/main-page/mindsetter-1.jpg',
  '/images/main-page/mindsetter-2.jpg',
  '/images/main-page/mindsetter-3.jpg',
  '/images/main-page/mindsetter-4.jpg',
  '/images/main-page/ambassador-1.jpg',
  '/images/main-page/ambassador-2.jpg',
];

/**
 * "The people you'll actually talk to" (Top Mindsetters) — Figma `1187:5881` (heading) +
 * `1187:5892`/`5912`/`5932`/`5952` (the cards). Six cards: the founder's (her live profile data,
 * `loadFounderCard`, with `topMindsetters.sample` as the fallback copy) and five illustrative
 * people from `topMindsetters.people` — the client replaced Figma's "Anastasia Kondratska" ×4
 * placeholder with them on 10.11.2026 so the row stops reading as obviously drawn.
 *
 * Horizontal row reuses the existing `CardSlider` (native scroll-snap + prev/next arrows,
 * already used on the Mindsetter Profile page) rather than a new carousel implementation —
 * `scrollStep="item"` opts into the same "advance exactly one card per press at every width"
 * behavior `MindsetterProfileView.tsx` uses for Reviews/My WINS/My Way/My F*ckUp(s) (its own
 * uniform-card-row sections), rather than the two-sections-only default `'page'` proportional
 * scroll (Superpower(s)/REEL LIFE) — this section's cards are uniform width like the former
 * group, so the same per-card paging reads correctly here too.
 *
 * CARDS ("Mindsetis. Super final", 10.11.2026). The first card is the founder's and links to her
 * public page; the other five open `MindsetterDirectoryDialog` — the same popup "Find your
 * mindsetter" opens (there is no catalog route yet; `/mindsetters` itself 404s). That popup's
 * "Apply to become a Mindsetter" follows `resolveBecomeMindsetterHref()`, and is hidden for a
 * viewer who already is a Mindsetter.
 *
 * The "Verified" pill is sized by an explicit `h-6` (24px) rather than by its own padding:
 * Figma's own numbers for it don't close (`Frame 2` declares `padding: 6px 8px` AND a fixed
 * `height: 24px`, but 6 + the 19px line box + 6 = 31px), so the frame height is the value the
 * design actually renders and the vertical padding is vestigial. Horizontal padding stays the
 * declared 8px; `items-center` centers the 19px line inside the 24px box.
 */
export async function TopMindsettersSection() {
  const t = await getTranslations('home.main.topMindsetters');
  const founderFallback = t.raw('sample') as CardContent;
  const people = t.raw('people') as CardContent[];
  const [founder, [ctaState, ctaHref]] = await Promise.all([
    loadFounderCard(),
    resolveBecomeMindsetterHref(),
  ]);
  const cards: CardContent[] = [founder ?? founderFallback, ...people];
  // "Apply to become a Mindsetter" makes no sense to someone who already is one.
  const directoryCtaHref = ctaState === 'mindsetter' ? null : ctaHref;

  return (
    <section className="w-full py-16 md:py-20 lg:py-24">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-[70px]">
        <div className="flex flex-col gap-6 md:gap-8">
          <SectionEyebrow
            icon={<GroupFillIcon className="size-3 md:size-4" />}
            label={t('eyebrow')}
          />
          {/* Figma: mobile "The people you'll actually talk to" is 40px ("H2 (PC)" scaled down for
              this section specifically), not the shared 32px `text-l` token every OTHER Main Page
              section's mobile H2 uses — same one-off `text-[40px]` precedent already established
              by `ThreeWaysToStart.tsx` for the same reason (that section's own mobile H2 is also
              40px, not 32). */}
          {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
              comment. Negative margin cancels the padding out of flow so the parent `gap-6
              md:gap-8` to the CTA button stays exactly as measured. */}
          <h2
            className={`font-display text-[40px] leading-[0.9] font-normal md:max-w-[750px] md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
        </div>
        {/* Figma: mobile "Primary" CTA spans the full 343px text column; desktop sizes to content
            and sits bottom-aligned next to the heading (`md:items-end` above). */}
        <MindsetterDirectoryDialog ctaHref={directoryCtaHref}>
          <Button size="lg" className="w-full md:w-fit md:shrink-0">
            {t('viewAllCta')}
          </Button>
        </MindsetterDirectoryDialog>
      </div>

      {/* Figma gap from the heading block to the card row: 32px mobile (`2916 - 2884`), 50px
          desktop (`3681 - 3631`) — re-measured off the raw node `y`/`height` values, not a shared
          section-spacing token (this section's own value, not reused elsewhere). */}
      <div className="mt-8 md:mt-[50px] lg:mx-auto lg:max-w-[1440px] lg:px-[70px]">
        <CardSlider
          prevLabel={t('prevCta')}
          nextLabel={t('nextCta')}
          // Below `lg:` the track runs to the true screen edge — the section is `w-full` and only
          // its heading row is capped, so no break-out math (and no `vw`, which counts the
          // scrollbar and shifted MindsetisEvents by 7.5px) is needed. The page gutter comes back
          // as `scroll-padding` here plus a margin on the first/last card, NOT as spacer items:
          // spacers carry their own snap point a gutter away from the card grid, so one press
          // travelled a card-pitch-plus-a-gutter and parked middle cards flush against the edge
          // (`MindsetterProfileView.module.css` records the same switch on 2026-08-06). At `lg:`
          // the wrapper above takes the 1440px column and its 70px padding, and these all go to 0.
          trackClassName="scroll-pl-4 gap-4 sm:scroll-pl-6 md:gap-5 lg:scroll-pl-0"
          scrollStep="item"
        >
          {PHOTOS.map((photo, index) => {
            const card = cards[index];
            if (!card) return null;
            const cardClassName = cn(
              'flex w-[275px] shrink-0 flex-col gap-3 rounded-2xl bg-card px-2 pt-2 pb-4 text-left md:w-[310px] md:gap-4',
              'cursor-pointer outline-none transition-colors hover:bg-[#222] focus-visible:ring-2 focus-visible:ring-ring',
              // The page gutter is a margin on the two edge cards (plus the track's own
              // `scroll-padding`), so every card keeps its own snap point — no spacer items
              // and no two-points-a-gap-apart ambiguity at the ends. Cancelled at `lg:`, where
              // the wrapper's padding supplies the gutter instead.
              'snap-start',
              index === 0 && 'ml-4 sm:ml-6 lg:ml-0',
              index === PHOTOS.length - 1 && 'mr-4 sm:mr-6 lg:mr-0',
            );
            const body = (
              <>
                {/* `aspect-[3/4]` per the client's Release-1 list (H5) rather than a Figma node —
                    see the identical note in `AmbassadorsRegionCarousel`, which this section's
                    cards mirror. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
                <img src={photo} alt="" className="aspect-[3/4] w-full rounded-lg object-cover" />
                <span className="flex flex-col gap-2 pl-2 md:gap-4 md:px-4">
                  <span className="inline-flex h-6 w-fit items-center gap-1 rounded-full border border-success px-2">
                    <CheckCircleFillIcon className="size-3 text-success" />
                    {/* Figma keeps the "Verified" label a flat 14px at BOTH breakpoints (unlike
                        the shared `text-tiny` token, which drops to 12px under 768px). */}
                    <span className="text-[14px] leading-[19px] text-success">
                      {t('verifiedBadge')}
                    </span>
                  </span>
                  <span className="flex flex-col gap-0.5 md:gap-0">
                    {/* Figma: mobile name is Manrope Bold 16/22; desktop switches to Cal Sans
                        22/29 ("M (PC)") — a real per-breakpoint change in the source file. */}
                    <span className="text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal">
                      {card.name}
                    </span>
                    {/* Also a flat 14px at both breakpoints in Figma. */}
                    <span className="text-[14px] leading-[19px] text-muted-foreground">
                      {card.title}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-tiny text-foreground">
                    {card.location ? (
                      <span className="inline-flex items-center gap-1">
                        <LocationPinIcon className="size-3.5 text-primary" />
                        {card.location}
                      </span>
                    ) : null}
                    {card.languages ? (
                      <span className="inline-flex items-center gap-1">
                        <LanguageBubbleIcon className="size-3.5 text-primary" />
                        {card.languages}
                      </span>
                    ) : null}
                  </span>
                </span>
              </>
            );
            // The founder's card is a real link to her page — only when her page is actually
            // readable here (`founder` loaded); otherwise it opens the directory popup like the rest
            // rather than linking to a 404.
            return index === 0 && founder ? (
              <Link key={photo} href={`/mindsetters/${FOUNDER_USERNAME}`} className={cardClassName}>
                {body}
              </Link>
            ) : (
              <MindsetterDirectoryDialog key={photo} ctaHref={directoryCtaHref}>
                <button type="button" className={cardClassName}>
                  {body}
                </button>
              </MindsetterDirectoryDialog>
            );
          })}
        </CardSlider>
      </div>
    </section>
  );
}
