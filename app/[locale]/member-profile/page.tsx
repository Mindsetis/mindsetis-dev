import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { MemberProfileForm } from '@/components/member-profile/MemberProfileForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import type { InterestValue } from '@/lib/constants/interests';
import { INTEREST_VALUES } from '@/lib/constants/interests';
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
 * Registration wizard step 3/4 — "Member profile" (Figma `71:452` mobile / `387:2142`
 * desktop). Reached right after email confirmation (step 2, `/verify-email`) — stage 1.5
 * renumbered the wizard to put the blocking confirmation gate second, right after sign-up,
 * before profile data collection; this step's URL/content are unchanged, only its position in
 * the sequence moved. Shares the wizard's page shell (Back link + `RegistrationProgress` +
 * centered `max-w-[640px]` form column) rather than inventing a new layout.
 *
 * Requires a signed-in user (this writes to `profiles` for the caller) — redirect to
 * `/login` defends this at the page level; `middleware.ts` (`PROTECTED_PREFIXES`) does the
 * same before the page even renders. By the time a visitor reaches this page, `/api/auth/confirm`
 * has already established a real, confirmed session (see that route's doc comment) — no change
 * needed to this guard itself, it already worked exactly this way.
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
  // This step's already-saved `profiles` columns, so a user revisiting this page (e.g. Back
  // from step 3) sees their previously-submitted data instead of a blank form (see
  // `MemberProfileForm`'s `initial*` props).
  const { data: profileData } = await supabase
    .from('profiles')
    .select('country, city, bio, about, languages, interests, avatar_url, socials')
    .eq('id', session.user.id)
    .maybeSingle();
  const socials = (profileData?.socials ?? {}) as SocialsJson;
  // Guard against a slug that's no longer in the code-defined catalog (e.g. a tag renamed
  // or removed from `lib/constants/interests.ts` after this profile saved it) — an unknown
  // slug would otherwise reach `memberProfileActionSchema`'s `z.enum(INTEREST_VALUES)` on
  // resubmission and block saving, with no chip visible in the picker to let the user drop it.
  const knownInterestValues = new Set<string>(INTEREST_VALUES);
  const initialInterestIds = ((profileData?.interests ?? []) as string[]).filter(
    (value): value is InterestValue => knownInterestValues.has(value),
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      {/* Same Back + progress-bar layout as sign-up's step 1 (see that page's comment for
          why Back is pinned to the logo's left edge on desktop but above it on mobile). */}
      <RegistrationStepHeader
        backHref="/verify-email"
        step={3}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 3, total: TOTAL_STEPS })}
      />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t('memberProfile.title')}
        </h1>

        <MemberProfileForm
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
