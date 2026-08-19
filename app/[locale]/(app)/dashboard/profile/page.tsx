import { getTranslations, setRequestLocale } from 'next-intl/server';

import { MemberProfileView } from '@/components/profile/MemberProfileView';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

type DashboardProfilePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * "Member Profile" self-view (Figma `401:6375`) — the owner previewing their own profile
 * exactly as it will appear to visitors, plus a preview banner + static Edit/Share CTAs. Same
 * guard precedent as `/member-profile` and `/build-profile`: `getSessionContext()` redirect
 * here, `middleware.ts` (`PROTECTED_PREFIXES` already includes `/dashboard`) before the page
 * even renders.
 *
 * Renders the same `MemberProfileView` as the public `/members/[username]` route
 * (`variant="preview"` here vs `"public"` there) — the two Figma frames are structurally
 * identical below the banner, so this stays one shared component rather than a duplicated
 * layout.
 */
export default async function DashboardProfilePage({ params }: DashboardProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('profile');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  // Explicit column allow-list, never `select('*')` — see `MemberProfile` in
  // `MemberProfileView.tsx` for the exact shape this screen renders.
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'username, full_name, last_name, avatar_url, bio, about, role, industry, company, country, city, languages, interests, socials, verification_status',
    )
    .eq('id', session.user.id)
    .maybeSingle();

  // `session.profile` already confirmed this row exists (same trigger-based guarantee as
  // `/member-profile`'s doc comment) — this is just satisfying the type checker.
  if (!profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  return (
    <MemberProfileView
      profile={profile}
      variant="preview"
      labels={{
        bannerHighlight: t('banner.highlight'),
        bannerRest: t('banner.rest'),
        editProfile: t('editProfile'),
        shareProfile: t('shareProfile'),
        verified: t('verified'),
        inviteToEvent: t('inviteToEvent'),
        aboutEyebrow: t('aboutEyebrow'),
        beyondBusinessEyebrow: t('beyondBusinessEyebrow'),
        beyondBusinessHeading: t('beyondBusinessHeading'),
        website: t('website'),
      }}
    />
  );
}
