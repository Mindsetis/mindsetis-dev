import type { SVGProps } from 'react';

/**
 * Figma "Main Page" section-eyebrow glyphs (`572:5427` desktop / `1249:18262` mobile — the
 * homepage rebuilt in `components/marketing/main-page/`). Same precedent as
 * `mindsetter-eyebrow-icons.tsx`: exported straight from the designer's own vector (via a
 * per-node SVG export), not swapped for a similarly-shaped `lucide-react` glyph, since each of
 * these has a distinct filled silhouette the outline icon set doesn't match.
 */

/** "WHAT IS MINDSETIS" eyebrow (`question-fill`, reused for both the video block and Three Ways
 * to Start sections — same Figma component instance both times) and the hero's "How it works"
 * button icon. `currentColor` — Figma's own instances vary between white and black fills
 * depending on what they sit on; the caller decides via its own text color. */
export function QuestionFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.99967 14.6666C4.31777 14.6666 1.33301 11.6818 1.33301 7.99998C1.33301 4.31808 4.31777 1.33331 7.99967 1.33331C11.6815 1.33331 14.6663 4.31808 14.6663 7.99998C14.6663 11.6818 11.6815 14.6666 7.99967 14.6666ZM7.33301 9.99998V11.3333H8.66634V9.99998H7.33301ZM8.66634 8.90338C9.63014 8.61651 10.333 7.72365 10.333 6.66665C10.333 5.37798 9.28834 4.33331 7.99967 4.33331C6.86767 4.33331 5.92392 5.13944 5.71121 6.20895L7.01887 6.47049C7.11007 6.01213 7.51454 5.66665 7.99967 5.66665C8.55194 5.66665 8.99967 6.11436 8.99967 6.66665C8.99967 7.21891 8.55194 7.66665 7.99967 7.66665C7.63147 7.66665 7.33301 7.96511 7.33301 8.33331V9.33331H8.66634V8.90338Z" />
    </svg>
  );
}

/** "AI search" eyebrow (`sparkling-fill`) — real Figma fill is a hardcoded brand blue
 * (`#79B9E3`, `--color-primary`), never varied by context, so this one is not `currentColor`
 * (same precedent as `mindsetter-eyebrow-icons.tsx`'s brand-blue eyebrows). */
export function SparklingFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9.33366 2.95825C10.2311 2.95825 10.9587 2.23071 10.9587 1.33325H11.7087C11.7087 2.23071 12.4362 2.95825 13.3337 2.95825V3.70825C12.4362 3.70825 11.7087 4.43579 11.7087 5.33325H10.9587C10.9587 4.43579 10.2311 3.70825 9.33366 3.70825V2.95825ZM0.666992 7.33325C2.87613 7.33325 4.66699 5.54239 4.66699 3.33325H6.00033C6.00033 5.54239 7.79119 7.33325 10.0003 7.33325V8.66658C7.79119 8.66658 6.00033 10.4575 6.00033 12.6666H4.66699C4.66699 10.4575 2.87613 8.66658 0.666992 8.66658V7.33325ZM11.5003 9.33325C11.5003 10.5299 10.5303 11.4999 9.33366 11.4999V12.4999C10.5303 12.4999 11.5003 13.47 11.5003 14.6666H12.5003C12.5003 13.47 13.4704 12.4999 14.667 12.4999V11.4999C13.4704 11.4999 12.5003 10.5299 12.5003 9.33325H11.5003Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "MINDSETIS EVENTS" eyebrow (`chat-voice-ai-fill`). Real Figma fill is the same hardcoded
 * brand blue as `SparklingFillIcon` above. */
export function ChatVoiceAiFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M13.8086 5.41858L13.6442 5.7957C13.5239 6.07178 13.1421 6.07178 13.0217 5.7957L12.8574 5.41858C12.5644 4.74615 12.0367 4.21078 11.3781 3.91789L10.8717 3.69265C10.5979 3.57086 10.5979 3.17238 10.8717 3.05058L11.3498 2.83793C12.0253 2.53751 12.5625 1.98232 12.8504 1.28706L13.0192 0.879524C13.1369 0.595497 13.5291 0.595497 13.6467 0.879524L13.8155 1.28706C14.1035 1.98232 14.6407 2.53751 15.3162 2.83793L15.7943 3.05058C16.0681 3.17238 16.0681 3.57086 15.7943 3.69265L15.2879 3.91789C14.6293 4.21078 14.1016 4.74615 13.8086 5.41858ZM14.6663 7.99984C14.6663 7.70337 14.647 7.41144 14.6095 7.12517C14.2086 7.26004 13.7793 7.33317 13.333 7.33317C12.6044 7.33317 11.9213 7.13837 11.333 6.79804V9.99984H9.99967V5.99984H10.3515C9.71814 5.29216 9.33301 4.35764 9.33301 3.33317C9.33301 2.69794 9.48107 2.09728 9.74461 1.56386C9.18841 1.41343 8.60341 1.33317 7.99967 1.33317C4.31777 1.33317 1.33301 4.31794 1.33301 7.99984C1.33301 9.84077 2.0792 11.5074 3.28563 12.7139L1.33301 14.6665H7.99967C11.6815 14.6665 14.6663 11.6817 14.6663 7.99984ZM7.33301 3.99984H8.66634V11.9998H7.33301V3.99984ZM4.66634 9.99984V5.99984H5.99967V9.99984H4.66634Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/** "TOP MINDSETTERS" eyebrow (`group-3-fill`, a two-person icon). Real Figma fill is the same
 * hardcoded brand blue as the two icons above. */
export function GroupFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M1.66634 4.66667C1.66634 6.13943 2.86025 7.33333 4.33301 7.33333C5.80577 7.33333 6.99967 6.13943 6.99967 4.66667C6.99967 3.19391 5.80577 2 4.33301 2C2.86025 2 1.66634 3.19391 1.66634 4.66667ZM1.33301 14V11C1.33301 9.34313 2.67615 8 4.33301 8C5.98986 8 7.33301 9.34313 7.33301 11V14H1.33301ZM11.6663 7.33333C10.1936 7.33333 8.99967 6.13943 8.99967 4.66667C8.99967 3.19391 10.1936 2 11.6663 2C13.1391 2 14.333 3.19391 14.333 4.66667C14.333 6.13943 13.1391 7.33333 11.6663 7.33333ZM8.66634 14V11C8.66634 9.34313 10.0095 8 11.6663 8C13.3232 8 14.6663 9.34313 14.6663 11V14H8.66634Z"
        fill="#79B9E3"
      />
    </svg>
  );
}
