import { getTranslations } from 'next-intl/server';

import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { GroupFillIcon } from '@/components/icons/main-page-icons';
import { LanguageBubbleIcon, LocationPinIcon } from '@/components/icons/profile-meta-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

const PHOTOS = [
  '/images/main-page/mindsetter-1.jpg',
  '/images/main-page/mindsetter-2.jpg',
  '/images/main-page/mindsetter-3.jpg',
  '/images/main-page/mindsetter-4.jpg',
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
 * already used on the Mindsetter Profile page) rather than a new carousel implementation.
 *
 * "Find your mindsetter" links to `/mindsetters` — the one real catalog route that exists today.
 * Individual cards are NOT linked to a profile: the four cards' identical placeholder content
 * doesn't correspond to any real user, so linking to `/mindsetters/[username]` would 404.
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
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4">
          <SectionEyebrow icon={<GroupFillIcon className="size-4" />} label={t('eyebrow')} />
          <h2
            className={`font-display text-l leading-[0.9] font-normal md:text-h2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
        </div>
        <Button asChild size="lg" className="w-fit shrink-0">
          <Link href="/mindsetters">{t('viewAllCta')}</Link>
        </Button>
      </div>

      <div className="mt-10">
        <CardSlider prevLabel={t('prevCta')} nextLabel={t('nextCta')} trackClassName="gap-6">
          {PHOTOS.map((photo, index) => (
            <div key={photo} className="w-[310px] shrink-0 snap-start rounded-2xl bg-card p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
              <img src={photo} alt="" className="h-[300px] w-full rounded-xl object-cover" />
              <div className="flex flex-col gap-2 px-2 pt-4 pb-2">
                <span className="inline-flex w-fit items-center gap-1 rounded-full border border-success px-2 py-1.5">
                  <CheckCircleFillIcon className="size-3 text-success" />
                  <span className="text-tiny text-success">{t('verifiedBadge')}</span>
                </span>
                <div className="flex flex-col">
                  <span className="font-display text-m leading-none font-normal text-foreground">
                    {sample.name}
                  </span>
                  <span className="text-tiny text-muted-foreground">{sample.title}</span>
                </div>
                <div className="flex items-center gap-4 text-tiny text-foreground">
                  <span className="inline-flex items-center gap-1">
                    <LocationPinIcon className="size-3.5" />
                    {sample.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LanguageBubbleIcon className="size-3.5" />
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
