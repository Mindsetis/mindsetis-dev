'use client';

import { BadgeCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
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
  DialogCloseButton,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NotYetAvailable, type NotYetAvailableFeature } from '@/components/ui/not-yet-available';
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
type SheetRowBaseProps = {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  /** Set together with `disabled`: which unbuilt feature this row leads to. */
  feature?: NotYetAvailableFeature;
  destructive?: boolean;
};

/**
 * A navigating row and a plain-click row take different, MUTUALLY EXCLUSIVE required props — a
 * union (not one flat object with everything optional) so forgetting `closeSheet` on an `href`
 * row is a compile error, not a click that silently leaves the sheet open behind the "unsaved
 * changes" dialog (Release-1 C-continuation follow-up, 2026-09-19). `closeSheet` closes the sheet
 * on click, same as the `DialogClose` wrapper this row used before that pass — handled explicitly
 * now instead, because that wrapper's automatic close fired unconditionally, and the row needs the
 * click to sometimes NOT navigate (a dirty section editor opens the confirmation dialog instead,
 * via `GuardedLink`'s own `preventDefault`), while still closing the sheet either way.
 */
type SheetRowProps = SheetRowBaseProps &
  (
    | { href: string; closeSheet: () => void; onClick?: undefined }
    | { href?: undefined; onClick?: () => void; closeSheet?: undefined }
  );

function SheetRow({
  icon,
  label,
  href,
  onClick,
  disabled,
  feature,
  destructive,
  closeSheet,
}: SheetRowProps) {
  const className = cn(
    'flex h-[54px] w-full items-center gap-3 px-4 text-base font-medium transition-colors',
    destructive ? 'text-destructive' : 'text-foreground',
    disabled ? 'cursor-default text-muted-foreground' : 'active:bg-white/[0.06]',
  );

  const content = (
    <>
      <span className={cn('flex shrink-0 items-center', disabled && 'opacity-45')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {/* The inline "Coming soon" label is gone: tapping the row now opens the same explanation
          the desktop sidebar shows (Release-1 B1). That also retires the reason this label
          existed — the old desktop affordance was a hover tooltip, which a touch screen never
          reveals; a dialog opens on tap like anything else. */}
    </>
  );

  if (disabled) {
    const row = (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    );
    return feature ? (
      <NotYetAvailable feature={feature} className="w-full">
        {row}
      </NotYetAvailable>
    ) : (
      row
    );
  }

  if (href) {
    return (
      <GuardedLink href={href} className={className} onClick={closeSheet}>
        {content}
      </GuardedLink>
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
 * Three of those six have no page yet (Overview, Bookings, Earnings); they render inert, and
 * tapping one explains what that section will do (`NotYetAvailable`), mirroring the desktop
 * sidebar's treatment. The design also draws a "5" count badge on Bookings — that is mock data
 * with nothing behind it, so it is left out rather than hardcoded.
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
  const { guard } = useUnsavedChanges();
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

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
            feature="overview"
          />
          <SheetRow
            icon={<MyProfileIcon active className={NAV_ICON} />}
            label={tNav('items.myProfile')}
            href="/dashboard/profile"
            closeSheet={closeSheet}
          />
          <SheetRow
            icon={<BookingsIcon active className={NAV_ICON} />}
            label={tNav('items.bookings')}
            disabled
            feature="bookings"
          />
          {accountType === 'mindsetter' ? (
            <>
              <SheetRow
                icon={<SessionsSetupIcon active className={NAV_ICON} />}
                label={tNav('items.sessionsSetup')}
                href="/dashboard/sessions"
                closeSheet={closeSheet}
              />
              <SheetRow
                icon={<EarningsIcon active className={NAV_ICON} />}
                label={tNav('items.earnings')}
                disabled
                feature="earnings"
              />
            </>
          ) : null}
          <SheetRow
            icon={<CabinetSettingsIcon active className={NAV_ICON} />}
            label={tNav('items.settings')}
            href="/dashboard/settings"
            closeSheet={closeSheet}
          />

          <Divider />

          <SheetRow
            icon={<MenuExternalIcon className={NAV_ICON} />}
            label={t('viewPublicProfile')}
            href={publicProfileHref}
            closeSheet={closeSheet}
          />
          <SheetRow
            icon={<MenuLogoutIcon className={NAV_ICON} />}
            label={isSigningOut ? t('signingOut') : t('logOut')}
            // Routed through `guard` (Release-1 C-continuation, 2026-09-19) — signing out is
            // also a way off a dirty section editor.
            onClick={() => guard(onSignOut)}
            destructive
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
