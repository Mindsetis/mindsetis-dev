import { UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

/**
 * Primary site header — Figma "Header PC" (desktop) / "header mobile" (mobile), Mindsetis
 * design file. Server Component that reads the signed-in user server-side and renders the
 * matching auth state; the only client interactivity is the sign-out button and the locale
 * switcher.
 *
 * Note: the Figma design has no locale switcher (it predates the i18n work in stage 0.10).
 * It's kept here — architecture/existing infra wins over pixel-matching an older mock.
 */
export default async function Header() {
  const t = await getTranslations('nav');
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 bg-card">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:h-[88px] lg:px-[70px]">
        <Link
          href="/"
          className="font-display text-[1.5rem] leading-none font-normal text-primary lg:text-[2rem]"
        >
          {t('brand')}
        </Link>

        <div className="flex items-center gap-3 lg:gap-6">
          <LocaleSwitcher />

          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground lg:inline">{user.email}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground lg:text-base lg:font-medium lg:text-foreground"
              >
                {t('login')}
              </Link>
              {/* Figma: "header mobile" Join CTA (168:3071) = 46px tall, 24px horizontal
                  padding, 8px radius, hug-content width (measures ~81px for "Join") — matches
                  size `sm` (h-[46px] px-6) plus a local radius override (base Button radius
                  is 12px). "Header PC" Join CTA (387:1603) = 56px tall, 12px radius (already
                  matches `lg`), and a FIXED 199px width (not hug-content, unlike every other
                  Button usage) — set explicitly at `lg` since Tailwind can't express "hug on
                  mobile, fixed on desktop" via the size prop alone. */}
              <Button
                asChild
                size="sm"
                className="rounded-[8px] lg:h-14 lg:w-[199px] lg:rounded-lg lg:px-5"
              >
                <Link href="/sign-up">
                  <UserPlus className="hidden lg:inline" aria-hidden="true" />
                  {t('join')}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
