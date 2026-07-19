/**
 * Section-heading icons for the Mindsetter extended onboarding steps (e.g. `roles/page.tsx`'s
 * "Your roles" heading, placed after the "See how it looks" preview button and before the step's
 * form). One export per step — this file is expected to grow as the product owner supplies
 * custom icons for the other steps (superpowers/help/numbers/wins/my-way/f*ckups) too.
 */

/** "Your roles" section heading icon (40×40 desktop, provided verbatim by the designer,
 * hardcoded fill — not `currentColor`). Accepts a `className` so callers can shrink it on
 * mobile (28×28 per product spec) via Tailwind `size-*` utilities, which override the SVG's
 * own `width`/`height` attributes. */
export function RolesSectionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-10'}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M25.3723 25.8466L21.6845 33.597C21.4472 34.0956 20.8505 34.3075 20.3518 34.0701C20.2407 34.0173 20.1402 33.9443 20.0555 33.855L14.1532 27.6236C13.9952 27.4568 13.7846 27.3495 13.5568 27.3198L5.04628 26.2073C4.49865 26.1358 4.11275 25.6338 4.18433 25.0861C4.20028 24.9641 4.23866 24.846 4.29751 24.7378L8.39986 17.1988C8.50968 16.997 8.54666 16.7635 8.50458 16.5377L6.93268 8.09997C6.83153 7.55702 7.18968 7.03489 7.73263 6.93374C7.85368 6.91119 7.97786 6.91119 8.09891 6.93374L16.5366 8.50564C16.7625 8.54771 16.996 8.51074 17.1977 8.40092L24.7367 4.29857C25.2218 4.03459 25.8292 4.21387 26.093 4.69897C26.152 4.80714 26.1903 4.92524 26.2062 5.04734L27.3187 13.5578C27.3485 13.7856 27.4558 13.9962 27.6225 14.1542L33.8538 20.0565C34.2548 20.4363 34.272 21.0693 33.8922 21.4703C33.8075 21.5596 33.707 21.6326 33.5958 21.6855L25.8457 25.3735C25.6382 25.4721 25.471 25.6393 25.3723 25.8466ZM26.7003 29.0585L29.0573 26.7015L36.1285 33.7725L33.7715 36.1295L26.7003 29.0585Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "Your superpowers" section heading icon (40×40 desktop, provided verbatim by the designer,
 * hardcoded fill — not `currentColor`). Same `className` override convention as
 * `RolesSectionIcon` (28×28 on mobile per product spec). */
export function SuperpowersSectionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-10'}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21.668 16.367C21.668 16.5327 21.8023 16.667 21.968 16.667H32.7621C33.0041 16.667 33.1465 16.9388 33.0087 17.1378L18.8813 37.544C18.7139 37.7859 18.3346 37.6674 18.3346 37.3733V23.6337C18.3346 23.468 18.2003 23.3337 18.0346 23.3337H7.24054C6.99854 23.3337 6.85613 23.0619 6.99388 22.8629L21.1213 2.45661C21.2887 2.21479 21.668 2.33326 21.668 2.62737V16.367Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "Profile completeness" card icon (40×40, provided verbatim by the designer, hardcoded fill —
 * not `currentColor`) — used on the "Make your profile shine" step's completeness card. No
 * mobile-shrink override requested for this one (unlike the step-heading icons above), but the
 * same `className` convention is kept for consistency. */
export function CompletenessIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-10'}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.0013 25.0003H3.33464C2.33464 25.0003 1.66797 25.667 1.66797 26.667V36.667C1.66797 37.667 2.33464 38.3337 3.33464 38.3337H10.0013C11.0013 38.3337 11.668 37.667 11.668 36.667V26.667C11.668 25.667 11.0013 25.0003 10.0013 25.0003ZM23.3346 15.0003H16.668C15.668 15.0003 15.0013 15.667 15.0013 16.667V36.667C15.0013 37.667 15.668 38.3337 16.668 38.3337H23.3346C24.3346 38.3337 25.0013 37.667 25.0013 36.667V16.667C25.0013 15.667 24.3346 15.0003 23.3346 15.0003ZM36.668 1.66699H30.0013C29.0013 1.66699 28.3346 2.33366 28.3346 3.33366V36.667C28.3346 37.667 29.0013 38.3337 30.0013 38.3337H36.668C37.668 38.3337 38.3346 37.667 38.3346 36.667V3.33366C38.3346 2.33366 37.668 1.66699 36.668 1.66699Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "You can help with" section heading icon (40×40 desktop, provided verbatim by the designer,
 * hardcoded fill — not `currentColor`). Same `className` override convention as
 * `RolesSectionIcon` (28×28 on mobile per product spec). */
export function HelpSectionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'size-10'}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M31.6654 10H26.6654V8.33333C26.6654 6.5 25.1654 5 23.332 5H16.6654C14.832 5 13.332 6.5 13.332 8.33333V10H8.33203C5.4987 10 3.33203 12.1667 3.33203 15V30C3.33203 32.8333 5.4987 35 8.33203 35H31.6654C34.4987 35 36.6654 32.8333 36.6654 30V15C36.6654 12.1667 34.4987 10 31.6654 10ZM16.6654 8.33333H23.332V10H16.6654V8.33333ZM33.332 30C33.332 31 32.6654 31.6667 31.6654 31.6667H8.33203C7.33203 31.6667 6.66536 31 6.66536 30V20.6667L14.4987 23.3333C14.6654 23.3333 14.832 23.3333 14.9987 23.3333H24.9987C25.1654 23.3333 25.332 23.3333 25.4987 23.1667L33.332 20.5V30Z"
        fill="#79B9E3"
      />
    </svg>
  );
}
