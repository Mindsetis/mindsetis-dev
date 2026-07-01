import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

/**
 * Primary site header. Server Component that reads the signed-in user server-side and
 * renders the matching auth state; the only client interactivity is the sign-out button
 * (mobile nav / full UI Kit land in Stage 0.8).
 */
export default async function Header() {
  const t = await getTranslations('nav');
  const user = await getCurrentUser();

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
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                {t('login')}
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                {t('signUp')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
