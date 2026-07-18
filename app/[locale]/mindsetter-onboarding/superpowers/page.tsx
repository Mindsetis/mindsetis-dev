import { Zap } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationStepHeader } from '@/components/auth/RegistrationStepHeader';
import { SuperpowersForm } from '@/components/mindsetter-onboarding/SuperpowersForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Superpower } from '@/lib/validation/mindsetter';

type SuperpowersPageProps = {
  params: Promise<{ locale: string }>;
};

const TOTAL_STEPS = 5;

/**
 * Extended Mindsetter onboarding — step 2/5 "Your superpowers"
 * (`docs/mindsetter-extended-onboarding.md` section 3). Mirrors the "Your roles" page
 * (`../roles/page.tsx`) exactly: same auth guard, `RegistrationStepHeader` chrome, and
 * already-saved-data prefill via `mindsetter_profiles`.
 *
 * `session`/`shine` steps don't exist yet — `SuperpowersForm`'s submit navigates to
 * `/mindsetter-onboarding/help`, which this same slice builds next.
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
      <RegistrationStepHeader
        backHref="/mindsetter-onboarding/roles"
        step={2}
        total={TOTAL_STEPS}
        label={t('common.stepLabel', { step: 2, total: TOTAL_STEPS })}
      />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-center gap-2">
          <Zap className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-display text-h1 text-foreground md:text-h3">
            {t('superpowers.title')}
          </h1>
        </div>

        <SuperpowersForm initialSuperpowers={initialSuperpowers} />
      </div>
    </div>
  );
}
