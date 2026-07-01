import '@/app/globals.css';

import type { Metadata } from 'next';
import { Cal_Sans, Manrope } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/i18n/routing';
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
const calSans = Cal_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-cal-sans',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Mindsetis Community',
  description: 'A member-first community platform for 1:1 sessions and events.',
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

  return (
    <html lang={locale} className={cn('dark', manrope.variable, calSans.variable)}>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
