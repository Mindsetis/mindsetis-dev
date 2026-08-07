import { cn } from '@/lib/utils';

import styles from './HomepagePlaceholder.module.css';
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
 *   glow is a `--color-primary`-toned blue that grows from black at the top through blue into a
 *   near-white core low on the page). A hand-tuned CSS `radial-gradient` was tried first (the
 *   underlying Figma vector, `866:4825`/`866:5579`, has no resolvable fill through this
 *   read-only bridge — same limitation documented in `MindsetterProfileView.module.css`'s own
 *   glow rules), but no set of gradient stops matched the design's actual soft/irregular blur,
 *   and a fixed `h-[480px]`/`h-[820px]` panel didn't track the section's real (content-driven,
 *   locale-dependent) height — leaving a visible dark gap above the footer that the design
 *   doesn't have. Replaced with the ACTUAL rasterized `bg` layer exported straight from Figma
 *   (`866:4824` desktop / `866:5578` mobile — just the black-fill + glow-blob layer, no
 *   text/form/footer) as `public/images/homepage-glow-{desktop,mobile}.png`, applied via a
 *   `background-size: cover; background-position: bottom` CSS background (small dedicated
 *   `HomepagePlaceholder.module.css` — Tailwind's arbitrary background-image utility broke
 *   webpack's CSS url resolution for a `/`-containing path, same CSS Module precedent as
 *   `MemberProfileView.module.css`) on an absolute `inset-0` layer — `cover`/`bottom` make it
 *   track the section's actual rendered height and keep the image's already-bright bottom edge
 *   flush against the footer, matching Figma's own composition (confirmed via node tree: the
 *   footer, `866:4842`, is a separate opaque `#1a1a1a` sibling layer painted OVER `bg` with no
 *   blend — a deliberate hard seam by design, not something to fade the image into).
 */
export function HomepagePlaceholder() {
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col items-center justify-center gap-10 overflow-hidden px-4 pt-12 pb-24 sm:px-6 lg:gap-16 lg:pt-24 lg:pb-[146px]">
      <div aria-hidden="true" className={cn('pointer-events-none -z-10', styles.glow)} />

      <WaitlistFormCard />
    </section>
  );
}
