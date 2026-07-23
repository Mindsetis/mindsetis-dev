import type { SVGProps } from 'react';

export interface WinCardGlowProps {
  /** Unique per-card-instance suffix for this component's internal SVG `<filter>`/
   * `<linearGradient>` ids — SVG ids must be unique per document, and up to 10 of these render
   * simultaneously in the My WINS carousel, so a shared literal id (as Figma's raw "Copy as SVG"
   * export uses) would make every card after the first silently reference the first card's
   * filter/gradient definition instead of its own. */
  idSuffix: string | number;
  /** Bottom-right blurred ellipse's 2-stop linear gradient (stop 1 → stop 2). */
  bottomRightGradient: [string, string];
  /** Top-left blurred ellipse's flat fill. */
  topLeftColor: string;
}

/**
 * The two blurred decorative corner glows every "My WINS" card has in Figma (`552:5078`
 * "Frame 274") — a large gradient ellipse bleeding off the bottom-right corner, and a smaller
 * flat-color ellipse bleeding off the top-left corner. Geometry/blur/rotation are identical
 * across every win color per Figma (re-verified this session); only the fill colors differ,
 * hence this takes them as props rather than being 7 hardcoded variants.
 *
 * Stacking (2026-07-22, updated): the bottom-right ellipse stays `z-0` (behind the card's text,
 * same reasoning as before — it sits behind the year/title/description with no legibility
 * issue). The top-left ellipse is deliberately `z-20` — ABOVE the year/trophy text (`z-10`, see
 * `MindsetterProfileView.tsx`) — per an explicit design call: the top-left glow is meant to wash
 * over the year digits rather than sit fully behind them. This is intentionally the opposite of
 * this component's very first stacking fix (which put every glow behind the text to stop an
 * unwanted tinting artifact on short, pre-`min-h-[250px]` cards) — confirmed directly rather than
 * silently reverted.
 */
export function WinCardGlow({ idSuffix, bottomRightGradient, topLeftColor }: WinCardGlowProps) {
  const filterBR = `win-glow-br-filter-${idSuffix}`;
  const gradientBR = `win-glow-br-gradient-${idSuffix}`;
  const filterTL = `win-glow-tl-filter-${idSuffix}`;

  return (
    <>
      <svg
        width="548"
        height="250"
        viewBox="0 0 548 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -bottom-16 -right-16 z-0"
        aria-hidden="true"
      >
        <g filter={`url(#${filterBR})`}>
          <ellipse
            cx="451.256"
            cy="255.33"
            rx="253.853"
            ry="79.8958"
            transform="rotate(-8.65364 451.256 255.33)"
            fill={`url(#${gradientBR})`}
          />
        </g>
        <defs>
          <filter
            id={filterBR}
            x="0"
            y="-32.4258"
            width="902.513"
            height="575.513"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="100" result={`effect1_foregroundBlur_${idSuffix}`} />
          </filter>
          <linearGradient
            id={gradientBR}
            x1="197.403"
            y1="255.33"
            x2="577.144"
            y2="255.33"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={bottomRightGradient[0]} />
            <stop offset="1" stopColor={bottomRightGradient[1]} />
          </linearGradient>
        </defs>
      </svg>
      <svg
        width="468"
        height="206"
        viewBox="0 0 468 206"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -left-16 -top-16 z-20"
        aria-hidden="true"
      >
        <g filter={`url(#${filterTL})`}>
          <ellipse cx="117.5" cy="-54" rx="170.5" ry="80" fill={topLeftColor} />
        </g>
        <defs>
          <filter
            id={filterTL}
            x="-233"
            y="-314"
            width="701"
            height="520"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="90" result={`effect1_foregroundBlur_tl_${idSuffix}`} />
          </filter>
        </defs>
      </svg>
    </>
  );
}

/**
 * Small trophy glyph placed before a win card's year (Figma export, provided verbatim by the
 * designer alongside the two glow ellipses above). `fill` defaults to the historical trophy
 * yellow but is prop-driven (spread after the default, same override precedent as
 * `AddCircleFillIcon` in `mindsetter-eyebrow-icons.tsx`) so each win card can pass its own
 * `WIN_TROPHY_HEX` shade.
 */
export function WinTrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="#F2C601"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M13.5896 1.19352C13.3096 0.89602 12.9124 0.724507 12.5029 0.724507H11.1991C11.2044 0.49 11.2079 0.248521 11.2079 0H2.79915C2.79915 0.248486 2.80263 0.49 2.8079 0.724507H1.4954C1.08589 0.724507 0.688653 0.89602 0.408653 1.19352C0.125133 1.4928 -0.0218398 1.90227 0.00263281 2.31704C0.23714 6.22655 2.2549 8.68003 5.45388 9.04405L4.83438 11.2C4.09763 11.2 3.50089 11.7968 3.50089 12.5335V14H10.5079V12.5335C10.5079 11.7968 9.91115 11.2 9.17441 11.2L8.5549 9.04405C11.7469 8.67655 13.7629 6.2248 13.9957 2.31704C14.0201 1.90405 13.8732 1.49454 13.5896 1.19352ZM1.40089 2.23303C1.39915 2.19454 1.4149 2.16829 1.42888 2.15428C1.45513 2.12628 1.48665 2.12628 1.4954 2.12628H2.87441C3.08267 4.87905 3.6899 6.44003 4.27967 7.32204C2.03441 6.38053 1.49888 3.86579 1.40089 2.23303ZM9.7274 7.31678C10.3171 6.43303 10.9227 4.87378 11.1309 2.12454H12.5046C12.5151 2.12454 12.5449 2.12454 12.5712 2.15253C12.5852 2.16655 12.6009 2.1928 12.5991 2.23128C12.4994 3.86405 11.9657 6.37178 9.7274 7.31678Z" />
    </svg>
  );
}
