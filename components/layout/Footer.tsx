import { getTranslations } from 'next-intl/server';

/**
 * Primary site footer. Server Component. Expands with legal/social links in a later
 * stage — kept minimal for the app skeleton.
 */
export default async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6 lg:px-8">
        <span>{t('nav.brand')}</span>
        <span>
          &copy; {year} {t('nav.brand')}. {t('footer.rights')}
        </span>
      </div>
    </footer>
  );
}
