/**
 * Shared className for the "gradient / light" Cal Sans headings used across most Main Page
 * sections (Figma tags these explicitly: "Three ways to start", "Networking formats we offer",
 * both "The people you'll actually talk to" instances, "FAQ", "What expertise is useful for you
 * right now?", "Mindsetis Ambassadors" — confirmed per-node via `fillStyle: "gradient / light"`).
 * Reuses the existing global `--gradient-primary` token (`app/styles/tokens/effects.css`) rather
 * than a new value — same gradient already used for every primary-button fill on this page, and
 * the same token `MindsetterProfileView.module.css`'s own `.gradientHeading` rule resolved to
 * after visually sampling this exact Figma text style (see that file's doc comment).
 *
 * The Main Page hero H1 ("High-tier networking & collaborative learning") and the video-block
 * heading ("What you actually get here") do NOT carry this tag in Figma (no `fillStyle`
 * override, or an unresolved `"black"` placeholder that visibly renders white against the dark
 * page in the reference screenshot) — those stay plain `text-foreground`, not gradient.
 */
export const GRADIENT_HEADING_CLASSNAME =
  'bg-[image:var(--gradient-primary)] bg-clip-text text-transparent';
