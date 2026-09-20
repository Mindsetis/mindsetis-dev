import { getTranslations } from 'next-intl/server';

import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { GroupFillIcon } from '@/components/icons/main-page-icons';
import { LanguageBubbleIcon, LocationPinIcon } from '@/components/icons/profile-meta-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/* Placeholder portraits. The last two are borrowed from the Ambassadors section's own set —
   Figma ships only four mindsetter photos, but four cards very nearly fit a 1440px viewport
   (leaving ~15px of scroll), which makes the carousel impossible to exercise on desktop. Six
   gives a real scroll range to test against; swap the whole list for real catalog data once
   `/mindsetters` is live. */
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
 * `1187:5892`/`5912`/`5932`/`5952` (the four cards). All four cards share byte-identical name/
 * title/location/language copy in Figma itself ("Anastasia Kondratska" ×4) — a placeholder-
 * content duplication in the source file, not something this build introduces — so the four
 * photos (exported 1:1 from Figma) are rendered against ONE shared translation entry
 * (`home.main.topMindsetters.sample`) instead of four near-identical i18n entries.
 *
 * Horizontal row reuses the existing `CardSlider` (native scroll-snap + prev/next arrows,
 * already used on the Mindsetter Profile page) rather than a new carousel implementation —
 * `scrollStep="item"` opts into the same "advance exactly one card per press at every width"
 * behavior `MindsetterProfileView.tsx` uses for Reviews/My WINS/My Way/My F*ckUp(s) (its own
 * uniform-card-row sections), rather than the two-sections-only default `'page'` proportional
 * scroll (Superpower(s)/REEL LIFE) — this section's cards are uniform width like the former
 * group, so the same per-card paging reads correctly here too.
 *
 * "Find your mindsetter" links to `/mindsetters` — the one real catalog route that exists today.
 * Individual cards are NOT linked to a profile: the four cards' identical placeholder content
 * doesn't correspond to any real user, so linking to `/mindsetters/[username]` would 404.
 *
 * The "Verified" pill is sized by an explicit `h-6` (24px) rather than by its own padding:
 * Figma's own numbers for it don't close (`Frame 2` declares `padding: 6px 8px` AND a fixed
 * `height: 24px`, but 6 + the 19px line box + 6 = 31px), so the frame height is the value the
 * design actually renders and the vertical padding is vestigial. Horizontal padding stays the
 * declared 8px; `items-center` centers the 19px line inside the 24px box.
 */
export async function TopMindsettersSection() {
  const t = await getTranslations('home.main.topMindsetters');
  const sample = t.raw('sample') as {
    name: string;
    title: string;
    location: string;
    languages: string;
  };

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
        <NotYetAvailable feature="exploreCommunity" className="w-full md:w-fit md:shrink-0">
          <Button size="lg" disabled className="w-full">
            {t('viewAllCta')}
          </Button>
        </NotYetAvailable>
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
          {/* The card wrapper is `relative` because the `sr-only` span inside it is `position:
              absolute`: with no positioned ancestor it resolves against the INITIAL containing
              block and lands at its static x inside the horizontally-scrolled track — off-viewport
              for the later cards, which pushed `<html>`s scrollWidth to ~1026px on a 375px screen. */}
          {PHOTOS.map((photo, index) => (
            <div
              key={photo}
              className={cn(
                'relative flex w-[275px] shrink-0 flex-col gap-3 rounded-2xl bg-card px-2 pt-2 pb-4 md:w-[310px] md:gap-4',
                // The page gutter is a margin on the two edge cards (plus the track's own
                // `scroll-padding`), so every card keeps its own snap point — no spacer items
                // and no two-points-a-gap-apart ambiguity at the ends. Cancelled at `lg:`, where
                // the wrapper's padding supplies the gutter instead.
                'snap-start',
                index === 0 && 'ml-4 sm:ml-6 lg:ml-0',
                index === PHOTOS.length - 1 && 'mr-4 sm:mr-6 lg:mr-0',
              )}
            >
              {/* `aspect-[3/4]` per the client's Release-1 list (H5) rather than a Figma node —
                  see the identical note in `AmbassadorsRegionCarousel`, which this section's
                  cards mirror. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
              <img src={photo} alt="" className="aspect-[3/4] w-full rounded-lg object-cover" />
              <div className="flex flex-col gap-2 pl-2 md:gap-4 md:px-4">
                <span className="inline-flex h-6 w-fit items-center gap-1 rounded-full border border-success px-2">
                  <CheckCircleFillIcon className="size-3 text-success" />
                  {/* Figma keeps the "Verified" label a flat 14px at BOTH breakpoints (unlike the
                      shared `text-tiny` token, which drops to 12px under 768px) — same "explicit
                      pixel value instead of the auto-shrinking token" precedent as the Mindsetter
                      Profile page's `.ctaPricePill`. */}
                  <span className="text-[14px] leading-[19px] text-success">
                    {t('verifiedBadge')}
                  </span>
                </span>
                <div className="flex flex-col gap-0.5 md:gap-0">
                  {/* Figma: mobile card name is Manrope Bold 16/22 ("MOB/button text" style,
                      matching the button label recipe), NOT the display font — desktop switches to
                      Cal Sans 22/29 ("M (PC)"). A real per-breakpoint typeface/weight change in the
                      source file, not a mistake carried over from the button. */}
                  <span className="text-base leading-[22px] font-bold text-foreground md:font-display md:text-m md:leading-[29px] md:font-normal">
                    {sample.name}
                  </span>
                  {/* Also a flat 14px at both breakpoints in Figma (mobile reuses "tiny simple
                      (PC)", not "MOB/tiny simple") — same reasoning as the Verified label above. */}
                  <span className="text-[14px] leading-[19px] text-muted-foreground">
                    {sample.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-tiny text-foreground">
                  <span className="inline-flex items-center gap-1">
                    <LocationPinIcon className="size-3.5 text-primary" />
                    {sample.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LanguageBubbleIcon className="size-3.5 text-primary" />
                    {sample.languages}
                  </span>
                </div>
              </div>
              <span className="sr-only">{`${sample.name} ${index + 1}`}</span>
            </div>
          ))}
        </CardSlider>
      </div>
    </section>
  );
}
