'use client';

import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import {
  BookingsIcon,
  CabinetSettingsIcon,
  EarningsIcon,
  MyProfileIcon,
  type NavIconProps,
  OverviewIcon,
  SessionsSetupIcon,
} from '@/components/icons/cabinet-nav-icons';
import { NotYetAvailable, type NotYetAvailableFeature } from '@/components/ui/not-yet-available';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Cabinet left navigation — Figma `600:4022` (Mindsetter) / `708:9017` (Member), the sidebar
 * shared by every cabinet screen.
 *
 * "My Profile" and "Settings" are real destinations; every other item is rendered but inert,
 * wrapped in `NotYetAvailable` (dimmed, and tapping it explains the feature) rather than hidden. That's deliberate:
 * the sidebar is the map of the cabinet, and a map with most of its entries missing reads as a
 * broken build rather than an unfinished one. Same precedent as `WelcomeCtas`, which switched
 * dead `<Link href="/">` CTAs to disabled + `NotYetAvailable` for exactly this reason.
 *
 * The MINDSETTER group (Sessions Setup, Earnings) is hidden entirely for a Member — it isn't
 * "coming soon" for them, it will never apply. Matches the Member frame, which has no such group.
 */
export type CabinetSidebarProps = {
  accountType: 'member' | 'mindsetter';
};

/**
 * One inert nav row — same geometry as the live `My Profile` row, minus the interaction.
 *
 * No wrapping `opacity` utility on the row: each `Icon` already bakes in its own rest-state
 * opacity (`cabinet-nav-icons.tsx`, 0.55/0.45 per the designer's export), and stacking an
 * outer opacity on top would double-dim it below the designed value. The label's own
 * `text-muted-foreground` color already reads as secondary/disabled without needing that.
 */
function NotYetAvailableItem({
  icon: Icon,
  label,
  feature,
}: {
  icon: ComponentType<NavIconProps>;
  label: string;
  /** Which section this row leads to once it exists — picks the explanation in the dialog. */
  feature: NotYetAvailableFeature;
}) {
  return (
    <NotYetAvailable feature={feature} className="w-full">
      <span
        aria-disabled="true"
        className="flex w-full items-center gap-3 rounded-[10px] px-4 py-[14px] text-base font-normal text-muted-foreground"
      >
        <Icon className="size-6 shrink-0" />
        {label}
      </span>
    </NotYetAvailable>
  );
}

/** Uppercase group heading ("CABINET" / "MINDSETTER" / "ACCOUNT"). Figma text style
 * `micro spacing (PC)` — 11px bold with wide tracking. No left padding (flush with the sidebar's
 * own edge, unlike the rows below it, which need their own `px-4` for the active/hover pill
 * background) — `pb-2.5` (10px) below it, per the 2026-08-10 spacing pass. */
function GroupLabel({ children }: { children: string }) {
  return (
    <p className="pr-4 pb-2.5 text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/**
 * One live nav row. `relative` + the conditional bar span implement the active-row left accent
 * (2026-08-10: 3px × 22px, 2px radius, `bg-primary` == the design's #79b9e3). The `group` class is
 * what lets an icon's `group-hover:opacity-100` (rest state dimmed to 0.45) react to hovering
 * anywhere on the row — a bare `:hover` on the icon itself never could.
 */
function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: ComponentType<NavIconProps>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-[10px] px-4 py-[14px] text-base font-normal transition-colors',
        active
          ? 'bg-[#2a2a2a] text-primary'
          : 'text-foreground hover:bg-white/[0.04] hover:text-foreground',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-[22px] w-[3px] -translate-y-1/2 rounded-[2px] bg-primary"
        />
      )}
      <Icon active={active} className="size-6 shrink-0" />
      {label}
    </Link>
  );
}

export function CabinetSidebar({ accountType }: CabinetSidebarProps) {
  const t = useTranslations('dashboard.nav');
  const pathname = usePathname();

  // `usePathname` from `@/i18n/navigation` already returns the locale-STRIPPED path, so this
  // compares against the bare route. Every `/dashboard/profile/*` section editor keeps the
  // "My Profile" row active — the section detail is still that tab, just a level deeper.
  const isProfileActive =
    pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/profile/');

  return (
    // `pr-5` (20px): breathing room between the nav's own content and the sidebar column's
    // right edge, so labels/icons don't run flush up against the gap to the content column.
    // `gap-5` (20px, 2026-08-10): spacing between the CABINET / MINDSETTER / ACCOUNT blocks —
    // distinct from each block's own inner `gap-0.5` between its rows.
    <nav aria-label={t('ariaLabel')} className="flex w-full flex-col gap-5 py-6 pr-5">
      <div className="flex flex-col gap-0.5">
        <GroupLabel>{t('groups.cabinet')}</GroupLabel>
        <NotYetAvailableItem icon={OverviewIcon} label={t('items.overview')} feature="overview" />

        <NavItem
          href="/dashboard/profile"
          icon={MyProfileIcon}
          label={t('items.myProfile')}
          active={isProfileActive}
        />

        <NotYetAvailableItem icon={BookingsIcon} label={t('items.bookings')} feature="bookings" />
      </div>

      {accountType === 'mindsetter' && (
        <div className="flex flex-col gap-0.5">
          <GroupLabel>{t('groups.mindsetter')}</GroupLabel>
          <NavItem
            href="/dashboard/sessions"
            icon={SessionsSetupIcon}
            label={t('items.sessionsSetup')}
            active={pathname === '/dashboard/sessions'}
          />
          <NotYetAvailableItem icon={EarningsIcon} label={t('items.earnings')} feature="earnings" />
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        <GroupLabel>{t('groups.account')}</GroupLabel>
        <NavItem
          href="/dashboard/settings"
          icon={CabinetSettingsIcon}
          label={t('items.settings')}
          active={pathname === '/dashboard/settings'}
        />
      </div>
    </nav>
  );
}
