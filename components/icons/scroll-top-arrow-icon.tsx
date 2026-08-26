/**
 * "Scroll up" pill's arrow icon (16×16) — Figma node `1124:31265` inside the "Scroll up"
 * component (`1133:31269`), provided verbatim by the designer (exported as SVG via the Figma
 * MCP bridge to get the real path data — `get_node`'s own summary doesn't expose it). Fixed
 * `fill="black"` (not `currentColor`): unlike other button icons in this codebase, this one
 * always sits on the same fixed light-blue gradient badge regardless of any button state, so
 * there's no text-color mechanic for it to follow.
 */
export function ScrollTopArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M7.37153 14.3715C7.37153 14.7186 7.65291 15 8.00001 15C8.34714 15 8.62855 14.7186 8.62855 14.3715V5.29702L10.6873 7.26226C10.9245 7.48867 11.2977 7.48866 11.5349 7.26226C11.7882 7.02048 11.7882 6.61612 11.5349 6.37434L8.6905 3.65912C8.30407 3.29025 7.69595 3.29025 7.30952 3.65912L4.46512 6.37431C4.21181 6.61611 4.21182 7.02049 4.46513 7.26227C4.70231 7.48867 5.07556 7.48866 5.31273 7.26226L7.37147 5.29699L7.37153 14.3715Z"
        fill="black"
      />
    </svg>
  );
}
