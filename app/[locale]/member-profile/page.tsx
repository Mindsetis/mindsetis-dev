import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import type { InterestOption } from '@/components/member-profile/InterestsPicker';
import { MemberProfileForm } from '@/components/member-profile/MemberProfileForm';
import { Link, redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import type { LanguageValue } from '@/lib/constants/languages';
import { createClient } from '@/lib/supabase/server';

/** Shape of `profiles.socials` (jsonb) as written by `saveMemberProfile`. */
type SocialsJson = {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  threads?: string;
  youtube?: string;
  website?: string;
};

type MemberProfilePageProps = {
  params: Promise<{ locale: string }>;
};

const TOTAL_STEPS = 4;

/**
 * Registration wizard step 2/4 — "Member profile" (Figma `71:452` mobile / `387:2142`
 * desktop). Reached right after sign-up (step 1, `app/[locale]/sign-up/page.tsx`); shares
 * that step's page shell (Back link + `RegistrationProgress` + centered `max-w-[640px]`
 * form column) rather than inventing a new layout.
 *
 * Requires a signed-in user (this writes to `profiles`/`profile_interests` for the caller) —
 * redirect to `/login` defends this at the page level; `middleware.ts` (`PROTECTED_PREFIXES`)
 * does the same before the page even renders.
 */
export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const session = await getSessionContext();
  // `profile` is only ever `null` here if the `handle_new_user` signup trigger somehow
  // didn't run — treat that the same as "not signed in" rather than crashing the page.
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  // Fetched together: the interests catalog (for the picker), this step's already-saved
  // `profiles` columns, and the caller's current `profile_interests` picks — all needed so a
  // user revisiting this page (Back, or before step 3 exists) sees their previously-submitted
  // data instead of a blank form (see `MemberProfileForm`'s `initial*` props).
  const [{ data: interestsData }, { data: profileData }, { data: profileInterestsData }] =
    await Promise.all([
      supabase
        .from('interests')
        .select('id, category, label, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('profiles')
        .select('country, city, bio, about, languages, avatar_url, socials')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase.from('profile_interests').select('interest_id').eq('profile_id', session.user.id),
    ]);
  const interests = (interestsData ?? []) as InterestOption[];
  const socials = (profileData?.socials ?? {}) as SocialsJson;
  const initialInterestIds = (profileInterestsData ?? []).map((row) => row.interest_id);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-16 lg:px-[70px]">
      {/* Same Back + progress-bar layout as sign-up's step 1 (see that page's comment for
          why Back is pinned to the logo's left edge on desktop but inline on mobile). */}
      <div className="relative mb-8 flex items-center gap-4 md:mb-12 md:justify-center">
        <Link
          href="/sign-up"
          className="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground hover:text-muted-foreground md:absolute md:top-1/2 md:left-0 md:-translate-y-1/2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('signUp.back')}
        </Link>

        <div className="w-full max-w-[640px] flex-1 md:flex-none">
          <RegistrationProgress
            step={2}
            total={TOTAL_STEPS}
            label={t('signUp.stepLabel', { step: 2, total: TOTAL_STEPS })}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t('memberProfile.title')}
        </h1>

        <MemberProfileForm
          interests={interests}
          initialUsername={session.profile.username}
          initialCountry={profileData?.country ?? undefined}
          initialCity={profileData?.city ?? undefined}
          initialLanguages={(profileData?.languages ?? undefined) as LanguageValue[] | undefined}
          initialBio={profileData?.bio ?? undefined}
          initialAbout={profileData?.about ?? undefined}
          initialInterestIds={initialInterestIds}
          initialAvatarUrl={profileData?.avatar_url ?? undefined}
          initialSocials={socials}
        />
      </div>
    </div>
  );
}
