import { setRequestLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';

type OwnPublicProfilePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * `OWN_PUBLIC_PROFILE_HREF` (`lib/profile/return-to-profile.ts`): sends the signed-in user to their
 * own public page — `/mindsetters/<username>` for a Mindsetter, `/members/<username>` for a Member.
 * Lets client code that only knows "back to my profile" (a cabinet editor saving after the public
 * profile's "Edit", Release 4 П2) get there without carrying the username itself. Never rendered.
 */
export default async function OwnPublicProfilePage({ params }: OwnPublicProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const { username, account_type: accountType } = session.profile;
  redirect({
    href: accountType === 'mindsetter' ? `/mindsetters/${username}` : `/members/${username}`,
    locale,
  });
  return null;
}
