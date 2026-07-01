import '@/app/globals.css';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

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
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild variant="primary">
          <Link href="/">Back to home</Link>
        </Button>
      </body>
    </html>
  );
}
