import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { SuperpowersSectionIcon } from '@/components/icons/onboarding-section-icons';
import { SuperpowersForm } from '@/components/mindsetter-onboarding/SuperpowersForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Superpower } from '@/lib/validation/mindsetter';

type SuperpowersPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Extended Mindsetter onboarding — step 2/5 "Your superpowers"
 * (`docs/mindsetter-extended-onboarding.md` section 3). Mirrors the "Your roles" page
 * (`../roles/page.tsx`) exactly: same auth guard, plain Back-link-only chrome (no step
 * indicator, product decision D5), and already-saved-data prefill via `mindsetter_profiles`.
 *
 * `SuperpowersForm`'s submit navigates to `/mindsetter-onboarding/help`.
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth
 * as `../roles/page.tsx`.
 */
export default async function MindsetterOnboardingSuperpowersPage({
  params,
}: SuperpowersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mindsetterOnboarding');
  const tAuth = await getTranslations('auth');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  // Already-saved superpowers, so a user revisiting this step sees their previously-submitted
  // cards instead of a blank form (same `maybeSingle()` "no row yet" handling as `roles/page.tsx`).
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('superpowers')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialSuperpowers = (mindsetterProfile?.superpowers ?? undefined) as
    Superpower[] | undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[28px]">
        <RegistrationBackLink
          href="/mindsetter-onboarding/roles"
          label={tAuth('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col">
        <div className="mb-4 flex items-center gap-2 md:mb-8 md:gap-4">
          <SuperpowersSectionIcon className="size-7 md:size-10" />
          <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
            {t('superpowers.title')}
          </h1>
        </div>

        <SuperpowersForm initialSuperpowers={initialSuperpowers} />
      </div>
    </div>
  );
}
