import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Landing placeholder (Stage 0.3). Real hero/catalog sections land with the marketing
 * page work later; this just proves the RSC + i18n + dark theme wiring end-to-end.
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');

  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg text-muted">{t('subtitle')}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        {t('cta')}
      </Link>
    </section>
  );
}
