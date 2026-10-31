import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';

type DashboardIndexPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Cabinet index → "My Profile". The sidebar's first item ("Overview", Figma `600:4022`) is not
 * built in this stage, and a placeholder screen for it would be an empty box the user has to click
 * past every time they open the cabinet. Redirecting to the one tab that exists is the smaller
 * lie (2026-08-10 product decision); when Overview ships, this file becomes that page.
 *
 * A fallback for a typed or bookmarked `/dashboard`, NOT a destination: everything the app sends a
 * signed-in user to (`CABINET_PATH` in `lib/auth/onboarding-progress.ts`, the login `redirectTo`)
 * already points at `/dashboard/profile`, so nobody is routed through this hop. The literal below
 * is deliberate — pointing it at `CABINET_PATH` would make it redirect to itself the day that
 * constant moves back to `/dashboard`.
 */
export default async function DashboardIndexPage({ params }: DashboardIndexPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect({ href: '/dashboard/profile', locale });
}
