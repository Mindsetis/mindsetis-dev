import { getTranslations } from 'next-intl/server';

import { JoinIcon } from '@/components/icons/join-icon';
import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Main Page hero band — Figma "Main Page" (`572:5427` desktop, confirmed via the file's own
 * organizational "Main Page" section, `552:3983`, which groups this frame with its mobile
 * counterpart `1249:18262`; an older, unfinished duplicate frame of the same name lives
 * disconnected from that section elsewhere on the canvas and was not used here).
 *
 * Re-audited a SECOND time (2026-08-31, same day) against a Figma "Copy as CSS" dump the user
 * pasted for `Frame 536` (the badge+H1+buttons block) plus fresh direct node reads/pixel
 * sampling for the pieces the dump didn't cover (the pill's stroke, the map). Corrects several
 * values guessed in the first pass:
 *
 * - "ONLY" pill (`Frame 230`, `572:5502` desktop / `1253:20223` mobile): the dump gives a real
 *   FILL — `linear-gradient(90deg, #1A1A1A 32.43%, #005A8E 100%)` — not the transparent
 *   background the first pass used. A `box-sizing: border-box` in the dump (which Figma only
 *   emits when a stroke is present, but can't express a GRADIENT stroke in flat CSS and just
 *   drops it) was confirmed as a real border by an 8x zoomed screenshot pixel-sampled at the
 *   node's own flat top/bottom edges (avoiding the rounded caps): a genuine ~2px ring, itself a
 *   left-to-right gradient (~`#18344A` → `#11A4FA`, distinct from this app's `--gradient-primary-
 *   border` token, which starts far lighter) sitting on top of the fill. The same zoomed shot on
 *   a magenta background showed a perfectly crisp edge with zero soft bleed — confirming the
 *   dump's implicit "no effects" (the first pass's added `shadow-glow-primary-outline` is
 *   removed). Border reuses the existing `gradient-border` masking utility (mechanism only, not
 *   its Button-specific gradient) with a locally-scoped gradient value instead.
 * - H1 gradient: the dump gives `linear-gradient(96.57deg, #FFFFFF 3.66%, #87BCE6 75.39%)` for
 *   this exact node — replaces the first pass's borrowed `linear-gradient(95.47deg,#fff_4.71%,
 *   #87bce6_99.92%)` (copied from a different component's hero H1 elsewhere in the codebase,
 *   which turns out to have a different stop position/angle than THIS H1's own style).
 * - Map sizing (desktop): re-measured `map-base 1` directly — `838:11152` is exactly `1440×468`,
 *   and the exported PNG is a clean 2× of that (`2880×936`, identical ratio), so at a 1440px
 *   viewport this already renders pixel-exact to the design — the flat size was never wrong.
 *   Kept the fluid `w-full max-w-[1440px]`: it never grows past the native Figma size, and below
 *   1440px it scales the WHOLE map down instead of cropping it. A fixed `1440px` box was tried
 *   and reverted — a block wider than its containing block resolves `mx-auto` to zero margins,
 *   so it pinned left and silently cut Asia off the right edge at 1024–1439px, a bigger
 *   departure from the design than scaling. (The node's own bbox is inset 25px from the frame's
 *   left edge and overflows 25px past the right — most likely just the organic dot-map
 *   silhouette's bounding box, not a deliberate offset; not reproduced.)
 * - Map sizing (mobile): re-confirmed the first pass's math directly off `1253:20267`'s bbox
 *   (`x:-359, width:966.15` inside the 375px mobile frame) — `width: 966.15/375 ≈ 258%`,
 *   `offset: 359/966.15 ≈ 37.16%` — unchanged, `w-[258%] -translate-x-[37%]`. Confirmed this
 *   sits inside an `overflow-hidden` wrapper (and the section's own `overflow-hidden`), so it
 *   cannot itself be a source of page-level horizontal scroll — a `transform`-shifted,
 *   percentage-widened child is still clipped by an `overflow-hidden` ancestor.
 * - Badge text ↔ "ONLY" pill gap (desktop row): the dump's own box positions (text ends at
 *   `265.25+475=740.25`, pill starts at `753.75`) give exactly `13.5px`, not the `gap-4`
 *   (16px) token rounding the first pass used — set as an explicit `md:gap-[13.5px]`.
 * - Line-heights: the dump gives real px values neither global type-scale token currently
 *   encodes for THESE specific text instances — added as local `leading-[…]` overrides only
 *   (global tokens in `typography.css`, used elsewhere, are untouched):
 *   - Desktop badge text, "L - 32px (PC)" style: dump says 42px; `--text-l--line-height`
 *     resolves to `32×1.15=36.8px`. Overridden with `md:leading-[42px]`.
 *   - Mobile badge text + "ONLY" pill text, "MOB/button text" style (16px/22px): dump says
 *     22px; `--text-body--line-height` resolves to `16×1.5=24px` — 2px taller than Figma,
 *     which visibly grew the pill from Figma's 30px to 32px (padding `4+22+4=30` vs.
 *     `4+24+4=32`). Overridden with `leading-[22px]` (mobile default), explicitly reset to
 *     `md:leading-[1.3]` on the pill (the desktop "M (PC)" style is `AUTO`/unset in Figma, so
 *     this just re-states `--text-m--line-height`'s own value there rather than leaving the
 *     22px override's specificity to chance across breakpoints).
 * - Buttons: re-checked against the dump's `padding: 15px 20px`, `gap: 12px`, `height: 56px`,
 *   icon 16×16 — `Button`'s own `size="default"` (`h-14 px-5`) and unconditional base `gap-3`
 *   (12px) already match exactly, as do `JoinIcon`'s hardcoded 16×16 viewBox and
 *   `QuestionFillIcon`'s `size-4` (16px) className from the first pass. `Button` itself was not
 *   touched (shared component, out of scope for this file).
 *
 * Everything else from the first pass (H1 size token, pill order reversal on mobile, button
 * icon visibility, button `size`, `1120px` content column, vertical rhythm, map-crop rationale)
 * is unchanged — see below for what's still in effect.
 *
 * - Desktop H1 size was `text-h2` (72px) — Figma's own "H1 (PC)" text style is 88px
 *   (`--text-h1`, unmodified above the 768px breakpoint). Simplified to plain `text-h1`: the
 *   token already carries the correct mobile line-height (1, "MOB/H1" style) and desktop
 *   line-height (0.9, "H1 (PC)" style) via its own media-query override in `typography.css`,
 *   so no responsive size/leading overrides are needed at all here.
 * - Both badge-row texts ("Business owners, founders & CEOs" and "ONLY") switch typography
 *   PER BREAKPOINT in Figma, not just size: mobile is Manrope Bold 16px ("MOB/button text"
 *   style), desktop is Cal Sans Regular (32px / 22px respectively, "L (PC)" / "M (PC)"
 *   styles).
 * - Mobile badge-row ORDER is reversed vs. desktop: the "ONLY" pill sits ABOVE the "Business
 *   owners…" text on the `1249:18262` mobile frame (stacked, pill first), whereas desktop has
 *   them side-by-side text-then-pill. Achieved with `flex-col-reverse md:flex-row` rather than
 *   reordering the JSX, so the DOM/reading order stays "label, tag" at every size.
 * - Button icons (`JoinIcon` / `QuestionFillIcon`) are visible at every breakpoint — the
 *   `1249:18262` mobile frame's own "Primary"/"Secondary - 2a" instances both show their icon
 *   at 375px too; nothing in Figma hides them on mobile.
 * - Content column width: the badge row + H1 sit in a `1120px`-wide box in Figma
 *   (`572:5498`/`1120` wide inside a `1440`-wide desktop frame — deliberately narrower than
 *   this page's shared `lg:px-[70px]` section padding, a per-section design choice, not a
 *   mistake to "fix" by widening it).
 * - Vertical rhythm re-measured directly off the Figma node tree (root-frame-relative):
 *   header-bottom → badge row: 60px desktop / 32px mobile; badge row → H1: 16px both; H1 →
 *   buttons: 32px desktop / 24px mobile; buttons → map: ~30px desktop / 32px mobile (rounded
 *   to one `mt-8`).
 *
 * Badge pill padding (16/4px mobile, 24/8px desktop) and the buttons' row gap (16px, both
 * orientations) were already correct and are unchanged.
 *
 * The world map + avatar-pin illustration (Figma "map-base 1", `838:11152`, ~3,300 vector nodes)
 * is exported as a single flattened image (`public/images/main-page-avatar-map.png`) rather than
 * rebuilt node-by-node — standard practice for a complex illustration asset, not an
 * approximation of the design itself (pixel-identical to the Figma source, alpha background so
 * it sits on the page's own black background without a seam). The soft blue glow visible UNDER
 * the map on the full page screenshot is NOT part of this asset or this section — it's
 * `WhatIsMindsetis`'s own background glow (Figma `bg` frame `1189:6270`, already reproduced in
 * that component, see its own doc comment) bleeding upward from the next section; nothing to
 * add here.
 *
 * "How it works" has no prototype destination in Figma (`get_reactions` returned empty) — routed
 * to an in-page anchor at the "What you actually get here" section below (`#how-it-works`),
 * which is the natural "here's how it works" landing spot on this page.
 */
export async function HeroBand() {
  const t = await getTranslations('home.main.hero');
  const tNav = await getTranslations('nav');

  return (
    <section className="relative overflow-hidden">
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-4 pt-8 text-center sm:px-6 md:gap-8 md:pt-12 lg:px-[70px] lg:pt-[60px]">
        <div className="flex w-full max-w-[1120px] flex-col items-center gap-4">
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row md:gap-[13.5px]">
            <span className="text-body leading-[22px] font-sans font-bold text-foreground md:text-l md:leading-[42px] md:font-display md:font-normal">
              {t('badge')}
            </span>
            <span className="gradient-border inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#1A1A1A_32.43%,#005A8E_100%)] px-4 py-1 text-body leading-[22px] font-sans font-bold text-foreground [--btn-border-gradient-normal:linear-gradient(90deg,#18344A_0%,#11A4FA_100%)] md:px-6 md:py-2 md:text-m md:leading-[1.3] md:font-display md:font-normal">
              {t('badgeTag')}
            </span>
          </div>

          {/* `pb-1 md:pb-2 -mb-1 md:-mb-2`: `text-h1`'s own tight line-height (1 mobile / 0.9
              desktop, `typography.css`) crops descenders ("y") against `bg-clip-text` otherwise
              — see `gradient-heading.ts`'s doc comment for the full sitewide rationale. The
              negative margin cancels the padding back out of flow so the gap to the buttons row
              below is unchanged. */}
          <h1 className="w-full bg-[linear-gradient(96.57deg,#FFFFFF_3.66%,#87BCE6_75.39%)] bg-clip-text pb-1 font-display text-h1 font-normal whitespace-pre-line text-transparent -mb-1 md:pb-2 md:-mb-2">
            {t('title')}
          </h1>
        </div>

        <div className="flex w-full max-w-md flex-col gap-4 md:w-auto md:flex-row">
          <Button asChild size="default" className="w-full md:w-auto">
            <Link href="/join">
              <JoinIcon />
              {tNav('join')}
            </Link>
          </Button>
          <Button asChild variant="primaryOutline" size="default" className="w-full md:w-auto">
            <a href="#how-it-works">
              <QuestionFillIcon className="size-4" />
              {t('howItWorksCta')}
            </a>
          </Button>
        </div>
      </div>

      <div className="relative z-0 mt-8 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, plain <img> matches the rest of the codebase's precedent for non-optimized local marketing art */}
        <img
          src="/images/main-page-avatar-map.png"
          alt={t('avatarMapAlt')}
          className="h-auto w-[258%] max-w-none -translate-x-[37%] md:mx-auto md:w-full md:max-w-[1440px] md:translate-x-0"
        />
      </div>
    </section>
  );
}
