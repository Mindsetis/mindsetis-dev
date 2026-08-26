'use client';

import { BadgeCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { MenuExternalIcon, MenuLogoutIcon } from '@/components/icons/account-menu-icons';
import {
  BookingsIcon,
  CabinetSettingsIcon,
  EarningsIcon,
  MyProfileIcon,
  OverviewIcon,
  SessionsSetupIcon,
} from '@/components/icons/cabinet-nav-icons';
import { AccountAvatar } from '@/components/layout/AccountAvatar';
import {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type AccountSheetProps = {
  username: string;
  accountType: 'member' | 'mindsetter';
  avatarUrl: string | null;
  displayName: string;
  isVerified: boolean;
  publicProfileHref: string;
  onSignOut: () => void;
  isSigningOut: boolean;
  /** The avatar button; rendered as the sheet's trigger. */
  trigger: ReactNode;
};

/**
 * One row: 54px tall, 16px padding, 21px icon, 16px/500 label — the design's own metrics.
 *
 * `icon` is a rendered element rather than a component type: the cabinet nav icons need
 * `active` (their rest state bakes a dimmed `<g opacity>` into the SVG, which CSS can't lift)
 * while the account-menu icons have no such prop, and passing one to the other would leak an
 * unknown attribute onto the DOM.
 */
function SheetRow({
  icon,
  label,
  href,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const t = useTranslations('common');

  const className = cn(
    'flex h-[54px] w-full items-center gap-3 px-4 text-base font-medium transition-colors',
    destructive ? 'text-destructive' : 'text-foreground',
    disabled ? 'cursor-default text-muted-foreground' : 'active:bg-white/[0.06]',
  );

  const content = (
    <>
      <span className={cn('flex shrink-0 items-center', disabled && 'opacity-45')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {/* On the desktop sidebar an unbuilt item explains itself through a hover tooltip
          (`ComingSoon`). Hover doesn't exist here, and a tooltip that needs a long-press is a
          label nobody finds — so the same message is spelled out inline instead. */}
      {disabled ? (
        <span className="shrink-0 text-tiny text-muted-foreground">{t('comingSoon')}</span>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
  }

  if (href) {
    return (
      <DialogClose asChild>
        <Link href={href} className={className}>
          {content}
        </Link>
      </DialogClose>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Divider() {
  return <div aria-hidden="true" className="mx-4 my-2 h-px bg-[#2a2a2a]" />;
}

/** 21×21 per the design — the cabinet nav icons are natively 24, the menu icons natively 19. */
const NAV_ICON = 'size-[21px] shrink-0';

/**
 * Mobile cabinet navigation (Figma `1000:8210` / `1004:8011`, "Mobile - 375").
 *
 * The mobile design has NO cabinet sidebar at all — no burger, no tabs, no bottom bar. Tapping the
 * header avatar opens this sheet, and it is the only way to move between cabinet sections on a
 * phone, which is why it lists all six of them rather than the three the desktop dropdown shows.
 *
 * Four of those six have no page yet (Overview, Bookings, Sessions Setup, Earnings); they render
 * inert with a "Coming soon" label, mirroring the desktop sidebar's treatment. The design also
 * draws a "5" count badge on Bookings — that is mock data with nothing behind it, so it is left
 * out rather than hardcoded.
 *
 * Built on `Dialog` (not `DropdownMenu`): this is a modal surface with a scrim and its own close
 * button, and it needs the focus trap Dialog gives.
 */
export function AccountSheet({
  avatarUrl,
  displayName,
  accountType,
  isVerified,
  publicProfileHref,
  onSignOut,
  isSigningOut,
  trigger,
}: AccountSheetProps) {
  const t = useTranslations('nav.accountMenu');
  const tNav = useTranslations('dashboard.nav');
  const tHeader = useTranslations('dashboard.header');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      {/* Bottom-anchored, full-width, rounded top corners only — `DialogContent`'s own centered
          modal geometry is fully overridden here. `max-h-[86vh]` matches the design's 577-of-667
          proportion while staying safe on shorter screens; the nav list scrolls if it must. */}
      <DialogContent
        showCloseButton={false}
        className="top-auto bottom-0 left-0 flex max-h-[86vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-[20px] rounded-b-none border-0 bg-card p-0 py-6 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
      >
        <DialogTitle className="sr-only">{t('sheetTitle')}</DialogTitle>

        <div className="flex items-center gap-3 px-4 pb-3">
          <AccountAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            className="size-12 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="truncate text-base font-bold text-foreground">{displayName}</span>
            {isVerified ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-success px-2 py-0.5 text-tiny text-success">
                <BadgeCheck className="size-4 shrink-0" aria-hidden="true" />
                {tHeader('verified')}
              </span>
            ) : null}
          </div>
          <DialogCloseButton label={t('closeSheet')} className="ml-auto" />
        </div>

        <Divider />

        <div className="flex flex-col overflow-y-auto">
          <SheetRow
            icon={<OverviewIcon active className={NAV_ICON} />}
            label={tNav('items.overview')}
            disabled
          />
          <SheetRow
            icon={<MyProfileIcon active className={NAV_ICON} />}
            label={tNav('items.myProfile')}
            href="/dashboard/profile"
          />
          <SheetRow
            icon={<BookingsIcon active className={NAV_ICON} />}
            label={tNav('items.bookings')}
            disabled
          />
          {accountType === 'mindsetter' ? (
            <>
              <SheetRow
                icon={<SessionsSetupIcon active className={NAV_ICON} />}
                label={tNav('items.sessionsSetup')}
                href="/dashboard/sessions"
              />
              <SheetRow
                icon={<EarningsIcon active className={NAV_ICON} />}
                label={tNav('items.earnings')}
                disabled
              />
            </>
          ) : null}
          <SheetRow
            icon={<CabinetSettingsIcon active className={NAV_ICON} />}
            label={tNav('items.settings')}
            href="/dashboard/settings"
          />

          <Divider />

          <SheetRow
            icon={<MenuExternalIcon className={NAV_ICON} />}
            label={t('viewPublicProfile')}
            href={publicProfileHref}
          />
          <SheetRow
            icon={<MenuLogoutIcon className={NAV_ICON} />}
            label={isSigningOut ? t('signingOut') : t('logOut')}
            onClick={onSignOut}
            destructive
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
