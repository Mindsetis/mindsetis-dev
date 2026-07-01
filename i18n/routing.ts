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
  // Always show the locale segment (`/en/...`, `/es/...`) — matches the app's existing
  // URL structure (this is next-intl's default, made explicit here).
  localePrefix: 'always',
  // English-first (CLAUDE.md §i18n): never auto-switch the locale from the browser's
  // `Accept-Language` header. Visitors land on the default locale (English) and opt in to
  // another language explicitly via the `LocaleSwitcher`; the switcher's own navigation
  // still carries the chosen locale in the URL segment on every subsequent request.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
