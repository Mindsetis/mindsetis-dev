import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { ShineForm } from '@/components/mindsetter-onboarding/ShineForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import { computeProfileCompleteness } from '@/lib/mindsetter-onboarding/completeness';
import { createClient } from '@/lib/supabase/server';

type ShinePageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Extended Mindsetter onboarding — step 4/5 "Make your profile shine."
 * (`docs/mindsetter-extended-onboarding.md` section 6). Picks which of the 8 optional blocks
 * (section 6/7, including "Video blog" un-deferred back into MVP) the caller wants to fill in
 * now; the picked ones are handed to the first block screen via
 * `lib/mindsetter-onboarding/blocks.ts`'s query-param handoff rather than persisted here.
 *
 * Unlike the original order, "Personal session" is no longer the previous step — it's now the
 * LAST core step, reached either after the picked blocks run out (`nextBlockHref`) or directly
 * via "Skip" below (product decision D9). So this page's Back link points at `../help/page.tsx`,
 * and both "Continue fill"/"Skip" ultimately lead to `/mindsetter-onboarding/session`.
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth as
 * `../session/page.tsx`/`../help/page.tsx`.
 */
export default async function MindsetterOnboardingShinePage({ params }: ShinePageProps) {
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

  // Two independent reads (different tables), fetched in parallel rather than sequentially —
  // same convention as `../session/page.tsx`. Only the columns the completeness calc needs.
  const [{ data: mindsetterProfile }, { data: sessionSettings }] = await Promise.all([
    supabase
      .from('mindsetter_profiles')
      .select(
        'roles, superpowers, help_with, promo_video, numbers, reel_life, wins, my_way, fckups, philosophy, video_blog',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
    supabase
      .from('session_settings')
      .select('mindsetter_id')
      .eq('mindsetter_id', session.user.id)
      .maybeSingle(),
  ]);

  const completeness = computeProfileCompleteness(
    {
      roles: mindsetterProfile?.roles ?? null,
      superpowers: mindsetterProfile?.superpowers ?? null,
      helpWith: mindsetterProfile?.help_with ?? null,
      promoVideo: mindsetterProfile?.promo_video ?? null,
      numbers: mindsetterProfile?.numbers ?? null,
      reelLife: mindsetterProfile?.reel_life ?? null,
      wins: mindsetterProfile?.wins ?? null,
      myWay: mindsetterProfile?.my_way ?? null,
      fckups: mindsetterProfile?.fckups ?? null,
      philosophy: mindsetterProfile?.philosophy ?? null,
      videoBlog: mindsetterProfile?.video_blog ?? null,
    },
    { configured: sessionSettings != null },
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[100px]">
        <RegistrationBackLink href="/mindsetter-onboarding/help" label={tAuth('signUp.back')} />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h1 text-foreground md:text-h3">{t('shine.title')}</h1>
          <p className="text-base text-muted-foreground">{t('shine.subtitle')}</p>
        </div>

        <ShineForm completeness={completeness} />
      </div>
    </div>
  );
}
