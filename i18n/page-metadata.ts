import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/**
 * Shared `generateMetadata` body for the many routes whose tab title is simply an existing
 * on-page heading, translated — added so every one of those routes didn't need to hand-roll the
 * same three lines (Release-1 D4: every route needs its own "Mindsetis — <page>" title,
 * `app/[locale]/layout.tsx`'s `title.template` supplies the "Mindsetis — " half).
 *
 * `key` must resolve to a PLAIN string — no rich-text placeholders like `<accent>…</accent>`
 * (some on-page headings are rendered with `t.rich` and contain exactly that). Reach for a
 * dedicated `metaTitle` key next to the rich one instead of pointing this at it; that key holds
 * the same heading with the markup stripped, kept for use only by `<title>`.
 *
 * `locale` is threaded in explicitly (mirrors `app/[locale]/page.tsx`'s own `generateMetadata`)
 * rather than left to `getTranslations`' implicit request-locale lookup: `generateMetadata` runs
 * before the page component's own `setRequestLocale` call, so nothing has established a request
 * locale in that scope yet.
 */
export async function pageTitle(
  locale: string,
  namespace: string,
  key = 'title',
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace });
  return { title: t(key) };
}
