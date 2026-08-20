import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

type CatchAllPageProps = {
  params: Promise<{ locale: string; rest: string[] }>;
};

/**
 * Catch-all for any URL under a resolved locale that doesn't match a real route (added
 * 2026-08-18) — the documented next-intl pattern for this. Without it, an unmatched-but-
 * locale-prefixed URL (e.g. `/en/this-page-does-not-exist`) fell through to the root
 * `app/not-found.tsx`, which renders OUTSIDE `app/[locale]/layout.tsx` — no Header/Footer, no
 * `NextIntlClientProvider`, because that file has no locale to work with. Routing it through
 * this catch-all instead means it goes through the real locale layout first, then calls
 * `notFound()` so `app/[locale]/not-found.tsx` (Header/Footer/translations intact) renders as
 * the body — matching the Figma "404" frame, which shows the full site header.
 *
 * Next.js's router always prefers a more specific match (static segments, then single dynamic
 * segments like `[username]`) over a catch-all `[...rest]` at the same path depth, so this
 * doesn't shadow real routes — confirmed live 2026-08-18 against `/`, `/welcome`,
 * `/privacy-policy`, and `/mindsetters/[username]`, all still 200.
 */
export default async function CatchAllPage({ params }: CatchAllPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
