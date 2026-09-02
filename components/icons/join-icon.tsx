import type { SVGProps } from 'react';

/**
 * "Join"/"Apply to Join" CTA icon (16×16) — provided verbatim by the designer, replacing
 * `lucide-react`'s `UserPlus`. Shared between `Header`'s Join CTA, `WaitlistFormCard`'s
 * "Apply to Join" submit button, and the Main Page hero + "What you actually get here" CTAs
 * (Figma `866:4832` "Primary" — the same "Icon slot" instance reused in every one of them,
 * `fill="currentColor"` so it inherits the button's black text color).
 *
 * Path re-pasted 2026-08-31 from the designer's own fresh Figma export. It differs from the
 * previous copy only in the last decimal place of a few coordinates (e.g. `8.57147` vs
 * `8.57245`) — sub-0.1px, visually identical — but is kept verbatim so a future diff against
 * Figma matches exactly rather than flagging phantom drift.
 */
export function JoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8.57147 9.36351C9.0252 9.41181 9.33366 9.82023 9.33366 10.2765V13.6666C9.33366 14.2189 8.88594 14.6666 8.33366 14.6666H3.66699C3.11471 14.6666 2.6572 14.2148 2.75956 13.672C3.22549 11.2018 5.39469 9.33329 8.00033 9.33329C8.19327 9.33329 8.38383 9.34354 8.57147 9.36351ZM8.00033 8.66663C5.79033 8.66663 4.00033 6.87663 4.00033 4.66663C4.00033 2.45663 5.79033 0.666626 8.00033 0.666626C10.2103 0.666626 12.0003 2.45663 12.0003 4.66663C12.0003 6.87663 10.2103 8.66663 8.00033 8.66663ZM12.0003 11.3333V9.99996C12.0003 9.63177 12.2988 9.33329 12.667 9.33329C13.0352 9.33329 13.3337 9.63177 13.3337 9.99996V11.3333H14.667C15.0352 11.3333 15.3337 11.6318 15.3337 12C15.3337 12.3681 15.0352 12.6666 14.667 12.6666H13.3337V14C13.3337 14.3681 13.0352 14.6666 12.667 14.6666C12.2988 14.6666 12.0003 14.3681 12.0003 14V12.6666H10.667C10.2988 12.6666 10.0003 12.3681 10.0003 12C10.0003 11.6318 10.2988 11.3333 10.667 11.3333H12.0003Z"
        fill="currentColor"
      />
    </svg>
  );
}
