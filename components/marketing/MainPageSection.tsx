import { AiSearchPreview } from './main-page/AiSearchPreview';
import { AmbassadorsSection } from './main-page/AmbassadorsSection';
import { FaqSection } from './main-page/FaqSection';
import { HeroBand } from './main-page/HeroBand';
import { MindsetisEventsSection } from './main-page/MindsetisEventsSection';
import { MindsetisOriginalsSection } from './main-page/MindsetisOriginalsSection';
import { ThreeWaysToStart } from './main-page/ThreeWaysToStart';
import { TopMindsettersSection } from './main-page/TopMindsettersSection';
import { WhatIsMindsetis } from './main-page/WhatIsMindsetis';

/**
 * The real homepage — Figma "Main Page" (`572:5427` desktop / `1249:18262` mobile, grouped under
 * the file's own "Main Page" organizational section `552:3983`). Rendered by
 * `app/[locale]/page.tsx` only when `COMING_SOON_MODE` is off, in place of the old `HeroSection`
 * (moved to `/join`, see that route's own doc comment) — Header/Footer come from that page, not
 * from a layout, same as every other homepage variant (see `page.tsx`'s doc comment for why).
 *
 * SCOPE — every section of the Figma frame is built below (hero, what-is-Mindsetis, three ways
 * to start, AI-search preview, Top Mindsetters, Mindsetis Events, Mindsetis Originals,
 * Ambassadors, FAQ), mostly as illustrative/static marketing content — see each section's own doc
 * comment for what's real vs. a documented approximation (AI search has no backend yet, "All
 * events"/"Join Waitlist"/ambassador application/"Watch" have no dedicated routes, several cards
 * reuse Figma's own duplicate-placeholder copy).
 *
 * "MINDSETIS ORIGINALS" (`MindsetisOriginalsSection`, Figma `1188:5990`) was deliberately SKIPPED
 * in an earlier pass of this file: its third card is literally titled "BUILT NOT BORN |
 * MasterClass — The De-Risking Playbook", and CLAUDE.md lists "BUILT NOT BURN" as explicit
 * Phase-2/out-of-MVP-scope ("do NOT build unless asked") — that section's working name in Figma.
 * The customer has since EXPLICITLY asked for this exact section by name (stage 1.13, "Давай
 * тепер зробимо блок The people you'll actually talk to ... ще нема"), which is the direct
 * request CLAUDE.md's "unless asked" carve-out requires — so it's now built like every other
 * section. This does NOT reopen the rest of Phase-2 "BUILT NOT BURN" (a standalone masterclass
 * product, payouts, etc.) — only the one static video-teaser row Figma groups under this section
 * name; see `MindsetisOriginalsSection`'s own doc comment for what that card actually renders.
 *
 * CROSS-SECTION GLOW (2026-08-31, corrected same day after a first pass got the crop and sizing
 * wrong) — the soft black→blue→white background glow that spans from the bottom of the hero,
 * through the "what is Mindsetis" video block, into the top of "Three ways to start" is a single
 * Figma layer (`bg`, `1189:6270` desktop / `1253:23550` mobile) drawn BEHIND all three of those
 * sections, not something owned by any one of them — reproducing it inside a single section (as
 * `WhatIsMindsetis` used to, with a hand-tuned `radial-gradient` oval) always clipped it at that
 * section's own edges, which is why the old approximation looked like a bounded blob with a
 * visible edge instead of the design's soft, wide band.
 *
 * The two blurred vector shapes that make up `bg` have no fill data exposed through the
 * read-only `figma-mcp-go` bridge (`get_node`/`get_nodes_info` return an empty `styles: {}` for
 * both — re-confirmed this session, same limitation already documented for other pages, e.g.
 * `HomepagePlaceholder`'s own glow). A rendered screenshot of the `bg` node was exported instead
 * (see `public/images/main-page/glow-{desktop,mobile}.png`) — the only way to reproduce an
 * irregular, non-radially-symmetric blurred shape faithfully. The PNGs are the FULL `bg` frame,
 * uncropped — a first pass cropped off the top on the assumption it only overlapped hidden hero
 * territory, which was wrong: `bg` starts at y:755 while the hero's own map graphic runs to
 * y:953, so the top ~200px of `bg` (with its visible wavy edge) is meant to show over the bottom
 * of the hero banner, not be discarded.
 *
 * Positioning reproduces the real Figma offsets instead of naively filling the wrapper:
 * - Desktop: `bg` top (755) sits 234px above `WhatIsMindsetis`'s content top (1085), and that
 *   content sits 96px below its own `<section>`'s top edge (`lg:py-24`) — so the layer's `top`,
 *   relative to this wrapper (which starts at that same `<section>` edge), is
 *   `755 - 1085 + 96 = -234px`, i.e. `-234/1440 = -16.25%` of the 1440-wide design. Height is
 *   locked to the source's own `1707/1440` aspect ratio (not stretched to the wrapper's height —
 *   a first pass used `background-size: 100% 100%` against the wrapper's own height, which
 *   distorted/flattened the wavy edges), so it naturally reaches the same absolute bottom
 *   (y:2462) the design has, landing in the upper portion of "Three ways to start" (y:2135–2601)
 *   and fading out well before its card row — not stretched all the way through it.
 * - MOBILE IS ANCHORED DIFFERENTLY — to the wrapper's HEIGHT (`top: -6.6%`, `height: 60.5%`),
 *   not to its width. Deriving the mobile layer from width (Figma's `804/375 = 2.144`) is only
 *   correct at exactly 375px: narrower viewports shrink the layer proportionally while the
 *   content underneath grows TALLER (headings wrap to more lines), so the two move in opposite
 *   directions and the glow stops short of the cards — measured 2.7px short at 375px content
 *   width but 58.7px short at 360px, which reads as "the gradient doesn't reach the cards at
 *   all" on a real phone. As a fraction of the wrapper's own height the target is almost flat
 *   across the range (58.55% @345, 58.42% @360, 59.12% @375, 60.54% @397 to land exactly on the
 *   card row), so `height: 60.5%` puts the fade ~8–25px INTO the cards at every mobile width —
 *   the slight overlap the design has (Figma `bg` ends y1446, cards start y1445). Desktop keeps
 *   the width-derived `cqw` form: it was signed off as-is, and above `md` the headings no longer
 *   rewrap, so the width and height references stay in step there.
 * - Mobile: same math, `bg` top 642, content top 799, `py-16` (64px) →
 *   `642 - 799 + 64 = -93px` → `-93/375 = -24.8%`; height locked to `804/375`.
 * - The layer is FULL-BLEED horizontally (`inset-x-0`, no `max-w`) — the Figma `bg` frame spans
 *   the whole page width, so capping it at 1440px left hard black bars either side on wider
 *   monitors, which reads as the glow being "cut off". Its VERTICAL geometry (`top`, `height`)
 *   is still computed from `min(100cqw, 1440px)`, the page's own content-column reference, so the
 *   glow keeps its Figma proportions and lands in the right place regardless of monitor width;
 *   above 1440px it simply stretches horizontally, which is invisible on a blur this soft.
 *   `top` must be a `calc()` off that width and not a bare `%`: a percentage `top` on an
 *   absolutely-positioned element resolves against the containing block's *height*, not width.
 * - The width reference is `100cqw` (container-query width of the `@container` wrapper), NOT
 *   `100vw`. `vw` INCLUDES the classic scrollbar gutter, so in any desktop browser with a
 *   persistent scrollbar the glow was sized off a width ~15px wider than the content actually
 *   gets — enough to push its bottom edge ~26px past where Figma ends it, right onto the "Three
 *   ways to start" cards. `cqw` measures the wrapper's real content width, so the layer lands
 *   identically whether the scrollbar takes space (desktop) or overlays (phones).
 * - The wrapper is `overflow-x-clip` (not `overflow-x-hidden`): per spec, `overflow-x: hidden`
 *   forces the paired `overflow-y` to compute to `auto`, which would clip the layer's negative
 *   `top` (i.e. cut off exactly the hero-overlapping wavy edge this fix restores). `overflow-x:
 *   clip` clips only that axis and leaves `y` genuinely `visible`, so the layer can bleed upward
 *   over `HeroBand` without widening the page horizontally.
 * - Sampled pixel luminance at the point in the image that lines up with the text block (desktop
 *   y≈130 of 498, mobile similarly) is bright enough to keep the black eyebrow/heading/subtitle
 *   in `WhatIsMindsetis` at roughly 5–10:1 contrast, comfortably past WCAG AA — re-verified after
 *   this positioning fix, not just the original crop.
 * - A `mask-image` fades ONLY the bottom ~8% to transparent (a soft guard against a hard seam
 *   where the layer ends inside "Three ways to start"'s card row); the top is intentionally left
 *   fully opaque from 0% — that's the wavy edge this fix exists to make visible, so nothing should
 *   fade it out.
 *
 * Scoped to `WhatIsMindsetis` + `ThreeWaysToStart` only (`HeroBand` itself is off-limits to edit,
 * so it can't own part of the layer — the negative `top` above is what lets the layer visually
 * reach over it instead).
 */
export function MainPageSection() {
  return (
    <>
      <HeroBand />
      <div className="@container relative overflow-x-clip">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -z-10 md:hidden"
          style={{
            top: '-6.6%',
            height: '60.5%',
            backgroundImage: 'url(/images/main-page/glow-mobile.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            maskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -z-10 hidden md:block"
          style={{
            top: 'calc(min(100cqw, 1440px) * -0.1625)',
            height: 'calc(min(100cqw, 1440px) * 1.1854)',
            backgroundImage: 'url(/images/main-page/glow-desktop.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            maskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 92%, transparent 100%)',
          }}
        />
        <WhatIsMindsetis />
        <ThreeWaysToStart />
      </div>
      <AiSearchPreview />
      <TopMindsettersSection />
      <MindsetisEventsSection />
      <MindsetisOriginalsSection />
      <AmbassadorsSection />
      <FaqSection />
    </>
  );
}
