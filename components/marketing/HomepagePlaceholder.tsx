import { getTranslations } from 'next-intl/server';

import { WaitlistFormCard } from './WaitlistFormCard';

/**
 * Coming-soon homepage placeholder ("Заглушка", ROADMAP stage 1.11) — Figma `866:4823`
 * (desktop) / `866:4885` (mobile). Server Component; the only client island is
 * `WaitlistFormCard` (the "Apply to Join" form, which client-side swaps into the "Thank you"
 * state — Figma `870:4928`/`870:4977` — after a successful submit).
 *
 * PIXEL-ACCURACY PASS (re-verified against the live Figma nodes, not just prior notes):
 * - H1 (`866:4850` desktop 72px "H2 (PC)" / `866:5539` mobile 32px "MOB/H1", line-height 90%/
 *   100% respectively) — same white→`#87bce6` gradient-text treatment `HeroSection` already
 *   uses for its own hero H1 (that gradient isn't retrievable as structured paint data via
 *   this read-only bridge for either hero, screenshot-confirmed match both times). Mobile no
 *   longer overrides the token's own 100% line-height with an arbitrary `1.1` — that value had
 *   no citation and doesn't match this frame's real 32px/32px mobile H1.
 * - Subtitle (`866:4852` desktop 22px Cal Sans regular / `866:5541` mobile 16px Manrope BOLD,
 *   both centered) — was flat `text-body` (16px Manrope, no weight) at every breakpoint, which
 *   only matched the mobile step; desktop needs the `--text-m` token + `font-display`, mobile
 *   needs `font-bold`. Width also loosened to `md:max-w-[688px]` (was a flat `max-w-[560px]`
 *   narrower than the node's actual 688px desktop box; mobile has no such cap, the section's
 *   own padding is the only constraint at that width, per `866:5541`'s full-bleed 343px box).
 * - Decorative glow: re-verified this is NOT the same asset as `public/images/gradient1.png`/
 *   `gradient-mobile.png` (those fade a neon cyan-turquoise top edge to black — this page's own
 *   glow, screenshotted at `866:4823`/`870:4928`, is a `--color-primary`-toned blue that grows
 *   from black at the top through blue into a near-white core low on the page, then the footer
 *   covers whatever's below) — reusing the wrong asset would visibly mismatch its color. The
 *   underlying Figma vector (`866:4826`, a huge blurred blob positioned mostly OFF the visible
 *   frame) has no resolvable fill through this bridge either (same limitation documented
 *   extensively in `MindsetterProfileView.module.css`'s own glow rules), so this stays a CSS
 *   `radial-gradient` approximation — just a taller/stronger one anchored lower with a
 *   brighter near-white core, closer to the screenshot than the previous flat single-stop
 *   version.
 */
export async function HomepagePlaceholder() {
  const t = await getTranslations('home.placeholder.hero');

  return (
    <section className="relative isolate flex min-h-[70vh] flex-col items-center justify-center gap-10 overflow-hidden px-4 py-16 sm:px-6 lg:gap-16 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_140%_100%_at_50%_100%,rgba(255,255,255,0.3)_0%,rgba(121,185,227,0.6)_28%,rgba(121,185,227,0.25)_55%,transparent_78%)] md:h-[820px]"
      />

      <div className="flex max-w-[800px] flex-col items-center gap-4 text-center">
        <h1 className="bg-[linear-gradient(95.47deg,#fff_4.71%,#87bce6_99.92%)] bg-clip-text font-display text-h1 leading-none text-transparent md:text-h2 md:leading-[0.9]">
          {t('title')}
        </h1>
        <p className="font-sans text-body font-bold text-foreground md:max-w-[688px] md:font-display md:text-m md:font-normal">
          {t('subtitle')}
        </p>
      </div>

      <WaitlistFormCard />
    </section>
  );
}
