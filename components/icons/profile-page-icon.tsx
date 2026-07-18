/**
 * "See how looks my profile page" icon (16×16) — provided verbatim by the designer.
 * `fill="currentColor"` (source asset had a literal `fill="black"`) so it follows the button's
 * text color like every other button icon in this codebase. Shared between the Member congrats
 * screen (`WelcomeCtas.tsx`) and the Mindsetter congrats screen (`MindsetterCongratsCtas.tsx`) —
 * extracted here (stage 1.9) so both can reuse the same asset instead of duplicating it.
 */
export function ProfilePageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.33333 14L8 15.3333L6.66667 14H3.33006C2.59549 14 2 13.4049 2 12.6699V3.33006C2 2.59549 2.59508 2 3.33006 2H12.6699C13.4045 2 14 2.59508 14 3.33006V12.6699C14 13.4045 13.4049 14 12.6699 14H9.33333ZM4.23791 12H11.8983C11.055 10.791 9.65393 10 8.06813 10C6.48229 10 5.08121 10.791 4.23791 12ZM8 8.66667C9.28867 8.66667 10.3333 7.622 10.3333 6.33333C10.3333 5.04467 9.28867 4 8 4C6.71133 4 5.66667 5.04467 5.66667 6.33333C5.66667 7.622 6.71133 8.66667 8 8.66667Z"
        fill="currentColor"
      />
    </svg>
  );
}
