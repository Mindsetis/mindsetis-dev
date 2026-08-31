import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { HomepagePlaceholder } from '@/components/marketing/HomepagePlaceholder';
import { MainPageSection } from '@/components/marketing/MainPageSection';
import { localePath, routing } from '@/i18n/routing';
import { COMING_SOON_MODE } from '@/lib/config/coming-soon';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * THE ONE INDEXABLE PAGE.
 *
 * `app/[locale]/layout.tsx` sets `robots: { index: false }` for the whole site; this is the
 * single override that opts the homepage back IN, matching `app/robots.ts`, which `Allow`s
 * only these same paths. Change one and the other must follow. That holds in BOTH modes —
 * whichever homepage renders below, it is still the homepage and still the only page we want
 * found.
 *
 * The `description` reuses the rendered variant's own subtitle rather than the layout's
 * generic blurb: it is the page's actual promise, already translated per locale, and lands
 * inside the ~155-char window search engines show. It follows the mode for the same reason
 * the `<h1>` does — a description advertising a landing page nobody can reach would be a lie
 * while the placeholder is up.
 *
 * `alternates` are relative on purpose — they resolve against `metadataBase` in the layout.
 * `canonical` pins each locale to its own URL (`/` for English under `localePrefix:
 * 'as-needed'`, `/es` for Spanish) so the two aren't read as duplicates, and `languages`
 * declares the `hreflang` pairing, with `x-default` on English.
 */
export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: COMING_SOON_MODE ? 'home.placeholder.hero' : 'home.main.hero',
  });

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
 * The homepage, in two versions — which one renders is `COMING_SOON_MODE` (see
 * `lib/config/coming-soon.ts`), the same flag `middleware.ts` uses to decide whether the rest
 * of the site is reachable. The two halves are deliberately one switch: a placeholder implies
 * a closed site, and a landing page implies an open one.
 *
 * CLOSED (`COMING_SOON_MODE=true`, what dev and production run) — the waitlist placeholder,
 * Figma "Заглушка" (`866:4823` desktop / `866:4885` mobile) + "Thank you" success state
 * (`870:4928` / `870:4977`), ROADMAP stage 1.11.
 *
 * OPEN (anything else, what you want locally) — the full landing page, Figma "Main Page"
 * (`572:5427` desktop / `1249:18262` mobile) — see `MainPageSection`'s own doc comment for scope
 * notes. The PREVIOUS open-mode homepage (`HeroSection`, Figma "Welcome Screen - 1440 px" /
 * "Welcome Screen") moved to `/join` (`app/[locale]/(app)/join/page.tsx`) rather than being
 * deleted — it's still the destination the header's "Apply to Join" CTA and this page's own
 * "Apply to Join"/"How it works" CTAs point to.
 *
 * WHY THE CHROME IS RENDERED HERE AND NOT IN A LAYOUT
 *   This page sits OUTSIDE the `(app)` route group, whose layout carries the full site chrome
 *   — that's exactly how the placeholder gets its stripped-down header/footer instead. The
 *   root `app/[locale]/layout.tsx` supplies only `<html>/<body>`, the intl provider and the
 *   toaster. So each branch below has to name its own Header/Footer variant, and the open
 *   branch reproduces what `(app)/layout.tsx` renders for every other route. Moving the page
 *   into `(app)` to inherit that isn't an option: two pages can't resolve to the same `/`.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (COMING_SOON_MODE) {
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

  return (
    <>
      <Header />
      <main className="flex-1">
        <MainPageSection />
      </main>
      <Footer />
    </>
  );
}
