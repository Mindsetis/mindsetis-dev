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
 * English as a last-resort fallback, not a user-facing localized page. No Header/Footer
 * either, same reason (both read translations/locale-aware nav).
 *
 * Kept visually in sync with `app/[locale]/not-found.tsx` (Figma "404" `1112:27458` desktop /
 * `1154:16573` mobile — see that file's own doc comment for the exact layout math: the card
 * overlaps the numeral's bottom edge by a measured 53px desktop / 16px mobile, it isn't a
 * gapped stack). Copy is the English source strings from `messages/en.json`'s `notFound.*`
 * duplicated as plain literals — this file can't call `getTranslations`, so there's no single
 * source to import from; if `notFound.*` copy changes, this file needs the same edit by hand.
 *
 * The `import '@/app/globals.css'` above is required here even though `app/layout.tsx` now
 * also imports it — Next attaches a route's CSS chunk to whichever layout/page files are
 * actually in that route's tree, and dropping this import once shipped zero styling for this
 * exact page (verified in-browser 2026-08-18). Keep both.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="flex flex-col items-center bg-background px-4 pt-16 pb-24 text-center text-foreground antialiased md:pt-[65px] md:pb-[72px]">
        <h1 className="bg-[linear-gradient(180deg,#70deff_12.59%,#010101_85.19%)] bg-clip-text font-display text-[120px] leading-[0.9] tracking-[-0.02em] text-transparent md:text-[250px]">
          404
        </h1>

        <div className="-mt-4 flex w-full max-w-[560px] flex-col gap-8 rounded-[20px] border border-[#2a2a2a] bg-card p-[23px] md:-mt-[53px] md:p-10">
          <div className="flex flex-col gap-3 md:gap-4">
            <h2 className="font-display text-[24px] text-foreground md:text-m">Page not found</h2>
            <p className="text-body font-medium text-muted-foreground md:font-normal">
              The link might be incorrect, or this feature hasn&apos;t been launched yet. Don&apos;t
              worry, nothing is broken on your side.
            </p>
          </div>

          {/* Same order/height rules as the localized 404 — see that file's doc comment. */}
          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              asChild
              variant="primary"
              size="lg"
              className="w-full md:order-2 md:h-[52px] md:flex-1"
            >
              <Link href="/login">Log in / Sign up</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full md:order-1 md:h-[52px] md:flex-1"
            >
              <Link href="/">Go to homepage</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
