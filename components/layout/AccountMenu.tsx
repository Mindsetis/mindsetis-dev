'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';

import { signOut } from '@/app/[locale]/(app)/(auth)/actions';
import {
  MenuExternalIcon,
  MenuLogoutIcon,
  MenuSettingsIcon,
} from '@/components/icons/account-menu-icons';
import { EditPencilIcon } from '@/components/icons/cabinet-header-icons';
import { AccountAvatar } from '@/components/layout/AccountAvatar';
import { AccountSheet } from '@/components/layout/AccountSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type AccountMenuProps = {
  /** Public profile handle — the menu's first item links to this account's own page. */
  username: string;
  accountType: 'member' | 'mindsetter';
  avatarUrl: string | null;
  /** Used for the trigger's accessible name and the fallback initial. */
  displayName: string;
  /** Shown as a badge in the mobile sheet's header; the desktop dropdown has no such row. */
  isVerified: boolean;
};

/**
 * Header avatar + account menu (Figma component set `910:11291`, instances `910:11347` /
 * `910:11402`).
 *
 * The item set is IDENTICAL for both account types — the Figma component has richer `Role=Member`
 * / `Role=Mindsetter` variants carrying Overview / Bookings / Sessions Setup / Earnings, but
 * neither header instance shows them (they sit outside the 152px panel), and those destinations
 * don't exist yet. Only the three visible rows are built: View public profile, Settings, Log out.
 *
 * ALIGNMENT is chosen per open, not fixed. The design centers the panel on the avatar, which fits
 * there because the avatar is followed by a 199px "Create event" button — it sits ~270px from the
 * window edge, so half a 250px panel has room. In this header the avatar IS the last element, and
 * how much room it has depends on the viewport: on a wide screen the 1440px container is centered
 * and there is plenty, at exactly 1440 there is not.
 *
 * So the panel centers when it fits and pins its right edge to the avatar's when it doesn't. This
 * is measured rather than left to Radix's own collision handling, which SHIFTS the panel just far
 * enough to stay on screen — that lands it flush against the window edge at an arbitrary offset
 * from the trigger, which reads as a bug and moves as the window resizes.
 */
const MENU_WIDTH = 250;

/** Breathing room kept between the panel and the window edge when deciding whether it fits. */
const EDGE_PADDING = 16;

/**
 * 43px on phones, 48px (`size-12`) from `lg` up — the requested pair (2026-08-12). The breakpoint
 * is the header's own: everything else in it (height 70px → 88px, padding 16px → 70px) switches at
 * `lg`, so the avatar changing anywhere else would leave it mismatched against the bar it sits in.
 * Shared by the photo and the initial-letter fallback so the two can't drift apart.
 */
const AVATAR_SIZE_CLASSES = 'size-[43px] lg:size-12';
export function AccountMenu({
  username,
  accountType,
  avatarUrl,
  displayName,
  isVerified,
}: AccountMenuProps) {
  const t = useTranslations('nav.accountMenu');
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [align, setAlign] = useState<'center' | 'end'>('end');

  // Resolved as the menu opens, when the trigger's real position is known. Runs per open rather
  // than once, so a resized window is accounted for without a listener that would only ever
  // matter during the brief moment the menu is on screen.
  const handleOpenChange = (open: boolean) => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centered = rect.left + rect.width / 2 + MENU_WIDTH / 2;
    setAlign(centered > window.innerWidth - EDGE_PADDING ? 'end' : 'center');
  };

  // Same rule as the cabinet header's "View public profile": each account type has exactly one
  // canonical page, and both routes resolve the owner-preview banner themselves.
  const publicProfileHref =
    accountType === 'mindsetter' ? `/mindsetters/${username}` : `/members/${username}`;

  const handleSignOut = () => {
    startSignOut(async () => {
      const result = await signOut({});
      if (!result.ok) {
        console.error('[account-menu] sign-out failed:', result.error.message);
        return;
      }
      router.push('/');
      router.refresh();
    });
  };

  const avatar = (
    <AccountAvatar avatarUrl={avatarUrl} displayName={displayName} className="size-full" />
  );

  return (
    <>
      {/* Which surface opens is decided by CSS, not a `matchMedia` hook: both are rendered, and
          the hidden one's trigger is `display:none`, so it can't be opened. That avoids the
          hydration mismatch a width-measuring hook would introduce on a server-rendered header.
          The switch is at `lg`, matching the cabinet's own layout breakpoint — below it the
          sidebar is gone, so the sheet has to be the way in from exactly that width down. */}
      {/* `flex`, not the plain `block` these two wrappers used to be: the trigger inside each is
          an inline-block `<button>`, so it sat on the wrapper's text baseline and left descender
          space beneath itself — the wrapper measured 54px around a 48px avatar, and since the
          header centres the WRAPPER, the avatar rode ~3px above the bar's true centre. A flex
          container has no baseline to sit on, so the wrapper now hugs the button exactly. */}
      <div className="flex lg:hidden">
        <AccountSheet
          username={username}
          accountType={accountType}
          avatarUrl={avatarUrl}
          displayName={displayName}
          isVerified={isVerified}
          publicProfileHref={publicProfileHref}
          onSignOut={handleSignOut}
          isSigningOut={isSigningOut}
          trigger={
            <button
              type="button"
              aria-label={t('trigger', { name: displayName })}
              className={cn(AVATAR_SIZE_CLASSES, 'cursor-pointer rounded-full outline-none')}
            >
              {avatar}
            </button>
          }
        />
      </div>

      <div className="hidden lg:flex">
        <DropdownMenu onOpenChange={handleOpenChange}>
          {/* No focus ring, by request (2026-08-12): neither a custom one nor the browser default
              (`outline-none`). Worth knowing what this costs — a keyboard user now gets no visible
              signal that the avatar is focused, so reaching it by Tab is invisible until they open
              the menu. Everything else about keyboard operation is unaffected. */}
          <DropdownMenuTrigger
            ref={triggerRef}
            aria-label={t('trigger', { name: displayName })}
            className={cn(
              AVATAR_SIZE_CLASSES,
              'cursor-pointer rounded-full outline-none transition-opacity hover:opacity-90',
            )}
          >
            {avatar}
          </DropdownMenuTrigger>

          {/* `collisionPadding` is the last resort for a viewport too narrow even for the
              end-aligned panel; the `align` above is what normally decides. */}
          <DropdownMenuContent
            align={align}
            collisionPadding={EDGE_PADDING}
            // Inline width rather than a `w-[250px]` class so the value the layout uses and the
            // value the fits-or-not check above uses are literally the same constant.
            style={{ width: MENU_WIDTH }}
          >
            <DropdownMenuItem asChild>
              <Link href={publicProfileHref}>
                <MenuExternalIcon className="shrink-0 opacity-75" />
                {t('viewPublicProfile')}
              </Link>
            </DropdownMenuItem>

            {/* The desktop dropdown otherwise has no way into the cabinet's My Profile tab — the
                mobile sheet reaches it through its full nav list, this doesn't. */}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <EditPencilIcon className="size-[19px] shrink-0 opacity-75" />
                {t('editProfile')}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <MenuSettingsIcon className="shrink-0 opacity-75" />
                {t('settings')}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              // `onSelect` rather than `onClick`: it fires for Enter/Space as well as pointer,
              // which `onClick` on a `role="menuitem"` div would miss.
              onSelect={handleSignOut}
            >
              <MenuLogoutIcon className="shrink-0" />
              {isSigningOut ? t('signingOut') : t('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
