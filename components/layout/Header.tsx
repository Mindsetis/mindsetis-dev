import { getTranslations } from 'next-intl/server';

import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { JoinIcon } from '@/components/icons/join-icon';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

type HeaderProps = {
  /**
   * `'full'` (default) — logo + `LocaleSwitcher` + Join CTA, used everywhere via
   * `app/[locale]/(app)/layout.tsx`. `'minimal'` — logo only, centered, no
   * `LocaleSwitcher`/Join — used by the coming-soon homepage placeholder (stage 1.11,
   * ROADMAP), which sits outside the `(app)` route group and renders its own chrome.
   */
  variant?: 'full' | 'minimal';
};

/**
 * Primary site header — Figma "Header PC" (desktop) / "header mobile" (mobile), Mindsetis
 * design file.
 *
 * Login UI temporarily removed (2026-07-18, product decision: not used at this stage) — no
 * "Login" link, no email/`SignOutButton` display. The auth check itself (`getCurrentUser()`)
 * stays, though: it's the only way to know whether to show the Join CTA at all — once a
 * visitor has registered (signed in), Join disappears (there's nothing left to "join"), same
 * as before this pass, just without the extra signed-in-state UI that used to sit next to it.
 *
 * To restore the "Login" link + signed-in email/`SignOutButton` display: re-add
 * `import { SignOutButton } from '@/components/auth/SignOutButton'`, and reinstate the
 * `!user` branch showing a "Login" link alongside Join, plus a `user` branch showing
 * `user.email` + `<SignOutButton />` in place of Join (see git history for the exact prior
 * version).
 */
export default async function Header({ variant = 'full' }: HeaderProps) {
  const t = await getTranslations('nav');
  const user = variant === 'full' ? await getCurrentUser() : null;

  if (variant === 'minimal') {
    return (
      <header className="sticky top-0 z-40 bg-card">
        <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:h-[88px] lg:px-[70px]">
          <Link
            href="/"
            className="font-display text-[1.5rem] leading-none font-normal text-primary lg:text-[2rem]"
          >
            {t('brand')}
          </Link>
        </div>
      </header>
    );
  }

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

          {user ? null : (
            // Figma: "header mobile" Join CTA (168:3071) = 46px tall, 24px horizontal
            // padding, 8px radius, hug-content width (measures ~81px for "Join") — matches
            // size `sm` (h-[46px] px-6) plus a local radius override (base Button radius
            // is 12px). "Header PC" Join CTA (387:1603) = 56px tall, 12px radius (already
            // matches `lg`), and a FIXED 199px width (not hug-content, unlike every other
            // Button usage) — set explicitly at `lg` since Tailwind can't express "hug on
            // mobile, fixed on desktop" via the size prop alone.
            <Button
              asChild
              size="sm"
              className="rounded-[8px] lg:h-14 lg:w-[199px] lg:rounded-lg lg:px-5"
            >
              <Link href="/sign-up">
                <JoinIcon className="hidden lg:inline" />
                {t('join')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
