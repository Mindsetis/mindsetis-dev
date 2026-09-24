import { getTranslations } from 'next-intl/server';

import { SparklingFillIcon } from '@/components/icons/main-page-icons';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { cn } from '@/lib/utils';

import { GRADIENT_HEADING_CLASSNAME } from './gradient-heading';
import { SectionEyebrow } from './SectionEyebrow';

/**
 * "What expertise is useful for you right now?" — Figma `1189:6233`/`1189:6240`/`1189:6245`
 * (AI-search eyebrow + heading, search box, "POPULAR SEARCHES" chips) desktop, `1262:24609`/
 * `1262:24580`/`1262:24585` mobile.
 *
 * Per CLAUDE.md ("Togglable modules… AI-search must be switchable from the admin settings
 * without a redeploy. Gate their entry points on an admin-controlled flag") — that admin flag
 * doesn't exist yet, and there's no AI-search backend for this input to call. Rendered as an
 * illustrative, non-functional preview of the feature (the `readOnly` input, a `NotYetAvailable`
 * submit button, and non-interactive chips) rather than half-wiring a form with nowhere to send
 * its data — the same "flag the tradeoff instead of guessing a backend" approach as everywhere
 * else this design assumes functionality the app doesn't have yet.
 *
 * STAGE 1.13 FIRST PASS (general audit, no raw dump available): eyebrow icon size, mobile
 * heading size, eyebrow/heading/subtitle gap split, subtitle `\n` breakpoint scoping, per-block
 * max-widths (888/860/831), heading-block→search-box and search-box→popular-row gaps,
 * popular-label→chips gap, search box staying one row on mobile, search-box radius (16/24),
 * search button `aria-disabled`, chip radius (12px, `rounded-lg`), chip/label font sizes
 * (12px/11px flat, not the `text-tiny` token) were all fixed then — see git history for the
 * original reasoning; superseded where this pass found different numbers.
 *
 * STAGE 1.13 SECOND PASS — full customer-supplied raw CSS dump for both breakpoints, node IDs
 * re-read directly against that dump rather than relying on `get_screenshot`/estimation. Fixes
 * from this pass:
 *
 * - SEARCH-BOX GLOW WAS A GENERIC `box-shadow` GUESS. Figma composes the box's actual visual
 *   from THREE separate effects, all now reproduced with their real numbers:
 *     1. An outer glow on the box itself: `box-shadow: 0px 4px 39.7px rgba(111, 186, 237, 0.5)`
 *        — identical at both breakpoints. The previous build had approximated this as
 *        `0_0_60px_16px_rgba(97,187,223,0.35)`, a different color, spread, and blur; now the
 *        exact value.
 *     2. `Ellipse 3` (`1189:6242` desktop / `1262:24582` mobile), a flat `#61bbdf` circle,
 *        `blur(90px)`, positioned at `x:-53,y:-134,w:341,h:160` desktop / `x:-48,y:-129,w:216,
 *        h:160` mobile (a real per-breakpoint size, not the same value scaled) — a genuinely
 *        different size at each breakpoint, re-read directly off both nodes via `get_node`
 *        (not assumed from the CSS dump's "position: absolute" text, which is ambiguous about
 *        its containing block). Only its bottom-left sliver falls inside the box's own clipped
 *        bounds (the ellipse's own top is 129–134px above the box, its height only 160px) — so
 *        what's actually visible is a soft cyan wash in the box's top-left corner, not the full
 *        circle. Added as an absolutely-positioned blurred `div`, clipped by the box's existing
 *        `overflow-hidden`, behind the input/button (`z-10` on both, unchanged).
 *     3. `Ellipse 2` (`1189:6241`/`1262:24581`) — NOT reproduced. Its own bounds relative to the
 *        box (`x:280.9,y:214.54,w:507.71,h:159.79`) put its entire top edge 214.54px below the
 *        box's origin, but the box itself is only 96px (desktop) / 72px (mobile) tall — so with
 *        the box's own `overflow-hidden` (Figma frames clip by default), 0px of this ellipse
 *        ever falls inside the visible box at EITHER breakpoint; it's a fully clipped, invisible
 *        layer in Figma's own render, not a rendering gap on this end. (Also has no `fills` in
 *        the API response — same "no effect data for the blurred layer" limitation already
 *        documented elsewhere — but that's moot here since geometry alone rules it out.) Same
 *        category of Figma-side dead layer as the topic-pill icon/label overlap documented
 *        further down this comment.
 *   `Ellipse 14`/`Ellipse 26` (`1189:6232`/`1262:24610`, the cross-section ambient glow behind
 *   the eyebrow+heading+subtitle block) reuses `AmbassadorsSection.tsx`'s own recipe verbatim —
 *   same fill (`rgba(43,184,229,0.3)`, `#2bb8e5`/30) and even the same 702×394/343×196 size, but
 *   its own offset from the content block's own top edge: 35px above desktop (`1189:6233` top
 *   2823 − `1189:6232` top 2788), 15px above mobile (`1262:24609` top 2097 − `1262:24610` top
 *   2082) — different from Ambassadors' own 101px/31px, confirmed by measuring THIS section's
 *   nodes directly rather than copying Ambassadors' offset. Same blur split as Ambassadors: 60px
 *   mobile / 150px desktop (a real per-breakpoint blur radius in the source file, re-confirmed
 *   on this section's own `Ellipse 26`/`Ellipse 14` nodes, not assumed from precedent).
 * - Subtitle width was unconstrained (free to grow to the 888px heading column). Figma's own
 *   subtitle node is a narrower, separately-sized 528px box at desktop (`1189:6239`) — mobile's
 *   equivalent (`1262:24608`) is the full 343px column, i.e. no additional cap needed there,
 *   so a single unconditional `max-w-[528px]` is correct at both breakpoints (528 already
 *   exceeds the 375px mobile viewport, so it never binds there).
 * - Subtitle AND input line-height were the shared `text-body` token's 24px (`1rem × 1.5` per
 *   `app/styles/tokens/typography.css`). Figma's own "body (PC)" style is 16px/**22px**, 2px
 *   tighter — the exact same "`text-body` resolves 2px taller than Figma" gap already documented
 *   sitewide (`HeroBand.tsx`'s own doc comment) and already worked around elsewhere in this file
 *   tree via `text-body leading-[22px]` (`FaqAccordion.tsx`, `ThreeWaysToStart.tsx`,
 *   `WhatIsMindsetis.tsx`, `AmbassadorsRegionCarousel.tsx`) — applied here for the same reason,
 *   on both the subtitle `<p>` and the search `<input>` (Figma's own placeholder text is the
 *   same "body (PC)" style).
 * - Chips' `gap-2` (8px) between whole pills (`Frame 582`'s own gap) is correct and unchanged.
 *   SUPERSEDED by the THIRD PASS below: this pass's `gap-1` (4px) INSIDE each pill, for a
 *   `check-circle` icon↔label gap, no longer applies — that icon turns out to be switched off
 *   in Figma itself (`display: none`), not merely visually overlapping the label as first read
 *   here; see the THIRD PASS note for the corrected, icon-free chip.
 * - Search button still used `aria-disabled` + `pointer-events-none` (STAGE 1.13 FIRST PASS's
 *   own reasoning: Figma's button instance shows the same live gradient+glow as an enabled
 *   button, so a plain `disabled` looked wrong). The customer has since overridden that call for
 *   the whole page: `NotYetAvailable` controls should read as visibly unavailable, not merely
 *   click-blocked — already applied to `MindsetisEventsSection`'s "All videos"/"All events" and
 *   `MindsetisOriginalsSection`'s "watch"/"all videos" buttons. This button now matches: plain
 *   `disabled` inside `NotYetAvailable`, which (per `Button`'s `primary`/default variant) swaps the
 *   gradient to `--color-primary-disabled` and drops the glow shadow — a deliberately dimmed
 *   look, the same tradeoff already made everywhere else on this page.
 *
 * Everything else re-verified this pass and found UNCHANGED from the first pass (re-measured
 * against the dump, not just re-asserted):
 * - Eyebrow icon 12px mobile / 16px desktop, eyebrow↔heading 24px mobile / 32px desktop,
 *   heading↔subtitle 16px both — despite Figma grouping these two gaps under DIFFERENT parent
 *   frames per breakpoint (mobile groups eyebrow+heading as one 24px-gapped unit, separately
 *   16px from the subtitle; desktop groups heading+subtitle as one 16px-gapped unit, separately
 *   32px from the eyebrow), the existing two-level `gap-6 md:gap-8` (outer, eyebrow→group) +
 *   `gap-4` (inner, heading→subtitle) DOM structure renders the correct number at both
 *   breakpoints regardless — confirmed by walking each breakpoint's own frame tree independently
 *   rather than assuming the two breakpoints share one grouping.
 * - Heading 72px/90% desktop (`text-h2` resolves to exactly this), 40px/90% mobile (flat
 *   `text-[40px] leading-[0.9]`, no shared token at this size) — no `\n` in the raw `characters`
 *   at either breakpoint (`1189:6238`/`1262:24571`, both "What expertise is useful for you right
 *   now?" as one line).
 * - Subtitle `\n` handling: desktop node (`1189:6239`) `characters` carries a real `\n` after
 *   "…what you need "; mobile node (`1262:24608`) is byte-identical text WITHOUT it — re-read
 *   directly this pass, confirms `whitespace-normal md:whitespace-pre-line` is still right.
 * - Block max-widths 888/860/831, heading-block→search-box gap 30px desktop/24px mobile,
 *   search-box→popular-row gap 20px desktop/24px mobile, popular-label→chips gap 20px desktop/
 *   16px mobile, search box staying one row (never stacks) with radius 16px mobile/24px desktop,
 *   chip radius 12px (`rounded-lg`), chip label 12px/16px + popular-label 11px/13px (flat, not
 *   `text-tiny`) — every one of these re-measured against the raw dump's own numbers this pass
 *   and landed on the exact same values the first pass already used.
 * - No hover/focus/active states exist anywhere in this section's Figma file — every control
 *   here (input, button, chips) has exactly one visual state per breakpoint.
 *
 * STAGE 1.13 THIRD PASS — customer re-flagged the search box border, the chip look, both
 * controls' exact sizing, and the mobile popular-searches block after a live-browser
 * measurement pass. Re-read every node directly (`get_node`, not the flat CSS dump, which
 * mis-scopes at least one measurement — see the chip note below) plus pixel-sampled a 4×/6×
 * zoomed export of `Frame 229` itself, since Figma's "gradient/complex stroke → flat CSS"
 * export gap (already hit once on `HeroBand.tsx`'s "ONLY" pill) turns out to repeat here too.
 *
 * - CHIP ICON: the SECOND pass's "broken auto-layout, icon hidden behind text" read was wrong.
 *   Re-checked the raw dump's own `check-circle` block for the "topic" instance (both
 *   breakpoints): `display: none;` — the icon slot is a real, deliberate Figma instance
 *   override, not a layout bug. The pill is text-only: 12px padding on all four sides (12+16
 *   line-height+12 = the pill's own 40px height, exactly, with no icon in the sum), no icon, no
 *   internal 4px gap (nothing to gap against). `CheckCircleFillIcon` removed from every chip;
 *   the pill is now `h-10 items-center rounded-lg border border-border bg-card px-3` around the
 *   label alone. (The 4px `gap` from the dump was the icon↔label gap for the ENABLED-icon
 *   variant of this same component elsewhere in the file, not applicable once the icon is off.)
 * - SEARCH BOX BORDER: `get_node` on `1189:6240`/`1262:24580` (`Frame 229`) still reports no
 *   `strokes` — same "Figma has a paint the flat API/CSS export can't surface" situation as the
 *   HeroBand pill. But the box's own flat CSS DOES carry `box-sizing: border-box` (a real Figma
 *   tell for "this shape has a stroke", same signal that outed the HeroBand pill's border) and
 *   a save_screenshots pixel-sample (4× desktop / 6× mobile, `.tmp-shots/search-box-*.png`,
 *   deleted after use) confirms it visually: scanning across the top/bottom/left/right edges
 *   shows a genuine, fully-opaque (`alpha 255`) light-cyan ring hugging the box's own rounded
 *   rect on all four sides — brighter mid-edge, dimmer near the corners — sitting BETWEEN the
 *   semi-transparent outer glow (the existing, confirmed-correct `box-shadow`, alpha ~40–50%)
 *   and the opaque black fill. A plain `rgba(...,0.5)` drop shadow's own blur falloff cannot by
 *   itself reach full opacity that close to the shape (verified against the shadow's own
 *   39.7px blur / 0.5 base alpha — the math doesn't clear 60% opacity at this distance, let
 *   alone 100%), so this is a real second paint, not shadow bleed. Sampled colors cluster
 *   around `#4dbee6`–`#b2e0ef` (a light cyan-to-near-white family, close kin to `--color-
 *   primary-hover` `#9ad2ee`, already used for this exact box's placeholder text) rather than
 *   one flat value — approximated as a crisp 1px hairline plus a soft inner bloom (two extra
 *   `inset` shadow layers, appended to the existing outer `box-shadow` in the same arbitrary
 *   `shadow-[…]` value; the previously-confirmed outer glow itself is untouched):
 *   `inset 0 0 0 1px rgba(158,210,238,0.55)` (hairline) + `inset 0 0 18px 0px
 *   rgba(97,187,223,0.4)` (bloom, `#61bbdf` — the same flat color as this box's own `Ellipse 3`
 *   glow, at a plausible flat approximation for the corner-to-corner brightness taper actually
 *   sampled). Exact per-pixel gradient shape not reproduced (would need a conic/radial gradient
 *   border no Tailwind utility expresses cleanly); this reads as the same soft glowing rim at a
 *   glance, which is what the customer is pointing at.
 * - BOX HEIGHT: customer's live measurement caught the box rendering 104px tall on desktop
 *   (96px in Figma). Root cause: the box used a uniform `p-6` (24px) padding with the 56px-tall
 *   `Button` centered inside via `items-center` — 56 + 24 + 24 = 104, so the button's own
 *   height (taller than the 96px frame minus 2×24 padding) was forcing the box to grow past its
 *   Figma size. Figma's own box is NOT auto-layout at all — every child (`Primary` button,
 *   placeholder text) carries its own fixed `x`/`y`, with the button inset 20px from the
 *   top/bottom/right (20+56+20 = 96, exact) and the text inset 33px from the left, vertically
 *   centered (37px top/bottom, symmetric) — desktop. Mobile mirrors this at its own scale: 8px
 *   top/bottom/right around the (still 120×56) button, 24px left for the text. Reproduced with
 *   an explicit FIXED box height (`h-[72px] md:h-24` — 72/96px, matching Figma exactly, not
 *   content-driven) and asymmetric horizontal padding standing in for those insets (`pl-6 pr-2
 *   md:pl-[33px] md:pr-5`); `items-center` on the fixed-height box now centers the 56px button
 *   with the correct 20px/8px margin without growing the box, matching Figma at both
 *   breakpoints (confirmed against the live 104px→96px customer report).
 * - BUTTON WIDTH: Figma's `Primary` instance (`1189:6243`/`1262:24583`) is a fixed 120×56 at
 *   BOTH breakpoints (not just desktop) — height, radius (12px), and horizontal padding (20px)
 *   already match `Button`'s own `size="default"` exactly (confirmed on `HeroBand.tsx`'s own
 *   audit of the same size), but width is content-hug by default and "Search" alone doesn't
 *   reach 120px. Explicit `w-[120px]` added at this call site only (`button.tsx` untouched).
 *   Filled (`primary`) variant, not outline — this is the section's own PRIMARY action inside
 *   the field, unlike `MindsetisEventsSection`'s/`MindsetisOriginalsSection`'s secondary "All
 *   videos"/"All events" buttons; matching those buttons' shape was never the ask, only
 *   matching this button's own Figma node, which is filled.
 * - "POPULAR SEARCHES" label: added `whitespace-nowrap` — Figma's own text node is a fixed
 *   161×13px single line at both breakpoints; nothing in the design ever wraps it.
 * - MOBILE POPULAR-SEARCHES BLOCK: re-read `1262:24585` (`Frame 583`) directly rather than
 *   trusting the flat dump, which turns out to mis-scope this block (its "Frame 726" listing
 *   only sums to the eyebrow+heading+subtitle group, not this row — the raw dump's apparent
 *   "106px gap" between the heading block and the search box was a mis-read of that scoping
 *   bug; direct node math against `1262:24609` confirms the real gap is 24px, unchanged from
 *   what the file already had). What the direct read actually changes: the label
 *   (`textAlignHorizontal: LEFT`, `x:0`) and every chip in the wrapped grid (`x:0`/`x:147`, all
 *   flush left) sit LEFT-aligned within the 343px column, not centered — the block was using
 *   `items-center`/`justify-center` (a `sm:`-breakpoint switch, 640px, which doesn't match this
 *   design's real 375/1440 breakpoints either). Now `items-start` on mobile (`md:items-center`
 *   for the desktop single-row layout) and the chip wrapper drops its `justify-center` (Figma
 *   doesn't specify one; the row already fills its own column when centered, and now sits
 *   flush left, matching the design). The `sm:` breakpoint switches became `md:`, matching the
 *   rest of this file/page's own 375/1440 convention. Desktop chips are explicitly `md:flex-
 *   nowrap` — Figma's own desktop row is a single, non-wrapping line (`831px` container exactly
 *   fits the 4 real chips' `650px` combined width); mobile keeps `flex-wrap` (mandatory there —
 *   343px available width is well under the same 650px).
 *
 * STAGE 1.13 FOURTH PASS — the customer supplied Figma's own inspector panel for `Frame 229`
 * at both breakpoints (screenshots), which settles the border by evidence instead of pixel
 * reconstruction, plus three smaller asks.
 *
 * - SEARCH BOX BORDER, SUPERSEDES THE THIRD PASS. The third pass was right that a real stroke
 *   exists and wrong about what it is: it approximated the ring as two flat `inset` shadows
 *   after pixel-sampling a zoomed export, because `get_node` reports no `strokes` here (the
 *   same MCP gap that hid `HeroBand.tsx`'s "ONLY" pill border). Figma's panel shows the actual
 *   paint — a LINEAR GRADIENT stroke, `position: Inside`, `weight: 4` desktop / `2` mobile,
 *   over the box's own `black` fill at radius 24/16 (both already correct here), with four
 *   stops: `#47B9E5 0%`, `#B7E2EF 35%`, `#42ABD3 66%`, `#B1E9FF 100%` — identical stops at both
 *   breakpoints. Only the axis differs, and only because the two boxes have different aspect
 *   ratios: the gradient handles run corner-to-corner, which on the 860×96 desktop box works
 *   out to ~96.1deg and on the 343×72 mobile box to ~101.8deg (measured off the handle
 *   positions in the supplied canvas screenshots — Figma's panel doesn't print the angle, and
 *   the API won't return this paint at all). Both flat `inset` shadow layers are removed; the
 *   outer `0px 4px 39.7px rgba(111,186,237,0.5)` drop shadow (independently confirmed, and
 *   visible as "Drop shadow" in the same panel) is untouched.
 * - POPULAR-SEARCHES BLOCK gets `z-[2]` — customer request; see the inline comment at that
 *   block for why it needs a stacking order of its own.
 * - CHIP horizontal padding 12px → 11px (customer measurement). Vertical size is unchanged: the
 *   pill's 40px height comes from `h-10`, not from padding, so this is `px` only.
 * - MOBILE PLACEHOLDER is its own shorter string ("Describe your request...", `1262:24580`'s
 *   own text node) rather than desktop's "…in one sentence…" — see the inline comment at the
 *   two `<input>`s for why that needs two elements.
 */
