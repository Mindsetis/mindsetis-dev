import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

/**
 * Primary site header. Server Component — no client interactivity yet (mobile nav /
 * auth state land with the full UI Kit in Stage 0.8).
 */
export default async function Header() {
  const t = await getTranslations('nav');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          {t('brand')}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            {t('home')}
          </Link>
          <Link href="/" className="transition-colors hover:text-foreground">
            {t('explore')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
