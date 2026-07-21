import { defineRouting } from 'next-intl/routing';

/**
 * Locale routing config (next-intl App Router).
 *
 * English-first, Spanish-ready (CLAUDE.md §i18n). Add locales here only — never
 * hardcode locale lists elsewhere.
 */
export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  // English (default) is served from the root with NO locale segment (`/`, `/login`, …);
  // every other locale carries its prefix (`/es/...`, and future `/uk/...`, `/de/...`).
  // Requests to `/en/...` are redirected to the bare path by next-intl.
  localePrefix: 'as-needed',
  // English-first (CLAUDE.md §i18n): never auto-switch the locale from the browser's
  // `Accept-Language` header. Visitors land on the default locale (English) and opt in to
  // another language explicitly via the `LocaleSwitcher`; the switcher's own navigation
  // still carries the chosen locale in the URL segment on every subsequent request.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * Build a locale-aware pathname honoring `localePrefix: 'as-needed'`: the default locale
 * (English) gets NO prefix; any other locale gets `/<locale>`. Use this ONLY in the raw
 * URL-construction sites where next-intl's own navigation helpers aren't available —
 * the middleware, `next/navigation` redirects, and Route Handlers. Inside `app/[locale]/**`
 * components keep using the locale-aware `Link`/`redirect` from `@/i18n/navigation`.
 */
export function localePath(locale: string, path: string): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return clean === '' ? '/' : clean;
  }
  return `/${locale}${clean}`;
}
