/**
 * Shared className for the "gradient / light" Cal Sans headings used across most Main Page
 * sections. Confirmed per-node via `fillStyle: "gradient / light"` on the *rendered* (non-hidden,
 * non-duplicate) desktop instance of each: "Three ways to start" (`572:5526`), "Networking
 * formats we offer" (`572:5560`), "The people you'll actually talk to" (`552:5684`), "FAQ"
 * (`1229:6172`), "What expertise is useful for you right now?" (`1189:6238`), "Mindsetis
 * Ambassadors" (`1235:17759`) — all six literally carry the identical Figma paint style, so one
 * shared className is correct.
 *
 * The style itself resolves (via `get_styles`) to a two-stop linear gradient white → `#87BCE6`,
 * which Figma's own "copy as CSS" renders as `linear-gradient(95.47deg, #FFFFFF 5.56%, #87BCE6
 * 99.5%)` for this heading's box — the exact stop percentages shift slightly per node (they're a
 * function of that node's own bounding-box aspect ratio, not the paint itself), but the angle and
 * colors are constant. This matches the near-identical values already hardcoded sitewide for the
 * same Figma style — see `components/marketing/HeroSection.tsx`, `components/marketing/main-page/
 * HeroBand.tsx`'s H1, and `components/marketing/WaitlistFormCard.tsx`.
 *
 * IMPORTANT: this is NOT the same value as the global `--gradient-primary` token
 * (`app/styles/tokens/effects.css` — `linear-gradient(91.51deg, #C3E4F9 0%, #79B9E3 51.73%,
 * #21B8E6 100%)`). That token is the *button* gradient (three stops, different angle, different
 * colors, used correctly by primary buttons across the site) and does not match this text style
 * — a previous version of this file conflated the two. Do not swap this back to
 * `--gradient-primary` for headings; keep the two gradients using their own values.
 *
 * DESCENDER-CROP FIX (STAGE 1.13, seventh customer pass): every Main Page H2/H1 uses
 * `leading-[0.9]` (or `text-h1`/`text-h2`'s own baked-in 0.9 line-height) to match Figma's
 * tight heading line-height — but a 0.9 line box is SHORTER than the font's own em box, so
 * descenders on "y"/"g"/"p" hang below the line box. Combined with `bg-clip-text` (the
 * gradient headings), that overhang gets visibly cropped; even the one flat-color heading
 * (`WhatIsMindsetis.tsx`, no `bg-clip-text`) can crop the same way if a strict-height ancestor
 * clips it. Fixed with `pb-1 md:pb-2` (4px mobile / 8px desktop — enough headroom for the
 * tightest descenders at these font sizes) PLUS a matching negative margin (`-mb-1 md:-mb-2`)
 * on every affected heading, so the extra box height is available for the glyph to paint into
 * but doesn't push the next element down — the negative margin cancels it back out of flow,
 * preserving every section's already-measured heading→next-element gap.
 *
 * NOT baked into this shared `GRADIENT_HEADING_CLASSNAME` constant: `WhatIsMindsetis.tsx`'s H2
 * (flat black, no gradient) and `HeroBand.tsx`'s H1 (a bespoke inline gradient, different stops
 * from this one) both need the exact same fix but don't use this constant at all — baking the
 * padding in here would silently miss both of them. Applied individually at each of the nine
 * heading call sites instead (the six headings that DO use this constant, plus those two),
 * each with its own short comment pointing back here.
 */
export const GRADIENT_HEADING_CLASSNAME =
  'bg-[linear-gradient(95.47deg,#FFFFFF_5.56%,#87BCE6_99.5%)] bg-clip-text text-transparent';
