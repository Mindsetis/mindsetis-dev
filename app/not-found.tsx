import '@/app/globals.css';

import Link from 'next/link';

/**
 * Global 404 fallback.
 *
 * There is intentionally no top-level `app/layout.tsx` — `app/[locale]/layout.tsx` is
 * the root layout for every localized route. This file only renders when Next.js can't
 * resolve a locale segment at all (e.g. middleware bypassed), so it defines its own
 * `<html>`/`<body>` per Next.js's requirement for the global not-found file, and can't
 * rely on next-intl (no locale is known here) — copy is intentionally hardcoded
 * English as a last-resort fallback, not a user-facing localized page.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground antialiased">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="max-w-md text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
      </body>
    </html>
  );
}
