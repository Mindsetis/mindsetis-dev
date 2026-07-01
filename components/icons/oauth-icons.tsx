import type { SVGProps } from 'react';

/**
 * Brand marks for the sign-up screen's OAuth buttons — Figma "Registration" (mobile
 * `165:2853`) / "Registration 1/4 - 1440 px" (desktop `387:1725`), "Continue with
 * Google"/"Continue with Linkedin" buttons.
 *
 * The Figma layers for these ("image 9" / "image 8") are pasted raster logos, not vector
 * paths the API can extract — these are the standard, widely-used multi-color Google "G" and
 * LinkedIn badge marks instead (same visual result, real vectors). Both buttons that use
 * these are `disabled` (OAuth deferred, see `OAuthButtons.tsx`), so treat this purely as a
 * visual stand-in.
 */

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.645h6.458a5.52 5.52 0 0 1-2.395 3.622v3.011h3.878c2.269-2.09 3.578-5.166 3.578-8.823Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.956-1.075 7.941-2.904l-3.878-3.011c-1.075.72-2.45 1.147-4.063 1.147-3.125 0-5.769-2.112-6.713-4.948H1.28v3.11A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.287 14.284A7.216 7.216 0 0 1 4.909 12c0-.793.136-1.563.378-2.284V6.605H1.28A11.998 11.998 0 0 0 0 12c0 1.937.464 3.77 1.28 5.395l4.007-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.773c1.763 0 3.346.606 4.591 1.796l3.443-3.443C17.951 1.19 15.236 0 12 0 7.31 0 3.257 2.69 1.28 6.605l4.007 3.11C6.231 6.88 8.875 4.773 12 4.773Z"
      />
    </svg>
  );
}

export function LinkedinBadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        fill="#ffffff"
        d="M7.12 9.34H4.62v9.32h2.5V9.34ZM5.87 5.5A1.45 1.45 0 1 0 5.88 8.4a1.45 1.45 0 0 0-.01-2.9ZM19.38 13.5c0-2.35-1.26-3.44-2.94-3.44a2.54 2.54 0 0 0-2.31 1.27h-.03V9.34h-2.4v9.32h2.5v-4.61c0-1.21.23-2.39 1.74-2.39 1.48 0 1.5 1.39 1.5 2.46v4.54h2.5v-5.16Z"
      />
    </svg>
  );
}
