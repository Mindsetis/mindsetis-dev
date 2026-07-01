import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

type AuthLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Centered auth shell shared by /login, /forgot-password, /reset-password, and
 * /verify-email. (/sign-up lives outside this group — it's full-bleed with no card.)
 * Server Component — the interactive bits live in the client forms.
 */
export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('nav');

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="mb-8 text-xl font-bold tracking-tight text-foreground">
        {t('brand')}
      </Link>
      <div className="w-full max-w-md rounded-lg border border-border bg-white/[0.02] p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
