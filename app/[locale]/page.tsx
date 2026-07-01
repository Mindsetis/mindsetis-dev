import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
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
      <p className="max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
      <Button asChild variant="primary" size="lg">
        <Link href="/">{t('cta')}</Link>
      </Button>
    </section>
  );
}
