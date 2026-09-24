import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';

import { JoinIcon } from '@/components/icons/join-icon';
import { QuestionFillIcon } from '@/components/icons/main-page-icons';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { Link } from '@/i18n/navigation';
import { resolveCtaState } from '@/lib/auth/cta-state';
import {
  getHeroMapPulseStyle,
  HERO_MAP_AVATARS,
  HERO_MAP_MOBILE_AVATARS,
} from '@/lib/marketing/hero-map-avatars';
import { cn } from '@/lib/utils';

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
 * is exported as flattened images rather than rebuilt node-by-node — standard practice for a
 * complex illustration asset, not an approximation of the design itself (pixel-identical to the
 * Figma source, alpha background so it sits on the page's own black background without a seam).
 * The soft blue glow visible UNDER the map on the full page screenshot is NOT part of this asset
 * or this section — it's `WhatIsMindsetis`'s own background glow (Figma `bg` frame `1189:6270`,
 * already reproduced in that component, see its own doc comment) bleeding upward from the next
 * section; nothing to add here.
 *
 * MAP AS LAYERS (Release-1 H1, added 2026-09-20)
 *   Originally one flattened `public/images/main-page-avatar-map.png` (dots + all 25 avatars +
 *   glow baked in, 1.36MB). Re-exported from Figma as a dot-only base
 *   (`public/images/hero-map/base.webp`, no avatars) plus 25 individual avatar files
 *   (`avatar-01.webp` … `avatar-25.webp`, each with its OWN baked-in glow halo already applied —
 *   only the animated pulse in `motion.css` is layered on top of that at runtime), composited
 *   here as absolutely-positioned layers sized/placed from `lib/marketing/hero-map-avatars.ts`.
 *   Reasons: (1) unblocks the H2 pulse demo below, which needs individually-addressable avatar
 *   elements; (2) WebP beats the old flattened PNG on total weight (~691KB for the full 26-file
 *   set vs. 1.36MB) despite being 26 requests instead of one — plain `<img>`, no `next/image` or
 *   `<picture>` fallback, per this file's existing precedent and because WebP is universally
 *   supported in current browsers.
 *
 *   Sizing: `left`/`top` in the data are the CENTER of each avatar as a % of the map's own
 *   width/height (matching Figma's node position, converted from px), applied via inline
 *   `style` + `translate(-50%, -50%)` on a wrapper `<span>` (percentage `left`/`top` need a
 *   sized/positioned ancestor to resolve against — the map wrapper div below, not the page).
 *   `width` is the EXPORTED FILE's width (photo + halo), not the visible photo diameter: Figma's
 *   halo blur radius is a fixed px value that doesn't shrink with the avatar, so sizing off the
 *   photo alone would make small avatars' halos disproportionately thick. The sizing/shift
 *   classes that used to sit directly on the `<img>` (mobile `w-[258%] -translate-x-[37%]`,
 *   desktop `md:w-full md:max-w-[1440px]`) now sit on this same map wrapper div instead — the
 *   base image and every avatar are percentage-positioned inside it, so the whole layered
 *   composition scales/shifts together exactly as the single flattened image used to.
 *
 *   `alt` stays a single string describing the whole map (`avatarMapAlt`), placed on the base
 *   layer only; all 25 avatar `<img>`s are `alt=""` + `aria-hidden` — they're decorative
 *   repetitions of content the base layer's alt text already covers, so a screen reader isn't
 *   forced to hear 25 empty images.
 *
 *   `public/images/main-page-avatar-map.png` is intentionally NOT deleted yet — kept until this
 *   is accepted, in case of a revert.
 *
 * MOBILE AVATAR SET (Release-1 H4, added 2026-09-20)
 *   The 25-avatar layer above is desktop/tablet content: at 375-ish mobile widths Figma
 *   (`1490:21781` "map-base 2") hand-places a DIFFERENT set of 9 avatars
 *   (`HERO_MAP_MOBILE_AVATARS`), each its own export (`avatar-m-01.webp` … `avatar-m-09.webp`,
 *   own baked-in halo, not a resize of the desktop file for the same person). Two structural
 *   differences from the desktop layer, both explained in full in
 *   `hero-map-avatars.ts`'s doc comment on `HERO_MAP_MOBILE_AVATARS`:
 *
 *   1. COORDINATE SPACE. Desktop avatars are positioned as % of the MAP element, because on
 *      desktop they travel with it. Mobile avatars are positioned as % of the 375×314 VISIBLE
 *      FRAME instead — Figma places them against what's on screen, not against the map, which on
 *      mobile is scaled to 258%/-37% and mostly clipped by the outer `overflow-hidden`. Reusing
 *      the desktop convention (% of the map element) for these 9 would drag them along with that
 *      258%/-37% transform and land them off their Figma spot. So they render in a SEPARATE
 *      overlay `<div>`, a sibling of the map element rather than a child of it, sized with
 *      `aspect-[375/314]` at the outer (untransformed, viewport-width) wrapper's own width — that
 *      reproduces the 375×314 frame's proportions at whatever the real mobile width is, so the
 *      recorded percentages resolve correctly even when the viewport isn't exactly 375px.
 *   2. WHICH SET LOADS. Only one of the two 9-vs-25 sets should ever hit the network for a given
 *      visitor — nobody needs a client-side width check for this (this is a server component;
 *      `useEffect`/`matchMedia` would mean either an added `"use client"` boundary or content that
 *      flashes in after hydration). Both sets stay in server-rendered markup, gated purely by
 *      CSS + a native browser behavior: `hidden` (display:none) on the layer's own wrapper for
 *      the breakpoint it's NOT needed at, and `loading="lazy"` on every avatar `<img>` in both
 *      sets. A `display:none` element and everything inside it generates no render-tree box, and
 *      an image with no box is never "near the viewport" by the lazy-loading algorithm's own
 *      geometry check — so it's deferred indefinitely rather than fetched and then hidden. This
 *      was chosen over `<picture>`/`<source media>` because that element swaps sources for ONE
 *      image; it has no way to express "render these 9 *different* elements instead of those 25
 *      *different* elements". `loading="lazy"` is also applied to both sets uniformly (not just
 *      the hidden one) rather than only the excluded set, so the same mechanism handles a resize
 *      across the breakpoint gracefully — the previously-hidden set starts fetching normally the
 *      moment its wrapper becomes visible, instead of never loading at all.
 *
 *   Both sets share the SAME pulse system as the desktop-only version below (`getHeroMapPulseStyle`,
 *   `hero-map-avatar-pulse-scale` / `hero-map-avatar-glow`) — `HERO_MAP_PULSE_AVATAR_IDS` in
 *   `hero-map-avatars.ts` includes all 34 ids now, mobile and desktop alike, and
 *   `prefers-reduced-motion: reduce` disables it the same way for both (see `motion.css`).
 *
 * HERO MAP AVATAR PULSE (Release-1 H2 demo → H3 full rollout, 2026-09-20)
 *   H2 shipped a 3-avatar demo for the client to sanity-check that a soft pulse reads as
 *   intentional rather than broken. H3 takes it to all 25 avatars, per the client's explicit
 *   ask for a chaotic, grouped effect rather than a uniform wave or an all-at-once flash — the
 *   grouping/jitter model and its rationale live in `lib/marketing/hero-map-avatars.ts`
 *   (`HERO_MAP_PULSE_GROUPS` doc comment); `getHeroMapPulseStyle` turns an avatar id into
 *   `--pulse-delay`/`--pulse-duration` CSS custom properties, set once on the wrapper `<span>`
 *   below and read by both the avatar `<img>`'s scale animation and its glow sibling's opacity
 *   animation (`hero-map-avatar-pulse-scale` / `hero-map-avatar-glow` in `motion.css` — see
 *   that file's doc comment for why the glow is a separate opacity-only layer rather than an
 *   animated `filter: drop-shadow` on the photo itself: repaint cost across 25 avatars vs. a
 *   compositor-only opacity fade). No client component needed: it's pure CSS `@keyframes`
 *   driven by inline custom properties, and `prefers-reduced-motion: reduce` is handled inside
 *   those same utilities (falls back to the avatar's static baked-in halo).
 *
 * "How it works" has no prototype destination in Figma (`get_reactions` returned empty) — routed
 * to an in-page anchor at the "What you actually get here" section below (`#how-it-works`),
 * which is the natural "here's how it works" landing spot on this page.
 *
 * PRIMARY BUTTON STATE (Release-1 A4, added 2026-09-17)
 *   The primary CTA (was a bare `Link href="/join"`) now depends on the visitor's account state,
 *   resolved once by `lib/auth/cta-state.ts` and mapped to (label, action) HERE — the hero's own
 *   mapping differs from the header/`WhatIsMindsetis`'s: both signed-in Member states collapse to
 *   the same "Explore Community" popup here (only the header distinguishes "Edit Profile" vs.
 *   "Upgrade", since those are real navigations there), and a signed-in Mindsetter gets
 *   "Create Event", also a popup. No `NotYetAvailable` icon variant carries the button's own icon
 *   — `JoinIcon` stays `guest`-only per the task brief; the two popup states render with no icon,
 *   matching every other `NotYetAvailable`-wrapped CTA in this file's precedent
 *   (`TopMindsettersSection`, `WelcomeCtas`).
 */
export async function HeroBand() {
  const t = await getTranslations('home.main.hero');
  const tNav = await getTranslations('nav');
  const ctaState = await resolveCtaState();

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
          {ctaState === 'guest' ? (
            <Button asChild size="default" className="w-full md:w-auto">
              <Link href="/join">
                <JoinIcon />
                {tNav('join')}
              </Link>
            </Button>
          ) : null}

          {ctaState === 'memberIncomplete' || ctaState === 'memberComplete' ? (
            <NotYetAvailable feature="exploreCommunity" className="w-full md:w-auto">
              <Button type="button" disabled size="default" className="w-full md:w-auto">
                {tNav('exploreCommunity')}
              </Button>
            </NotYetAvailable>
          ) : null}

          {ctaState === 'mindsetter' ? (
            <NotYetAvailable feature="createEvent" className="w-full md:w-auto">
              <Button type="button" disabled size="default" className="w-full md:w-auto">
                {tNav('createEvent')}
              </Button>
            </NotYetAvailable>
          ) : null}

          <Button asChild variant="primaryOutline" size="default" className="w-full md:w-auto">
            <a href="#how-it-works">
              <QuestionFillIcon className="size-4" />
              {t('howItWorksCta')}
            </a>
          </Button>
        </div>
      </div>

      <div className="relative z-0 mt-8 w-full overflow-hidden">
        <div className="relative h-auto w-[258%] max-w-none -translate-x-[37%] md:mx-auto md:w-full md:max-w-[1440px] md:translate-x-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, plain <img> matches the rest of the codebase's precedent for non-optimized local marketing art */}
          <img src="/images/hero-map/base.webp" alt={t('avatarMapAlt')} className="h-auto w-full" />

          {/* Desktop avatar layer (25, `HERO_MAP_AVATARS`) — `hidden` below `md`, `contents` (no
              box of its own) at `md`+ so its children keep positioning against THIS map element
              exactly as before this wrapper existed. `display: none` removes the whole subtree
              from the render tree, and each `<img>` below carries `loading="lazy"`: a hidden,
              boxless image is never "near the viewport", so browsers defer its fetch indefinitely
              — mobile visitors never download these 25 files. See the mobile overlay `<div>`
              below for the converse (desktop-exclusion) case and the file-level "MOBILE AVATAR
              SET" doc comment above for why this beats `<picture>`/a client-side width check. */}
          <div className="hidden md:contents">
            {HERO_MAP_AVATARS.map((avatar) => {
              const pulseStyle = getHeroMapPulseStyle(avatar.id);

              return (
                <span
                  key={avatar.id}
                  className="absolute"
                  // Cast: `--pulse-delay`/`--pulse-duration` are legal inline-style custom
                  // properties but aren't part of React's typed `CSSProperties` surface — same
                  // escape hatch as `ScrollToTopButton`'s `--cookie-banner-offset`.
                  style={
                    {
                      left: `${avatar.left}%`,
                      top: `${avatar.top}%`,
                      width: `${avatar.width}%`,
                      transform: 'translate(-50%, -50%)',
                      ...pulseStyle,
                    } as CSSProperties
                  }
                >
                  {/* Decorative glow layer, BEFORE the photo in the DOM on purpose: an
                      absolutely-positioned sibling paints above a `position: static` element
                      regardless of DOM order, so the `<img>` below needs (and gets) its own
                      `relative` to end up on top of this. */}
                  {pulseStyle ? <span aria-hidden="true" className="hero-map-avatar-glow" /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, see base layer above */}
                  <img
                    src={`/images/hero-map/${avatar.id}.webp`}
                    alt=""
                    aria-hidden="true"
                    // Decorative pins: `lazy` doubles as the mobile-exclusion mechanism (see the
                    // wrapper comment above); `async` decoding keeps them off the main thread so
                    // they don't compete with the base layer, this section's largest paint.
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      'relative block h-auto w-full',
                      pulseStyle && 'hero-map-avatar-pulse-scale',
                    )}
                  />
                </span>
              );
            })}
          </div>
        </div>

        {/* Mobile avatar layer (9, `HERO_MAP_MOBILE_AVATARS`) — a SEPARATE overlay, not nested
            inside the map element above. Figma positions these 9 against the 375×314 visible
            frame, not against the map image (which is scaled to 258% and shifted -37% on
            mobile, see the div above) — see `hero-map-avatars.ts`'s doc comment on
            `HERO_MAP_MOBILE_AVATARS` for the full coordinate-system explanation. `aspect-[375/314]`
            reproduces that frame's own proportions at the wrapper's actual rendered width (the
            untransformed outer wrapper, i.e. the viewport itself below `md`), so the recorded
            percentages stay correct at any real mobile width, not just exactly 375px. Hidden at
            `md`+ (desktop uses the layer above instead); each `<img>` also carries
            `loading="lazy"` for the same defer-while-boxless reason as the desktop layer, so
            desktop visitors never download these 9 files. */}
        <div className="absolute inset-x-0 top-0 aspect-[375/314] md:hidden">
          {HERO_MAP_MOBILE_AVATARS.map((avatar) => {
            const pulseStyle = getHeroMapPulseStyle(avatar.id);

            return (
              <span
                key={avatar.id}
                className="absolute"
                style={
                  {
                    left: `${avatar.left}%`,
                    top: `${avatar.top}%`,
                    width: `${avatar.width}%`,
                    transform: 'translate(-50%, -50%)',
                    ...pulseStyle,
                  } as CSSProperties
                }
              >
                {pulseStyle ? <span aria-hidden="true" className="hero-map-avatar-glow" /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element -- local static asset, see base layer above */}
                <img
                  src={`/images/hero-map/${avatar.id}.webp`}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    'relative block h-auto w-full',
                    pulseStyle && 'hero-map-avatar-pulse-scale',
                  )}
                />
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
