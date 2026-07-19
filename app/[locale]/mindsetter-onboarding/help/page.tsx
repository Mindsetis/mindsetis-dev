import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { HelpSectionIcon } from '@/components/icons/onboarding-section-icons';
import { HelpForm } from '@/components/mindsetter-onboarding/HelpForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { Expertise } from '@/lib/validation/mindsetter';

type HelpPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Extended Mindsetter onboarding — step 3/5 "You can help with"
 * (`docs/mindsetter-extended-onboarding.md` section 4). Mirrors the "Your roles" page
 * (`../roles/page.tsx`) exactly: same auth guard, plain Back-link-only chrome (no step
 * indicator, product decision D5), and already-saved-data prefill via `mindsetter_profiles`.
 *
 * These card titles are the option source for the "Topics you're expert in" multiselect on the
 * "Personal session" step (doc section E.1, `../session/page.tsx`) — `help_with` is stored as a
 * plain flat array so that step can read titles straight off it. Personal session now runs AFTER
 * the "Shine" picker and any picked optional blocks (product decision D9), but it's still fed by
 * this step's data since Help still runs before it in the new order.
 *
 * `HelpForm`'s submit navigates to `/mindsetter-onboarding/shine` (step 4/5, `../shine/page.tsx`)
 * — NOT `/session` anymore (decision D9 moved Personal session to the last core step).
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth
 * as `../roles/page.tsx`.
 */
export default async function MindsetterOnboardingHelpPage({ params }: HelpPageProps) {
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
  // Already-saved expertise entries, so a user revisiting this step sees their previously-
  // submitted cards instead of a blank form (same `maybeSingle()` "no row yet" handling as
  // `roles/page.tsx`).
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('help_with')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialExpertise = (mindsetterProfile?.help_with ?? undefined) as Expertise[] | undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[28px]">
        <RegistrationBackLink
          href="/mindsetter-onboarding/superpowers"
          label={tAuth('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col">
        <div className="mb-4 flex items-center gap-2 md:mb-8 md:gap-4">
          <HelpSectionIcon className="size-7 md:size-10" />
          <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
            {t('help.title')}
          </h1>
        </div>

        <HelpForm initialExpertise={initialExpertise} />
      </div>
    </div>
  );
}
