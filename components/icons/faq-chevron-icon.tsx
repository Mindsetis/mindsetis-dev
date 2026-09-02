import type { SVGProps } from 'react';

/**
 * FAQ accordion chevron (`FaqSection`) — provided verbatim by the client as a right-pointing
 * arrow, hardcoded brand-blue `#79B9E3` fill + 0.5px stroke of the same color. Confirmed against
 * Figma's own instances: `_icon / chevron.right` (collapsed cards, e.g. `1235:6495`) and
 * `_icon / chevron.down` (the one expanded card, `1235:6487`) both use `#79b9e3` for fill AND
 * stroke — the color never changes between open/closed, so this is not `currentColor` (same
 * precedent as `SparklingFillIcon` in `main-page-icons.tsx`).
 *
 * Orientation: rendered at its native, un-rotated shape here — which points RIGHT (the client's
 * explicit spec: "стрілка вправо" when collapsed). The caller applies a 90° rotation on the open
 * state so it points DOWN ("коли питання розкрите — стрілка вниз"), e.g.
 * `group-open:rotate-90`. Figma's own `chevron.right` instances reach the same visual result the
 * other way around (rotating their shared `chevron.down`-shaped vector by -90°) — geometrically
 * equivalent, just a different reference orientation; this component uses the client-supplied SVG
 * as-is for the 0° (closed) state per the literal brief.
 */
export function FaqChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9.2412 8.08225L5.5842 4.42525C5.51111 4.3587 5.45212 4.27815 5.41072 4.18839C5.36931 4.09863 5.34634 4.00147 5.34316 3.90267C5.33997 3.80387 5.35664 3.70543 5.39218 3.61319C5.42772 3.52095 5.4814 3.43677 5.55005 3.36565C5.6187 3.29452 5.70092 3.23789 5.79185 3.19911C5.88277 3.16033 5.98056 3.14018 6.07941 3.13987C6.17826 3.13955 6.27617 3.15907 6.36734 3.19727C6.45851 3.23547 6.5411 3.29157 6.6102 3.36225L6.6282 3.38025L10.8082 7.55925C10.9468 7.69784 11.0246 7.88578 11.0246 8.08175C11.0246 8.27772 10.9468 8.46567 10.8082 8.60425L6.6292 12.7833C6.56177 12.8531 6.48125 12.9089 6.39224 12.9476C6.30322 12.9862 6.20747 13.007 6.11043 13.0087C6.01339 13.0104 5.91698 12.9929 5.82669 12.9573C5.73639 12.9217 5.654 12.8687 5.5842 12.8013C5.5144 12.7338 5.45857 12.6533 5.41989 12.5643C5.38121 12.4753 5.36045 12.3795 5.35877 12.2825C5.3571 12.1854 5.37456 12.089 5.41015 11.9987C5.44574 11.9084 5.49877 11.8261 5.5662 11.7563L5.5842 11.7383L9.2412 8.08225Z"
        fill="#79B9E3"
        stroke="#79B9E3"
        strokeWidth={0.5}
      />
    </svg>
  );
}
