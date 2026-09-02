import '@/app/globals.css';

import type { Metadata } from 'next';
import { Cal_Sans, Manrope } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CookieConsentBanner } from '@/components/cookies/CookieConsentBanner';
import { CookieConsentProvider } from '@/components/cookies/CookieConsentProvider';
import { CookiePreferencesDialog } from '@/components/cookies/CookiePreferencesDialog';
import { ScrollToTopButton } from '@/components/layout/ScrollToTopButton';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/auth/site-url';
import { getCookieConsent } from '@/lib/cookies/server';
import { cn } from '@/lib/utils';

// Body/UI font (400/500/700) — feeds the `--font-sans` token in app/globals.css.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

// Display/heading font (400 only) — feeds the `--font-display` token in
// app/globals.css. Cal Sans is available via next/font/google today; if that ever
// changes, `--font-display` in globals.css already falls back to Manrope/sans, so the
// build stays green either way.
//
// `adjustFontFallback: false` — Cal Sans isn't in Next.js's bundled font-metrics DB, so its
// automatic size-adjusted fallback-face generation can't find override values and logs
// "Failed to find font override values for font `Cal Sans`" on every build (a warning, not a
// failure). Disabling it silences that: we already ship an explicit CSS fallback chain via
// `--font-display`, and with `display: 'swap'` on a heading-only font the CLS tradeoff is
// negligible.
const calSans = Cal_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-cal-sans',
  display: 'swap',
  adjustFontFallback: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  // Absolute base for the canonical/hreflang URLs built with relative paths below and in
  // `app/[locale]/page.tsx`. Same origin the auth emails link to, so there is exactly one
  // source of truth for "where does this deployment live".
  metadataBase: new URL(siteUrl('/')),
  title: 'Mindsetis Community',
  description: 'A member-first community platform for 1:1 sessions and events.',
  // SITE-WIDE DEFAULT: KEEP OUT OF SEARCH RESULTS.
  //
  // Inherited by every route under `[locale]` — auth, onboarding wizards, member profiles,
  // the back-office — and deliberately overridden in exactly ONE place: the waitlist
  // homepage (`app/[locale]/page.tsx`), the only page meant to be found. Adding a route
  // therefore makes it non-indexable by default; opting in has to be a conscious edit.
  //
  // Belt and braces with `app/robots.ts`: robots.txt asks crawlers not to FETCH these URLs,
  // this header tells any crawler that fetched one anyway not to INDEX it. Neither alone
  // covers both cases — a `Disallow`ed URL can still be listed from an external link, and a
  // `noindex` is only honored if the page was actually read.
  robots: { index: false, follow: false },
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale's subtree (next-intl requirement).
  setRequestLocale(locale);

  // Read on the server so the very first painted HTML already knows whether the cookie banner
  // belongs on screen — see `lib/cookies/consent.ts` / `CookieConsentProvider`'s own doc
  // comments for why this can't be deferred to the client.
  const initialConsent = await getCookieConsent();

  return (
    <html lang={locale} className={cn('dark', manrope.variable, calSans.variable)}>
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale}>
          <CookieConsentProvider initialConsent={initialConsent}>
            {children}
            <CookieConsentBanner />
            <CookiePreferencesDialog />
            <ScrollToTopButton />
          </CookieConsentProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
