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
 */
export default async function DashboardIndexPage({ params }: DashboardIndexPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect({ href: '/dashboard/profile', locale });
}
