import { setRequestLocale } from 'next-intl/server';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { HomepagePlaceholder } from '@/components/marketing/HomepagePlaceholder';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

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
      <Footer variant="minimal" />
    </>
  );
}
