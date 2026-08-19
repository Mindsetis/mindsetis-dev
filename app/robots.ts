import type { MetadataRoute } from 'next';

import { localePath, routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/auth/site-url';

/**
 * `/robots.txt` — crawler policy for the pre-launch site.
 *
 * ONLY THE HOMEPAGE IS CRAWLABLE. The waitlist placeholder (`/`, plus its localized twin
 * `/es`) is the single public page we want in search results; every other route — auth,
 * onboarding wizards, member profiles, the back-office, Route Handlers — stays out.
 *
 * HOW THE RULES COMPOSE
 *   `Disallow: /` closes everything, and each `Allow` re-opens one exact path. The trailing
 *   `$` anchors the rule to the END of the path, so `Allow: /$` matches the homepage and
 *   nothing else (`/login` is not matched by it). Where several rules match a URL, Google and
 *   Bing apply the LONGEST one — `/es$` (4 chars) beats `Disallow: /` (1 char) for `/es`,
 *   while `/es/login` only matches the `Disallow`. Locales come from `routing.locales` via
 *   `localePath`, so adding a locale needs no edit here (`as-needed` prefixing means English
 *   is the bare `/`).
 *
 * WHY `_next/static`, `_next/image` AND `/images/` STAY OPEN
 *   Google renders a page before indexing it. Blocking its CSS/JS chunks or the hero/glow
 *   artwork would leave the crawler with an unstyled, half-broken homepage and hurt exactly
 *   the page we DO want indexed. These paths carry no private data — the pages behind them
 *   are gated by middleware and RLS, not by robots.txt (which is a request to well-behaved
 *   crawlers, never an access control).
 *
 * NOTE — THE PASSWORD GATE WINS
 *   While `SITE_AUTH_PASSWORD` is set, `middleware.ts` answers EVERY request (this file
 *   included) with a 401, so no crawler gets this far and nothing is indexed at all. This
 *   policy takes effect the moment that variable is removed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          // Homepage per locale: '/' (en) and '/es', each anchored to an exact match.
          ...routing.locales.map((locale) => `${localePath(locale, '/')}$`),
          // Render dependencies of that homepage — see the header comment.
          '/_next/static/',
          '/_next/image',
          '/images/',
        ],
        disallow: '/',
      },
    ],
    sitemap: siteUrl('/sitemap.xml'),
  };
}
