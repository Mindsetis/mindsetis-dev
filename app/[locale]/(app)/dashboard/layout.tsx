import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CabinetHeader } from '@/components/dashboard/CabinetHeader';
import { CabinetSidebar } from '@/components/dashboard/CabinetSidebar';
import { redirect } from '@/i18n/navigation';
import { loadCabinetProfile } from '@/lib/profile/cabinet';

type DashboardLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Cabinet shell (spec §5.3, Figma page "Admin Panel" — despite the name, those frames are the
 * USER's cabinet, not the staff back-office, which lives under `/admin`).
 *
 * Layout rather than per-page composition because the sidebar and the header card repeat on every
 * cabinet screen, including each `/dashboard/profile/*` section editor (confirmed against the Hero
 * detail frame `613:4445`, which shows both).
 *
 * Auth: `middleware.ts` already gates `/dashboard` via `PROTECTED_PREFIXES`; the redirect here is
 * the same defense-in-depth every other authenticated route carries. Note this shell is available
 * to Members and Mindsetters alike — the cabinet is not a Mindsetter-only feature; only the
 * MINDSETTER sidebar group and the Mindsetter-only profile sections vary by `account_type`.
 *
 * Mobile (Figma "Mobile - 375", delivered 2026-08-12): there is NO cabinet sidebar below `lg` —
 * not collapsed, not a burger, simply absent. Navigation moves entirely into the header avatar's
 * sheet (`components/layout/AccountSheet.tsx`), which is why this hides the `aside` outright
 * rather than stacking it above the content as the previous placeholder layout did.
 */
export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cabinet = await loadCabinetProfile();
  if (!cabinet) {
    redirect({ href: '/login', locale });
    return null;
  }

  return (
    <div
      // Pure CSS hook, not a styling class — read by `app/styles/base.css`'s
      // `main:has([data-cabinet-shell]) + footer` rule, which squares off the site Footer's
      // top-left corner on cabinet pages (see that rule's own comment for why).
      data-cabinet-shell=""
      // `lg:gap-5` (20px, 2026-08-10): the gap between the sidebar column and the content
      // column — distinct from `pr-5` inside `CabinetSidebar`'s own `<nav>`, which is internal
      // breathing room within the sidebar column itself, not this structural gap.
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-20 sm:px-6 lg:flex-row lg:gap-5 lg:px-[70px] lg:pb-[100px]"
    >
      {/* `lg:self-stretch` (the flex row's own default `items-stretch`, no longer overridden by
          `h-fit`) makes this column as tall as the content column beside it, so the full-bleed
          background below covers the whole row, not just the nav's own content height. */}
      <aside className="relative hidden w-full shrink-0 lg:block lg:w-[300px] lg:self-stretch">
        {/* Full-bleed #1a1a1a (`bg-card`): the sidebar column PLUS everything to its left, out
            to the browser window's edge — not just up to this centered `max-w-[1440px]`
            container. `-left-[100vw]` overshoots past the viewport on any realistic window
            width; `body` already carries `overflow-x-hidden` (`app/[locale]/layout.tsx`), so
            this never introduces a horizontal scrollbar. `right-0` stops it exactly at this
            column's own right edge, so it doesn't bleed under the content column too.
            `border-[#2a2a2a]` is arbitrary rather than a `colors.css` token — this one-off
            divider line isn't part of the documented token set, unlike `bg-card` below it.

            `-bottom-[100px]` (rather than `bottom-0`) is deliberate: `aside`'s own bottom edge
            is the ROW's bottom (it's exactly as tall as the content column, via
            `lg:self-stretch`), but the outer container adds `lg:pb-[100px]` AFTER that row
            before the page ends. Stopping at `bottom-0` left that padding strip black instead
            of #1a1a1a. Extending 100px past `aside`'s own bottom reaches exactly the outer
            container's true bottom edge — i.e. all the way down to where the site Footer
            begins — matching the container's own `lg:pb-[100px]` value 1:1. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 -bottom-[100px] -left-[100vw] right-0 hidden border-t border-[#2a2a2a] bg-card lg:block"
        />
        {/* `lg:top-[112px]` = the site Header's own `lg:h-[88px]` (`components/layout/Header.tsx`,
            itself `sticky top-0`) plus the same 24px gap the header keeps below it elsewhere on
            the page. Without this offset the sidebar stuck at a flat `top-6` (24px) and slid
            UNDER the header while scrolling — the header's `sticky top-0` pins it at 0-88px, so
            anything sticking at 24px ends up behind it during scroll. */}
        <div className="relative lg:sticky lg:top-[112px]">
          <CabinetSidebar accountType={cabinet.accountType} />
        </div>
      </aside>

      {/* `lg:pt-10` (40px, 2026-08-10): top offset of the content column itself. `gap-8` (32px) is
          the space below `CabinetHeader` before the page's own content — the column has only these
          two children, so the flex `gap` alone gives that spacing precisely, and it matches the
          mobile frame's own 32px between the header card and "Your profile". Mobile's own `pt-4`
          is the 16px the frame leaves between the site header and the card. */}
      <div className="flex min-w-0 flex-1 flex-col gap-8 pt-4 lg:pt-10">
        <CabinetHeader
          accountType={cabinet.accountType}
          username={cabinet.username}
          fullName={cabinet.fullName}
          lastName={cabinet.lastName}
          avatarUrl={cabinet.avatarUrl}
          isVerified={cabinet.isVerified}
          completeness={cabinet.completeness}
        />

        {children}
      </div>
    </div>
  );
}
