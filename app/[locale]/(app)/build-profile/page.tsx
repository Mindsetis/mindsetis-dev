import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { BuildProfileForm } from '@/components/build-profile/BuildProfileForm';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

type BuildProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: BuildProfilePageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'auth', 'buildProfile.title');
}

const TOTAL_STEPS = 4;

/**
 * Registration wizard step 4/4 — "What do you build?" (Figma "Member profile 3/4"). Reached
 * right after step 3 (`/member-profile`); shares that step's page shell (Back link +
 * `RegistrationProgress` + centered `max-w-[640px]` form column). Now the wizard's LAST step
 * (stage 1.5 renumbered email verification to step 2, `/verify-email` — see that page's doc
 * comment) — completing this form moves on to the Congrats screen (`/welcome`), not back to
 * verification (see `BuildProfileForm.tsx`'s submit handler).
 *
 * Requires a signed-in user (this writes to `profiles` for the caller), same defense-in-depth
 * as `/member-profile`: page-level redirect here, `middleware.ts` (`PROTECTED_PREFIXES`)
 * before the page even renders, and `requireUser()` in the Server Action.
 */
export default async function BuildProfilePage({ params }: BuildProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  // Already-saved step-3 columns, so a user revisiting this page (Back) sees their
  // previously-submitted data instead of a blank form — same precedent as `/member-profile`.
  const { data: profileData } = await supabase
    .from('profiles')
    .select('company, role, industries, industry_custom')
    .eq('id', session.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <RegistrationStepHeader
        backHref="/member-profile"
        step={4}
        total={TOTAL_STEPS}
        label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
      />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t('buildProfile.title')}
        </h1>

        <BuildProfileForm
          initialCompany={profileData?.company ?? undefined}
          initialRole={profileData?.role ?? undefined}
          initialIndustries={profileData?.industries ?? undefined}
          initialIndustryCustom={profileData?.industry_custom ?? undefined}
        />
      </div>
    </div>
  );
}
