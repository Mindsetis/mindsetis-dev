import { getTranslations } from 'next-intl/server';

import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/guards';

/** Join CTA icon (16×16) — provided verbatim by the designer, replacing `lucide-react`'s `UserPlus`. */
function JoinIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M8.57245 9.36356C9.02618 9.41186 9.33464 9.82028 9.33464 10.2766V13.6667C9.33464 14.219 8.88692 14.6667 8.33464 14.6667H3.66797C3.11568 14.6667 2.65818 14.2148 2.76054 13.6721C3.22646 11.2019 5.39567 9.33334 8.0013 9.33334C8.19425 9.33334 8.3848 9.34358 8.57245 9.36356ZM8.0013 8.66667C5.7913 8.66667 4.0013 6.87667 4.0013 4.66667C4.0013 2.45667 5.7913 0.666672 8.0013 0.666672C10.2113 0.666672 12.0013 2.45667 12.0013 4.66667C12.0013 6.87667 10.2113 8.66667 8.0013 8.66667ZM12.0013 11.3333V10C12.0013 9.63182 12.2998 9.33334 12.668 9.33334C13.0362 9.33334 13.3346 9.63181 13.3346 10V11.3333H14.668C15.0362 11.3333 15.3346 11.6318 15.3346 12C15.3346 12.3682 15.0362 12.6667 14.668 12.6667H13.3346V14C13.3346 14.3682 13.0362 14.6667 12.668 14.6667C12.2998 14.6667 12.0013 14.3682 12.0013 14V12.6667H10.668C10.2998 12.6667 10.0013 12.3682 10.0013 12C10.0013 11.6318 10.2998 11.3333 10.668 11.3333H12.0013Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
