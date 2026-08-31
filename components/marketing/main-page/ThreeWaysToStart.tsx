import { getTranslations } from 'next-intl/server';

import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { FlashlightFillIcon } from '@/components/icons/mindsetter-eyebrow-icons';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/**
 * "Three ways to start" — Figma `572:5520` ("Frame 538"). Three cards, each a genuinely
 * different treatment (confirmed via a rendered screenshot, not just the raw fill data): card 1
 * is a diagonal brand-blue→dark gradient (no exported solid fill, approximated with
 * `--gradient-primary-active`, the darker of the two gradient tokens already defined in
 * `app/styles/tokens/effects.css`, since the Figma gradient reads darker/moodier than the
 * button's own lighter `--gradient-primary`), card 2 is flat `#1a1a1a`/`bg-card`, card 3 is flat
 * white with BLACK text (the one section of this page that isn't on the dark theme — confirmed
 * both from the raw fill/text-color data and the rendered screenshot).
 */
export async function ThreeWaysToStart() {
  const t = await getTranslations('home.main.threeWays');
  // Figma reuses the exact same "WHAT IS MINDSETIS" eyebrow instance here as the video-block
  // section above it — read from that section's own translation key rather than duplicating the
  // string under a second key.
  const tEyebrow = await getTranslations('home.main.whatIsMindsetis');
  const cards = t.raw('cards') as { title: string; description: string }[];

  const cardStyles = [
    'bg-[image:var(--gradient-primary-active)] text-white',
    'bg-card text-white',
    'bg-white text-black',
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <SectionEyebrow
        icon={<QuestionFillIcon className="size-4 text-muted-foreground" />}
        label={tEyebrow('eyebrow')}
      />
      <h2
        className={cn(
          'mt-4 font-display text-l leading-[0.9] font-normal md:text-h2',
          GRADIENT_HEADING_CLASSNAME,
        )}
      >
        {t('title')}
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className={cn(
              'flex flex-col justify-between gap-10 rounded-3xl p-8',
              cardStyles[index],
            )}
          >
            <span className="inline-flex items-center gap-1">
              <FlashlightFillIcon
                className={cn('size-3.5', index === 2 ? 'text-black' : 'text-white')}
              />
              <span className="text-tiny font-bold tracking-[0.3em]">{index + 1}</span>
            </span>
            <div className="flex flex-col gap-4">
              <h3 className="font-display text-l leading-none font-normal">{card.title}</h3>
              <p className="text-body">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
