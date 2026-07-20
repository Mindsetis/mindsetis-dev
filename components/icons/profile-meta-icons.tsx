import type { SVGProps } from 'react';

/**
 * Location/language marker icons for the Member Profile meta row (Figma: desktop
 * `401:6406`/`401:6410` — nodes "map-pin-2-fill" / "chat-1-fill" — and the identical mobile
 * "Verified Member Profile" nodes `401:8248`/`401:8252`). Pulled 1:1 from Figma's vector export
 * rather than reused from `lucide-react`'s `MapPin`/`MessageCircle`: those are outline icons,
 * while Figma's marks are solid/filled shapes with a different silhouette (no circular ring on
 * the pin, a filled speech-bubble tail rather than a rounded outline bubble) — not a 1:1 match.
 *
 * Kept in a separate file from `social-icons.tsx` since these aren't brand/social marks — just
 * this screen's own meta-row glyphs. Both use a native `viewBox="0 0 14 14"` (Figma's own
 * export grid for these two vectors) rather than the `0 0 24 24` used by `social-icons.tsx`'s
 * brand marks — converting the path data to a 24-unit grid would only introduce rounding drift
 * for no visual benefit, since SVGs scale to whatever box they're rendered in regardless of
 * viewBox units.
 *
 * `ChatAiFillIcon` / `QuillPenAiFillIcon` below follow the exact same precedent — one eyebrow
 * icon each for the "ABOUT" card and the "BEYOND BUSINESS" heading, confirmed as two genuinely
 * DIFFERENT glyphs (not the same icon reused): the desktop "ABOUT" card (node `401:6494`
 * "Frame 464") has a `chat-ai-fill` instance (`401:6496`, sparkle-tailed chat bubble) next to
 * its eyebrow, while every "Beyond Business" eyebrow (desktop `421:4240`/`421:4272`, mobile
 * `421:4122`) instead has a `quill-pen-ai-fill` instance (sparkle-tipped pen). Both mobile
 * equivalents (`401:8274`→`401:8276` for ABOUT; `421:4122` for Beyond Business) confirm the same
 * pairing at the smaller 12x12 export grid, just scaled — so both icons here are exported once
 * at the canonical desktop 14x14 grid, same as `LocationPinIcon`/`LanguageBubbleIcon` above.
 *
 * `BallPenFillIcon` follows the same precedent for the Edit Profile button (banner, preview
 * variant): Figma's "ball-pen-fill" instance (desktop node `I401:6358;383:4499`, mobile
 * `I401:8413;127:1354`) is a solid/filled pen glyph with an angled nib and separate ink-flick
 * mark — a genuinely different silhouette from `lucide-react`'s outline `Pen`, same class of
 * mismatch as the icons above. Path-diffed the two Figma instances directly (exported both as
 * SVG): the mobile vector is the exact desktop path scaled by 0.875 (14px chip icon / 16px
 * desktop icon) with no shape differences, so — unlike `LocationPinIcon`/`LanguageBubbleIcon`
 * above, which are natively 14x14 — this one is exported once at the canonical desktop 16x16
 * grid (matching the shared `size-4` icon utility already used on this button) and reused at
 * both sizes via CSS, not a second per-breakpoint export.
 *
 * `UserAddFillIcon` is the same story again for the hero "Invite to event" button (desktop-only,
 * node `401:6401` preview / `383:4693` public — both instances are pixel-identical, confirmed via
 * a direct node-diff). `lucide-react`'s outline `UserPlus` (a dashed-outline person with a
 * separate "+" above the shoulder) doesn't match this instance's actual "user-add-fill" vector —
 * a solid silhouette with the "+" badge beside the head, not above it. Exported straight from
 * that node (`I401:6401;327:2540`) at Figma's own 16x16 grid, same as `BallPenFillIcon`.
 */

export function LocationPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10.7123 10.129L7.35355 13.4877C7.15829 13.683 6.84171 13.683 6.64645 13.4877L3.28769 10.129C1.23744 8.07869 1.23744 4.7546 3.28769 2.70435C5.33794 0.654093 8.66203 0.654093 10.7123 2.70435C12.7626 4.7546 12.7626 8.07869 10.7123 10.129ZM7 7.58332C7.64435 7.58332 8.16667 7.06101 8.16667 6.41666C8.16667 5.77232 7.64435 5.24999 7 5.24999C6.35565 5.24999 5.83333 5.77232 5.83333 6.41666C5.83333 7.06101 6.35565 7.58332 7 7.58332Z" />
    </svg>
  );
}

export function LanguageBubbleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.83317 1.75H8.1665C10.7438 1.75 12.8332 3.83934 12.8332 6.41667C12.8332 8.99401 10.7438 11.0833 8.1665 11.0833V13.125C5.24984 11.9583 1.1665 10.2083 1.1665 6.41667C1.1665 3.83934 3.25584 1.75 5.83317 1.75Z" />
    </svg>
  );
}

