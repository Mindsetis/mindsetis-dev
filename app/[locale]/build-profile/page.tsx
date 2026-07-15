import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import { BuildProfileForm } from '@/components/build-profile/BuildProfileForm';
import { Link, redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

type BuildProfilePageProps = {
  params: Promise<{ locale: string }>;
};

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
    .select('company, role, industry')
    .eq('id', session.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-16 lg:px-[70px]">
      <div className="relative mb-8 flex items-center gap-4 md:mb-12 md:justify-center">
        <Link
          href="/member-profile"
          className="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground hover:text-muted-foreground md:absolute md:top-1/2 md:left-0 md:-translate-y-1/2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('signUp.back')}
        </Link>

        <div className="w-full max-w-[640px] flex-1 md:flex-none">
          <RegistrationProgress
            step={4}
            total={TOTAL_STEPS}
            label={t('signUp.stepLabel', { step: 4, total: TOTAL_STEPS })}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <h1 className="font-display text-h1 text-foreground md:text-h3">
          {t('buildProfile.title')}
        </h1>

        <BuildProfileForm
          initialCompany={profileData?.company ?? undefined}
          initialRole={profileData?.role ?? undefined}
          initialIndustry={profileData?.industry ?? undefined}
        />
      </div>
    </div>
  );
}