export async function AiSearchPreview() {
  const t = await getTranslations('home.main.aiSearch');
  const popularSearches = t.raw('popularSearches') as string[];

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 md:py-20 lg:px-[70px] lg:py-24">
      <div className="relative mx-auto flex max-w-[888px] flex-col items-center">
        {/* Decorative glow only — excluded from layout/hit-testing and screen readers. See doc
            comment above for the measured offset/size/blur per breakpoint. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-15px] left-1/2 h-[196px] w-[343px] -translate-x-1/2 rounded-full bg-[#2bb8e5]/30 blur-[60px] md:top-[-35px] md:h-[394px] md:w-[702px] md:blur-[150px]"
        />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center md:gap-8">
          <SectionEyebrow
            icon={<SparklingFillIcon className="size-3 md:size-4" />}
            label={t('eyebrow')}
          />
          <div className="flex w-full flex-col items-center gap-4">
            <h2
              className={cn(
                // `pb-1 md:pb-2 -mb-1 md:-mb-2`: reclaims room below the line box for
                // descenders ("y"/"g"/"p") that `leading-[0.9]` otherwise crops against
                // `bg-clip-text` — see `gradient-heading.ts`'s own doc comment for the full
                // rationale (applies sitewide, not baked into the shared constant since not
                // every heading uses it). The matching negative margin cancels the padding back
                // out of flow so the measured gap to the next element is unchanged.
                'font-display text-[40px] leading-[0.9] font-normal md:text-h2 pb-1 md:pb-2 -mb-1 md:-mb-2',
                GRADIENT_HEADING_CLASSNAME,
              )}
            >
              {t('title')}
            </h2>
            <p className="mx-auto max-w-[528px] whitespace-normal text-body leading-[22px] text-foreground md:whitespace-pre-line">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-6 flex h-[72px] max-w-[860px] flex-row items-center justify-between overflow-hidden rounded-2xl bg-black pr-2 pl-6 shadow-[0px_4px_39.7px_rgba(111,186,237,0.5)] md:mt-[30px] md:h-24 md:rounded-3xl md:pr-5 md:pl-[33px]">
        {/* `Ellipse 3` — see doc comment above for why `Ellipse 2` isn't reproduced. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[129px] -left-[48px] h-[160px] w-[216px] rounded-full bg-[#61bbdf] blur-[90px] md:-top-[134px] md:-left-[53px] md:w-[341px]"
        />
        {/* Gradient stroke — see the FOURTH PASS note in the doc comment above for the source
            values. Drawn as its own layer rather than a `border`/`box-shadow` because neither
            can carry a gradient: the double-background `padding-box`/`border-box` trick can't be
            used either (this box's fill is `bg-black` over a glow that must show THROUGH the
            fill's own rounded rect), so this is the mask-exclusion technique already used by
            `gradient-border` in `app/styles/base.css` — a full-cover layer painted with the
            gradient, then masked down to just its own padding ring. Sits after the glow and
            before the `z-10` controls in DOM order, so it paints over the glow and under them. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] p-[2px] [--ai-search-ring:linear-gradient(101.8deg,#47b9e5_0%,#b7e2ef_35%,#42abd3_66%,#b1e9ff_100%)] md:p-[4px] md:[--ai-search-ring:linear-gradient(96.1deg,#47b9e5_0%,#b7e2ef_35%,#42abd3_66%,#b1e9ff_100%)]"
          style={{
            background: 'var(--ai-search-ring)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
          }}
        />
        {/* Two inputs, not one: Figma's mobile field carries a SHORTER placeholder than
            desktop's, and `::placeholder` text can't be swapped by a media query (it's content,
            not style). Whichever is out of breakpoint is `display: none`, so it leaves the
            accessibility tree entirely — no duplicate announcement. */}
        <input
          type="text"
          readOnly
          placeholder={t('placeholderMobile')}
          aria-label={t('placeholderMobile')}
          className="relative z-10 min-w-0 flex-1 bg-transparent text-body leading-[22px] text-primary-hover placeholder:text-primary-hover focus:outline-none md:hidden"
        />
        <input
          type="text"
          readOnly
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="relative z-10 hidden min-w-0 flex-1 bg-transparent text-body leading-[22px] text-primary-hover placeholder:text-primary-hover focus:outline-none md:block"
        />
        <NotYetAvailable feature="aiSearch">
          <Button size="default" disabled className="relative z-10 w-[120px] shrink-0">
            {t('searchCta')}
          </Button>
        </NotYetAvailable>
      </div>

      {/* `relative z-[2]` on the whole popular-searches block: it sits below the search box,
          whose own glow layers spill outside their parent's bounds — without a stacking order of
          its own this block would be painted under that spill. */}
      <div className="relative z-[2] mx-auto mt-6 flex max-w-[831px] flex-col items-start gap-4 md:mt-5 md:flex-row md:items-center md:gap-5">
        <span className="text-[11px] leading-[13px] font-bold whitespace-nowrap tracking-[0.3em] text-muted-foreground uppercase">
          {t('popularLabel')}
        </span>
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          {popularSearches.map((search, index) => (
            <span
              key={`${search}-${index}`}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-[11px] text-[12px] leading-4 text-foreground"
            >
              {search}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