export function ChatAiFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.0827 4.74138L11.9388 5.07136C11.8336 5.31293 11.4994 5.31293 11.3941 5.07136L11.2504 4.74138C10.994 4.153 10.5322 3.68455 9.95599 3.42828L9.51284 3.23119C9.27326 3.12462 9.27326 2.77595 9.51284 2.66938L9.9312 2.48331C10.5222 2.22044 10.9923 1.73466 11.2442 1.1263L11.3919 0.769706C11.4949 0.521182 11.8381 0.521182 11.941 0.769706L12.0887 1.1263C12.3407 1.73466 12.8108 2.22044 13.4018 2.48331L13.8201 2.66938C14.0597 2.77595 14.0597 3.12462 13.8201 3.23119L13.377 3.42828C12.8008 3.68455 12.339 4.153 12.0827 4.74138ZM11.6665 6.41665C12.074 6.41665 12.4653 6.347 12.829 6.21896C12.8318 6.28452 12.8332 6.35044 12.8332 6.41665C12.8332 8.99399 10.7438 11.0833 8.1665 11.0833V13.125C5.24984 11.9583 1.1665 10.2083 1.1665 6.41665C1.1665 3.83932 3.25584 1.74998 5.83317 1.74998H8.1665C8.23271 1.74998 8.29863 1.75136 8.36419 1.75409C8.23615 2.11784 8.1665 2.50911 8.1665 2.91665C8.1665 4.84964 9.73351 6.41665 11.6665 6.41665Z" />
    </svg>
  );
}

export function QuillPenAiFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M2.74948 4.15806L2.60564 4.48804C2.50038 4.72962 2.16625 4.72962 2.06099 4.48804L1.91716 4.15806C1.66078 3.56969 1.19901 3.10124 0.622807 2.84496L0.179694 2.64788C-0.059898 2.54131 -0.059898 2.19264 0.179694 2.08607L0.598033 1.9C1.18905 1.63713 1.6591 1.15134 1.91107 0.542983L2.05877 0.186395C2.1617 -0.0621316 2.50493 -0.0621316 2.60787 0.186395L2.75556 0.542983C3.00753 1.15134 3.47759 1.63713 4.06863 1.9L4.48693 2.08607C4.72658 2.19264 4.72658 2.54131 4.48693 2.64788L4.04383 2.84496C3.46763 3.10124 3.00585 3.56969 2.74948 4.15806ZM1.78711 12.6077C2.38498 8.99617 3.68145 1.16467 12.25 1.16467C11.3774 2.91467 10.7917 3.78967 10.2083 4.373L9.625 4.95634L10.5 5.53967C9.91667 7.28968 8.16667 9.33135 5.83333 9.62302C4.27668 9.81756 3.30412 10.887 2.91564 12.8313H1.75C1.7621 12.7588 1.77444 12.6842 1.78711 12.6077Z" />
    </svg>
  );
}

export function BallPenFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M11.8995 8.32354L11.4281 7.85214L5.12132 14.1589C4.93378 14.3464 4.67943 14.4518 4.41421 14.4518H3C2.44771 14.4518 2 14.0041 2 13.4518V12.0376C2 11.7723 2.10536 11.518 2.29289 11.3304L9.54247 4.08088L13.3137 7.85214C13.5741 8.11247 13.5741 8.53461 13.3137 8.79494L9.07107 13.0375C8.81072 13.2979 8.38862 13.2979 8.12827 13.0375C7.86792 12.7772 7.86792 12.3551 8.12827 12.0947L11.8995 8.32354ZM12.3709 2.19526L14.2565 4.08088C14.5169 4.34123 14.5169 4.76334 14.2565 5.02369L14.0208 5.25939C13.6303 5.64991 12.9972 5.64991 12.6066 5.25939L11.1924 3.84517C10.8019 3.45465 10.8018 2.82148 11.1924 2.43095L11.4281 2.19526C11.6885 1.93491 12.1105 1.93491 12.3709 2.19526Z" />
    </svg>
  );
}

export function UserAddFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8.57099 9.36354C9.02472 9.41184 9.33317 9.82026 9.33317 10.2766V13.6667C9.33317 14.2189 8.88546 14.6667 8.33317 14.6667H3.6665C3.11422 14.6667 2.65671 14.2148 2.75908 13.6721C3.225 11.2019 5.39421 9.33332 7.99984 9.33332C8.19278 9.33332 8.38334 9.34357 8.57099 9.36354ZM7.99984 8.66666C5.78984 8.66666 3.99984 6.87666 3.99984 4.66666C3.99984 2.45666 5.78984 0.666656 7.99984 0.666656C10.2098 0.666656 11.9998 2.45666 11.9998 4.66666C11.9998 6.87666 10.2098 8.66666 7.99984 8.66666ZM11.9998 11.3333V9.99999C11.9998 9.6318 12.2983 9.33332 12.6665 9.33332C13.0347 9.33332 13.3332 9.6318 13.3332 9.99999V11.3333H14.6665C15.0347 11.3333 15.3332 11.6318 15.3332 12C15.3332 12.3682 15.0347 12.6667 14.6665 12.6667H13.3332V14C13.3332 14.3682 13.0347 14.6667 12.6665 14.6667C12.2983 14.6667 11.9998 14.3682 11.9998 14V12.6667H10.6665C10.2983 12.6667 9.99984 12.3682 9.99984 12C9.99984 11.6318 10.2983 11.3333 10.6665 11.3333H11.9998Z" />
    </svg>
  );
}
