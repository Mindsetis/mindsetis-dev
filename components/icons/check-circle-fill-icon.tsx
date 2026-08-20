import type { SVGProps } from 'react';

/**
 * Figma "ic / check-circle" — a solid disc with the tick knocked OUT of it, so the tick shows
 * whatever is behind the icon (black, on these pages) while the disc takes `currentColor`.
 *
 * Supplied by the designer at its native 52×52 (2026-08-13), which is the size the two
 * confirmation screens use it at; earlier this file carried the 16×16 chip variant of the same
 * shape, scaled up. Colour comes from the call site: brand blue on "Check your email", success
 * green on "Password changed".
 */
export function CheckCircleFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 52 52" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M26.0002 4.33398C14.0835 4.33398 4.3335 14.084 4.3335 26.0006C4.3335 37.9173 14.0835 47.6673 26.0002 47.6673C37.9168 47.6673 47.6668 37.9173 47.6668 26.0006C47.6668 14.084 37.9168 4.33398 26.0002 4.33398ZM35.1002 22.3173L24.7002 32.7173C23.8335 33.584 22.5335 33.584 21.6668 32.7173L16.9002 27.9506C16.0335 27.084 16.0335 25.784 16.9002 24.9173C17.7668 24.0506 19.0668 24.0506 19.9335 24.9173L23.1835 28.1673L32.0668 19.284C32.9335 18.4173 34.2335 18.4173 35.1002 19.284C35.9668 20.1506 35.9668 21.4507 35.1002 22.3173Z" />
    </svg>
  );
}
