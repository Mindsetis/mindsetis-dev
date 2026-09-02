import { getTranslations } from 'next-intl/server';

import { FaqAccordion, type FaqItem } from './FaqAccordion';
import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
/**
 * FAQ — Figma `1229:6172` (heading). The Q&A copy comes from TWO places, which is why an earlier
 * pass kept finding placeholders:
 *   - the FIRST question ("Who can join Mindsetis?") is authored inside this section's own
 *     "Surface" cards (`1235:6482` etc.), the only one of those cards carrying answer copy;
 *   - the other FIVE live in a top-level frame named `Frame 673` (`1235:6527`) that sits OUTSIDE
 *     the "Main Page" subtree entirely. Searching only the section's own card subtree finds
 *     nothing there, which is what produced the old "Answer coming soon." placeholders.
 * The name `Frame 673` is reused by two unrelated frames in the file (a "request sent"
 * confirmation modal), so a name search has to be checked against every match, not the first hit
 * — the same duplicate-name trap that hid the Originals card photos in `Frame 702`.
 *
 * `home.main.faq.items` is therefore the section's own question first, then `Frame 673`'s five in
 * their top-to-bottom order. No placeholders remain.
 *
 * Card title font swaps per breakpoint like every other Main Page card (`MOB/button text` —
 * Manrope Bold 16/22 — on mobile, Cal Sans 22/29 "M (PC)" on desktop); same pattern as
 * `MindsetisEventsSection`/`TopMindsettersSection`. Answer body text is Manrope 16/22 at both
 * breakpoints. Card padding/gap is 16px/8px on mobile vs 24px/12px on desktop (`Surface` auto
 * layout); grid gutter is 16px mobile / 20px desktop, both axes (confirmed via card
 * left/top deltas: 640×2 + 20px gutter = 1300px content width at desktop).
 *
 * Chevron: client-supplied SVG (`components/icons/faq-chevron-icon.tsx`) is a right-pointing
 * arrow at 0°; rotates 90° on the open state to point down, per the client's explicit spec
 * ("коли питання розкрите — стрілка вниз"). Hardcoded brand-blue fill/stroke — Figma's own
 * chevron instances use the same color in both states, never `currentColor`.
 *
 * This stays a Server Component; the cards themselves live in `FaqAccordion` (client) because
 * `<details>` cannot animate its own reveal — see that file for why. The `#2a2a2a` card border is
 * the exact hardcoded value Figma uses for this subtle divider, same value `ImageOptimizeHint`
 * already uses.
 */
export async function FaqSection() {
  const t = await getTranslations('home.main.faq');
  const items = t.raw('items') as FaqItem[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      {/* `w-fit` matters here, unlike every other gradient heading on this page: a block-level
          `<h2>` spans the full 1300px column, and `bg-clip-text` paints the gradient across that
          whole box — so on a word as short as "FAQ" only the first ~10% of the ramp lands on the
          glyphs and the text reads as flat white. Shrinking the box to the text puts the whole
          white→blue ramp on the letters, which is what Figma's own 130px-wide text node does.
          The other headings escape this because they either fill most of the column or sit in a
          `items-center` flex parent that already shrink-wraps them. */}
      {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: descender-crop fix, see `gradient-heading.ts`'s doc
          comment. Negative margin cancels the padding out of flow so `FaqAccordion`'s own `mt-8
          md:mt-[50px]` gap stays exactly as measured. */}
      <h2
        className={`w-fit font-display text-[40px] leading-[0.9] font-normal md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2 ${GRADIENT_HEADING_CLASSNAME}`}
      >
        {t('title')}
      </h2>

      <FaqAccordion items={items} />
    </section>
  );
}
