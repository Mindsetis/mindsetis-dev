import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { CheckCircleFillIcon } from '@/components/icons/check-circle-fill-icon';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type AuthScreenProps = {
  title: string;
  /** Grey line under the title; omitted where the frame has none. */
  subtitle?: string;
  /**
   * `left` for the screens that lead into a form (Log in, Reset your password, Set a new
   * password); `center` for the two confirmation screens (Check your email, Password changed).
   * The frames use the same alignment at both breakpoints, so this isn't responsive.
   */
  align?: 'left' | 'center';
  /** Renders the check disc above the title (the two confirmation screens). */
  icon?: boolean;
  /**
   * Disc colour. Brand blue on "Check your email"; success green on "Password changed", at both
   * breakpoints (2026-08-13 — the designer's own asset for that screen is `#08d6ad`, which
   * settles the desktop-blue / mobile-green split the frames had).
   */
  iconTone?: 'primary' | 'success';
  /** Smaller 24px heading — only "Password changed" shrinks its title on mobile. */
  compactTitleOnMobile?: boolean;
  /** "← Back to log in", under everything else. */
  backToLogin?: string;
  children: ReactNode;
};

/**
 * Shared shell for the login + password-recovery screens (Figma `679:8779`, `679:8913`,
 * `680:8880`, `680:8987`, `680:9123` and their mobile twins).
 *
 * All five are the same page: full-bleed on the black background under the ordinary site header,
 * one 639px column centred in the page, 24px between blocks. They deliberately do NOT use the old
 * `(auth)` route group, whose layout drew a bordered card and its own wordmark.
 *
 * The frames' own header ("Log In" / "Apply to Join") and footer (still Relume placeholder copy)
 * are global chrome these pages don't own, so neither is reproduced.
 */
export function AuthScreen({
  title,
  subtitle,
  align = 'left',
  icon = false,
  iconTone = 'primary',
  compactTitleOnMobile = false,
  backToLogin,
  children,
}: AuthScreenProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-20 sm:px-6 lg:px-[70px] lg:pt-[120px] lg:pb-[150px]">
      <div
        className={cn(
          'mx-auto flex w-full max-w-[640px] flex-col gap-6',
          align === 'center' && 'items-center text-center',
        )}
      >
        <div className={cn('flex flex-col gap-2', align === 'center' && 'items-center gap-6')}>
          {/* 46px on the mobile frames, 52px on desktop. */}
          {icon ? (
            <CheckCircleFillIcon
              className={cn(
                'size-[46px] lg:size-[52px]',
                iconTone === 'success' ? 'text-success' : 'text-primary',
              )}
            />
          ) : null}

          <h1
            className={cn(
              'font-display leading-none text-foreground',
              compactTitleOnMobile ? 'text-[24px] lg:text-[32px]' : 'text-[32px]',
            )}
          >
            {title}
          </h1>

          {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
        </div>

        {children}

        {/* Centred under the button, both breakpoints. The mobile frames drop this link entirely,
            which would strand a phone user: the mobile header carries only "Join", so there'd be
            no way back to log in from here. Treated as an oversight and kept. */}
        {backToLogin ? (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 self-center text-base font-bold text-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backToLogin}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
