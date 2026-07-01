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
});

export type AppLocale = (typeof routing.locales)[number];
