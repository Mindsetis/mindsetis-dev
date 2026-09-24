import type { SVGProps } from 'react';

/**
 * `CabinetHeader`'s "Edit" link icon (`components/dashboard/CabinetHeader.tsx`) — provided verbatim
 * by the designer (2026-08-10). Source markup hardcodes `fill="#79B9E3"` per path; converted here
 * to `fill="currentColor"` on the `<svg>` instead — same precedent as `BallPenFillIcon`/
 * `ProfilePageIcon` in this folder — since the call site already sets `text-primary` (that exact
 * hex) on the surrounding `<Link>`, so the icon just follows it rather than carrying a second,
 * independent color declaration that happens to match today by coincidence.
 *
 * Kept at its native size (14×14) — it doesn't match this project's `size-*` scale exactly at
 * every step, and the designer's own export dimensions are the ones asked for, so callers don't
 * pass a sizing className for it.
 *
 * This file used to export a second icon, `ViewProfileIcon` (17×17, external-link glyph), for the
 * card's "View public profile" TEXT link. Release-1 C4 (2026-09-20) turned that link into a filled
 * `primary` `Button` with no icon, leaving the export unused — removed rather than kept "in case",
 * since the designer's original SVG lives in Figma and git history either way.
 */
export function EditPencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M10.412 7.2831L9.99956 6.87062L4.51777 12.3524C4.33023 12.54 4.07588 12.6453 3.81066 12.6453H2.75C2.19771 12.6453 1.75 12.1976 1.75 11.6453V10.5846C1.75 10.3194 1.85536 10.0651 2.04289 9.87753L6.93545 4.98498C7.71649 4.20393 8.98282 4.20393 9.76387 4.98498L11.6495 6.87062C11.8773 7.09841 11.8773 7.46778 11.6495 7.69557L7.93719 11.4079C7.70938 11.6357 7.34004 11.6357 7.11224 11.4078C6.88443 11.18 6.88443 10.8107 7.11224 10.5829L10.412 7.2831ZM10.8245 1.92085L12.4745 3.57077C12.7023 3.79857 12.7023 4.16792 12.4745 4.39573L12.3566 4.51358C11.9661 4.9041 11.3329 4.9041 10.9424 4.51358L9.88172 3.45291C9.4912 3.06239 9.49119 2.42922 9.88171 2.0387L9.99956 1.92085C10.2274 1.69305 10.5967 1.69305 10.8245 1.92085Z" />
    </svg>
  );
}
