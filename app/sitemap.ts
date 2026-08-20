import type { MetadataRoute } from 'next';

import { localePath, routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/auth/site-url';

/**
 * `/sitemap.xml` — the homepage placeholder, and nothing else.
 *
 * Deliberately NOT a crawl of the route tree: every other route is `noindex` (see the
 * site-wide default in `app/[locale]/layout.tsx`) and `Disallow`ed in `app/robots.ts`, so
 * listing it here would only send crawlers at URLs we've asked them to skip.
 *
 * One entry per locale, each carrying the FULL `languages` map — that's how `hreflang` is
 * expressed in a sitemap: every localized variant must point at every other one (itself
 * included) or search engines ignore the annotations. `x-default` names the version served
 * to visitors whose language we don't cover, i.e. English.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, siteUrl(localePath(locale, '/'))]),
    ),
    'x-default': siteUrl(localePath(routing.defaultLocale, '/')),
  };

  return routing.locales.map((locale) => ({
    url: siteUrl(localePath(locale, '/')),
    changeFrequency: 'weekly' as const,
    priority: 1,
    alternates: { languages },
  }));
}
