'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary for the [locale] segment. Must be a Client Component
 * (Next.js requirement for error.tsx).
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const t = useTranslations('error');

  useEffect(() => {
    // TODO: wire up real error reporting (e.g. Sentry) once observability lands.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="max-w-md text-muted">{t('description')}</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        {t('retry')}
      </button>
    </div>
  );
}
