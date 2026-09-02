import { getTranslations } from 'next-intl/server';

import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/**
 * "Three ways to start" — Figma `572:5520` ("Frame 538"). Three cards, each a genuinely
 * different treatment (confirmed via node fills + a rendered screenshot): card 1 is a diagonal
 * brand-blue→dark gradient — Figma has two distinct gradient instances per breakpoint, not one
 * scaled value: `linear-gradient(358.93deg, #1A1A1A 1.47%, #79B9E3 99.68%)` on desktop vs
 * `linear-gradient(0.47deg, #1A1A1A 21.39%, #79B9E3 99.35%)` on mobile. Card 2 is flat
 * `#1a1a1a`/`bg-card`, card 3 is flat white with BLACK text (the one section of this page that
 * isn't on the dark theme — confirmed both from the raw fill/text-color data and the rendered
 * screenshot).
 *
 * Card height: Figma sets a hard 300px (desktop) / 180px (mobile) on each card. Reproduced here
 * as `min-h-*` rather than a hard `h-*` — the layout (icon row pinned top, title+description
 * pinned bottom via `justify-between`) already matches Figma's `space-between` exactly at the
 * Figma pixel counts, but a fixed height risks the description clipping/overflowing the rounded
 * card if a longer translation (e.g. a longer `es` string) wraps to an extra line; `min-h`
 * preserves the intended size for the reference copy while letting the card grow safely instead
 * of clipping.
 *
 * The mobile-only card-number text nodes ("1"/"2"/"3") are set to `Inter Tight Bold` in Figma,
 * detached from the shared "MOB/tiny spacing" text style (Manrope Bold) used by every other
 * instance of this same number, including the desktop version of these same three cards. Since
 * there's no other Inter Tight anywhere in this app's type system and the node isn't bound to a
 * named style, this reads as a stray per-node font override rather than an intentional choice —
 * kept as Manrope here (matches `text-tiny`'s existing font stack) rather than pulling in an
 * unused typeface.
 *
 * DELIBERATE DEPARTURE FROM FIGMA: the `flashlight-fill` glyph that sits beside each card's
 * number in the design ("Frame 21", 14×14 desktop / 12×12 mobile, white on card 1 and brand
 * blue on cards 2–3) is intentionally NOT rendered — the product owner dropped it on
 * 2026-08-31. Do not re-add it from a future Figma pass without asking; the number stands
 * alone by design decision, not by oversight.
 *
 * MOBILE SPACING: the gap between this section and the video block above it is 80px in Figma
 * (button bottom y1257 → this section's text block y1337), not the 128px two stacked `py-16`s
 * produce — so mobile splits it 40/40 (`pt-10` here, `pb-10` on the video block) instead of
 * 64/64. Desktop keeps `lg:py-24`: its own equivalent gap is a separate, still-unreconciled
 * 192px vs Figma's 130px, deliberately left alone because the desktop rendering was signed off.
 */
export async function ThreeWaysToStart() {
  const t = await getTranslations('home.main.threeWays');
  // Figma reuses the exact same "WHAT IS MINDSETIS" eyebrow instance here as the video-block
  // section above it — read from that section's own translation key rather than duplicating the
  // string under a second key.
  const tEyebrow = await getTranslations('home.main.whatIsMindsetis');
  const cards = t.raw('cards') as { title: string; description: string }[];

  const cardBackgroundStyles = [
    'bg-[linear-gradient(0.47deg,#1A1A1A_21.39%,#79B9E3_99.35%)] text-white md:bg-[linear-gradient(358.93deg,#1A1A1A_1.47%,#79B9E3_99.68%)]',
    'bg-card text-white',
    'bg-white text-black',
  ];
  const cardNumberColorStyles = ['text-white', 'text-muted-foreground', 'text-muted-foreground'];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-10 pb-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <SectionEyebrow
        icon={<QuestionFillIcon className="size-3 text-primary md:size-4" />}
        label={tEyebrow('eyebrow')}
      />
      {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
          comment. Negative margin cancels the padding so the `mt-8 md:mt-[50px]` gap to the
          cards grid below stays exactly as measured. */}
      <h2
        className={cn(
          'mt-6 font-display text-[40px] leading-[0.9] font-normal md:mt-8 md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2',
          GRADIENT_HEADING_CLASSNAME,
        )}
      >
        {t('title')}
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-4 md:mt-[50px] md:grid-cols-3 md:gap-5">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className={cn(
              'flex min-h-[180px] flex-col justify-between gap-12 rounded-lg p-4 md:min-h-[300px] md:rounded-3xl md:p-8',
              cardBackgroundStyles[index],
            )}
          >
            <span
              className={cn('text-tiny font-bold tracking-[0.3em]', cardNumberColorStyles[index])}
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-2 md:gap-4">
              <h3 className="font-display text-[24px] leading-[24px] font-normal md:text-[32px] md:leading-[42px]">
                {card.title}
              </h3>
              <p className="text-body font-medium leading-[22px] md:font-normal">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
