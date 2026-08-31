import { getTranslations } from 'next-intl/server';

import { LanguageBubbleIcon, LocationPinIcon } from '@/components/icons/profile-meta-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';

const PHOTOS = [
  '/images/main-page/ambassador-1.jpg',
  '/images/main-page/ambassador-2.jpg',
  '/images/main-page/ambassador-3.jpg',
  '/images/main-page/ambassador-4.jpg',
];

/**
 * "Mindsetis Ambassadors" — Figma `1235:17759` (heading/subtitle) + the region tab row
 * (`1235:17672`) + four cards (`1235:6791` etc., "Frame 680"…). Same placeholder-content
 * duplication as Top Mindsetters (all four cards share identical name/title/location/language
 * copy in Figma) — one shared translation entry, four real exported photos.
 *
 * The region tabs (All/USA/Europe/LATAM/North America/Asia) are rendered as a static, visual-only
 * row (first tab marked active) rather than wired to real filtering: the four sample cards don't
 * carry real region data to filter by, so building working tab logic here would filter nothing.
 *
 * "Apply for Ambassadorship" has no dedicated application route in the app — routed to `/join`
 * (the site's one general "apply" entry point) as the closest reasonable approximation, same as
 * every other "Apply…" CTA without its own Figma prototype destination.
 *
 * "Ambassador" isn't a role that exists in this app's data model (`account_type`/`staff_roles`)
 * — this section is illustrative marketing content, matching the visitor-facing/pre-signup
 * framing of the rest of this page, not a feature being built here.
 */
export async function AmbassadorsSection() {
  const t = await getTranslations('home.main.ambassadors');
  const sample = t.raw('sample') as {
    name: string;
    title: string;
    location: string;
    languages: string;
  };
  const tabs = t.raw('tabs') as string[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2
          className={`font-display text-l leading-[0.9] font-normal md:text-h2 ${GRADIENT_HEADING_CLASSNAME}`}
        >
          {t('title')}
        </h2>
        <p className="text-body text-foreground">{t('subtitle')}</p>
        <Button asChild size="lg" className="w-fit">
          <Link href="/join">{t('applyCta')}</Link>
        </Button>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {tabs.map((tab, index) => (
          <span
            key={tab}
            className={cn(
              'rounded-full px-4 py-2 text-body text-muted-foreground',
              index === 0 &&
                'text-foreground underline decoration-primary decoration-2 underline-offset-8',
            )}
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="mt-10">
        <CardSlider prevLabel={t('prevCta')} nextLabel={t('nextCta')} trackClassName="gap-6">
          {PHOTOS.map((photo, index) => (
            <div key={photo} className="w-[310px] shrink-0 snap-start rounded-2xl bg-card p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local static asset */}
              <img src={photo} alt="" className="h-[300px] w-full rounded-xl object-cover" />
              <div className="flex flex-col gap-2 px-2 pt-4 pb-2">
                <span className="w-fit rounded-full bg-[#fbf286]/10 px-2 py-1 text-tiny text-[#fbf286]">
                  {t('flagBadge')}
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
