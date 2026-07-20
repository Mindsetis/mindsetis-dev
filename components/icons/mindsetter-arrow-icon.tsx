/**
 * Trailing arrow badge (16×16) for `outlineArrow`-variant buttons ("Find out who a Mindsetter
 * is", hero "See platform features") — provided verbatim by the designer. Two
 * independently-colored parts (circle background, arrow glyph), neither driven by
 * `currentColor` — both explicitly swap to grey on `disabled` per spec (2026-07-17), which a
 * single CSS `color` inheritance chain can't express, so this takes a `disabled` prop and picks
 * the right fill pair directly instead.
 */
export function MindsetterArrowIcon({ disabled = false }: { disabled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="16"
        y="16"
        width="16"
        height="16"
        rx="8"
        transform="rotate(-180 16 16)"
        fill={disabled ? '#747474' : '#79B9E3'}
      />
      <path
        d="M4.9714 7.52865C4.71107 7.52865 4.50003 7.73968 4.50002 8.00001C4.50001 8.26035 4.71106 8.47141 4.9714 8.47141L10.1601 8.47141L8.95358 10.0964C8.84914 10.2371 8.84914 10.4296 8.95358 10.5702C9.11247 10.7842 9.43285 10.7842 9.59174 10.5702L11.0574 8.59612C11.3202 8.24216 11.3202 7.75786 11.0574 7.4039L9.59176 5.42979C9.43286 5.21577 9.11247 5.21578 8.95358 5.4298C8.84914 5.57047 8.84915 5.76294 8.95359 5.9036L10.1601 7.5286L4.9714 7.52865Z"
        fill={disabled ? '#A5A5A5' : 'white'}
      />
    </svg>
  );
}
