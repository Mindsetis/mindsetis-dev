import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Locale-aware 404 — handles `notFound()` calls raised from within `/[locale]/**`
 * routes (most cases). The top-level `app/not-found.tsx` is a locale-less fallback
 * for URLs middleware couldn't resolve to a locale at all.
 */
export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="max-w-md text-muted-foreground">{t('description')}</p>
      <Button asChild variant="primary">
        <Link href="/">{t('back')}</Link>
      </Button>
    </div>
  );
}
