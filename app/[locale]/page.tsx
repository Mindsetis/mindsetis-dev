import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { HomepagePlaceholder } from '@/components/marketing/HomepagePlaceholder';
import { localePath, routing } from '@/i18n/routing';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * THE ONE INDEXABLE PAGE.
 *
 * `app/[locale]/layout.tsx` sets `robots: { index: false }` for the whole site; this is the
 * single override that opts the waitlist placeholder back IN, matching `app/robots.ts`,
 * which `Allow`s only these same paths. Change one and the other must follow.
 *
 * The `description` reuses the hero subtitle rather than the layout's generic blurb: it is
 * the page's actual promise, already translated per locale, and lands inside the ~155-char
 * window search engines show.
 *
 * `alternates` are relative on purpose — they resolve against `metadataBase` in the layout.
 * `canonical` pins each locale to its own URL (`/` for English under `localePrefix:
 * 'as-needed'`, `/es` for Spanish) so the two aren't read as duplicates, and `languages`
 * declares the `hreflang` pairing, with `x-default` on English.
 */
export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.placeholder.hero' });

  return {
    description: t('subtitle'),
    alternates: {
      canonical: localePath(locale, '/'),
      languages: {
        ...Object.fromEntries(
          routing.locales.map((alternate) => [alternate, localePath(alternate, '/')]),
        ),
        'x-default': localePath(routing.defaultLocale, '/'),
      },
    },
    robots: { index: true, follow: true },
  };
}

/**
 * Coming-soon placeholder homepage — Figma "Заглушка" (`866:4823` desktop / `866:4885`
 * mobile) + "Thank you" success state (`870:4928` desktop / `870:4977` mobile), ROADMAP
 * stage 1.11. Sits OUTSIDE the `(app)` route group (`app/[locale]/(app)/layout.tsx`), so it
 * renders its own MINIMAL Header/Footer here rather than picking up the full site chrome
 * every other route gets — the root `app/[locale]/layout.tsx` only supplies
 * `<html>/<body>`/`NextIntlClientProvider`/`Toaster` now, no chrome of its own.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header variant="minimal" />
      <main className="flex-1">
        <HomepagePlaceholder />
      </main>
      <Footer variant="minimal" className="relative z-[5] -mt-[50px]" />
    </>
  );
}
