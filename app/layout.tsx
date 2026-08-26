import '@/app/globals.css';

import type { ReactNode } from 'react';

/**
 * Required by Next.js purely for its existence: the App Router needs `app/layout.tsx` to be
 * present so root-level special files (`app/not-found.tsx`, a future `app/global-error.tsx`)
 * have somewhere to attach — otherwise Next.js errors with "not-found.tsx doesn't have a root
 * layout" even though that file defines its own `<html>`/`<body>`. This layout intentionally
 * renders neither: every real, localized route is nested under `app/[locale]/layout.tsx`,
 * which is the actual root layout (fonts, `<html>`/`<body>`, header/footer, providers) for
 * everything reachable through the locale segment. This file only matters for the rare
 * top-level fallback when no locale segment resolves at all.
 *
 * The stylesheet import has to live HERE, not (only) in `app/not-found.tsx`: Next attaches CSS
 * chunks to the layout that owns a route, and an import inside the not-found file alone shipped
 * no stylesheet at all — the page rendered with correct class names and zero styling (verified
 * in-browser 2026-08-18: only Next's own dev font-face was present, the "404" numeral computed
 * to 32px black instead of the 120/250px gradient). `app/[locale]/layout.tsx` imports the same
 * file; it resolves to one shared chunk, so localized routes are unaffected.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
