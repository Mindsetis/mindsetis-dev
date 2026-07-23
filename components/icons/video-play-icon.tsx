import type { SVGProps } from 'react';

/**
 * "Click for watching" overlay play triangle (Figma `552:4669`, node name "triangle", inside the
 * video-blog interview section's `Frame 38` overlay). Provided verbatim by the designer — brand
 * light-blue fill (`#79B9E3`), no stroke, no circular badge behind it in the design.
 */
export function VideoPlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="30"
      height="36"
      viewBox="0 0 30 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.51149 35.1237L28.6274 19.2386C28.7948 19.0621 28.9622 18.8856 29.1296 18.7091C29.6318 17.8266 29.4644 16.7676 28.6274 16.2381L2.51149 0.353001C2.34408 0 2.00926 0 1.67444 0C0.669983 0 0.000345234 0.706002 0.000345234 1.76501L0.000345234 33.5352C0.000345234 33.8882 0.000341415 34.0647 0.167751 34.4177C0.669979 35.3002 1.67444 35.4767 2.51149 35.1237Z"
        fill="#79B9E3"
      />
    </svg>
  );
}
