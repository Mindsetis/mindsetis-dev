import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationProgress } from '@/components/auth/RegistrationProgress';
import type { InterestOption } from '@/components/member-profile/InterestsPicker';
import { MemberProfileForm } from '@/components/member-profile/MemberProfileForm';
import { Link, redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

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
  const { data: interestsData } = await supabase
    .from('interests')
    .select('id, category, label, sort_order')
    .order('sort_order', { ascending: true });
  const interests = (interestsData ?? []) as InterestOption[];

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

        <MemberProfileForm interests={interests} initialUsername={session.profile.username} />
      </div>
    </div>
  );
}
