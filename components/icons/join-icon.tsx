import type { SVGProps } from 'react';

/**
 * "Join"/"Apply to Join" CTA icon (16×16) — provided verbatim by the designer, replacing
 * `lucide-react`'s `UserPlus`. Shared between `Header`'s Join CTA and
 * `WaitlistFormCard`'s "Apply to Join" submit button (Figma `866:4832` "Primary" — same
 * "Icon slot" instance reused in both places, `fill="currentColor"` so it inherits the
 * button's black text color).
 */
export function JoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8.57245 9.36356C9.02618 9.41186 9.33464 9.82028 9.33464 10.2766V13.6667C9.33464 14.219 8.88692 14.6667 8.33464 14.6667H3.66797C3.11568 14.6667 2.65818 14.2148 2.76054 13.6721C3.22646 11.2019 5.39567 9.33334 8.0013 9.33334C8.19425 9.33334 8.3848 9.34358 8.57245 9.36356ZM8.0013 8.66667C5.7913 8.66667 4.0013 6.87667 4.0013 4.66667C4.0013 2.45667 5.7913 0.666672 8.0013 0.666672C10.2113 0.666672 12.0013 2.45667 12.0013 4.66667C12.0013 6.87667 10.2113 8.66667 8.0013 8.66667ZM12.0013 11.3333V10C12.0013 9.63182 12.2998 9.33334 12.668 9.33334C13.0362 9.33334 13.3346 9.63181 13.3346 10V11.3333H14.668C15.0362 11.3333 15.3346 11.6318 15.3346 12C15.3346 12.3682 15.0362 12.6667 14.668 12.6667H13.3346V14C13.3346 14.3682 13.0362 14.6667 12.668 14.6667C12.2998 14.6667 12.0013 14.3682 12.0013 14V12.6667H10.668C10.2998 12.6667 10.0013 12.3682 10.0013 12C10.0013 11.6318 10.2998 11.3333 10.668 11.3333H12.0013Z"
        fill="currentColor"
      />
    </svg>
  );
}
