import { getTranslations } from 'next-intl/server';

import { ChatVoiceAiFillIcon } from '@/components/icons/main-page-icons';
import { CardSlider } from '@/components/profile/CardSlider';
import { Button } from '@/components/ui/button';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/** Card photo per event, in the same order as the `events.cards` translation array. The 5th
 * card ("Sensession") has no image fill at all in Figma (`get_screenshot` on that node returns
 * an empty/blank export) — a genuine gap in the source file, not an export failure elsewhere on
 * this page, so it renders on a plain `bg-card` surface instead of inventing a stand-in photo. */
const PHOTOS = [
  '/images/main-page/event-mastermind.jpg',
  '/images/main-page/event-anakondra-tank.jpg',
  '/images/main-page/event-brain-lab.jpg',
  '/images/main-page/event-chew-chat.jpg',
  null,
];

/**
 * "Networking formats we offer" (Mindsetis Events) — Figma `572:5555` (heading) + `1241:18098`
 * (the five cards, "Frame 701"). "All events" has no `/events` route in the app yet (only
 * `/mindsetters` exists as a real catalog route today) and "Join Waitlist" has no waitlist
 * backend — both render as visually-complete but `disabled` buttons rather than linking
 * somewhere wrong or pretending to submit a waitlist signup that doesn't exist.
 */
export async function MindsetisEventsSection() {
  const t = await getTranslations('home.main.events');
  const cards = t.raw('cards') as { name: string; description: string }[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4">
          <SectionEyebrow icon={<ChatVoiceAiFillIcon className="size-4" />} label={t('eyebrow')} />
          <h2
            className={`font-display text-l leading-[0.9] font-normal md:text-h2 ${GRADIENT_HEADING_CLASSNAME}`}
          >
            {t('title')}
          </h2>
        </div>
        <Button size="lg" className="w-fit shrink-0" disabled>
          {t('viewAllCta')}
        </Button>
      </div>

      <div className="mt-10">
        <CardSlider prevLabel={t('prevCta')} nextLabel={t('nextCta')} trackClassName="gap-6">
          {cards.map((card, index) => {
            const photo = PHOTOS[index];
            return (
              <div key={card.name} className="w-[320px] shrink-0 snap-start">
                <div className="h-[250px] w-full overflow-hidden rounded-3xl bg-card">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local static asset
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 pt-6">
                  <h3 className="font-display text-m leading-none font-normal text-foreground">
                    {card.name}
                  </h3>
                  <p className="text-body text-foreground">{card.description}</p>
                </div>
                <Button variant="secondary" size="lg" className="mt-4 w-full" disabled>
                  {t('joinWaitlistCta')}
                </Button>
              </div>
            );
          })}
        </CardSlider>
      </div>
    </section>
  );
}
