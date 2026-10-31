import type { SVGProps } from 'react';

/**
 * "briefcase-fill" — the glyph inside the INDUSTRY pill (`IndustryPill`) on the Member profile
 * (Figma `1642:23100`, exported straight from the design as SVG; native `viewBox="0 0 14 14"`) and
 * on the Mindsetter profile (`1750:33844` — the same path).
 *
 * The source hardcodes `fill="#79B9E3"`; that hex IS `--color-primary`, so this renders
 * `currentColor` and the call site sets `text-primary` instead of stating the value twice (same
 * convention as the sibling `profile-meta-icons.tsx` glyphs).
 */
export function BriefcaseFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.08366 2.91666V1.16666C4.08366 0.844498 4.34483 0.583328 4.66699 0.583328H9.33366C9.65583 0.583328 9.91699 0.844498 9.91699 1.16666V2.91666H12.2503C12.5725 2.91666 12.8337 3.17783 12.8337 3.5V11.6667C12.8337 11.9888 12.5725 12.25 12.2503 12.25H1.75033C1.42816 12.25 1.16699 11.9888 1.16699 11.6667V3.5C1.16699 3.17783 1.42816 2.91666 1.75033 2.91666H4.08366ZM2.33366 8.75V11.0833H11.667V8.75H2.33366ZM6.41699 6.41666V7.58333H7.58366V6.41666H6.41699ZM5.25033 1.74999V2.91666H8.75033V1.74999H5.25033Z" />
    </svg>
  );
}
