import { setRequestLocale } from 'next-intl/server';

import { finalizeMindsetterOnboarding } from '@/app/[locale]/(app)/mindsetter-onboarding/actions';
import { ShineForm } from '@/components/mindsetter-onboarding/ShineForm';
import { OnboardingBack } from '@/components/mindsetter-onboarding/StepActions';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';
import { parseBlocksParam } from '@/lib/mindsetter-onboarding/blocks';
import { computeProfileCompleteness } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type ShinePageProps = {
  params: Promise<{ locale: string }>;
  /** `?blocks=` — the ticks handed back by the profile preview's "← Back to setup" (Release 4 П2). */
  searchParams: Promise<{ blocks?: string | string[] }>;
};

export async function generateMetadata({ params }: ShinePageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'mindsetterOnboarding', 'shine.title');
}

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
export default async function MindsetterOnboardingShinePage({
  params,
  searchParams,
}: ShinePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { blocks: initialSelected } = parseBlocksParam(await searchParams);

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  // The profile preview needs a Mindsetter page to exist. Saving Help promotes the caller
  // (Release 4 П1), so this is normally already true; someone who saved Help on an older build is
  // promoted here by the same guarded, idempotent action `/congrats` runs on load — it refuses
  // (`finalized: false`) when a required step's data is missing, and then the button stays hidden.
  let canPreview = session.profile.account_type === 'mindsetter';
  if (!canPreview) {
    const finalized = await finalizeMindsetterOnboarding({});
    canPreview = finalized.ok && finalized.data.finalized;
  }

  const supabase = await createClient();

  // Two independent reads (different tables), fetched in parallel rather than sequentially —
  // same convention as `../session/page.tsx`. Only the columns the completeness calc needs.
  const [{ data: profile }, { data: mindsetterProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'full_name, last_name, username, avatar_url, country_code, city_geoname_id, languages, bio, company, role, industries, industry_custom, socials',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
    supabase
      .from('mindsetter_profiles')
      .select(
        'roles, superpowers, help_with, promo_video, numbers, reel_life, wins, my_way, fckups, philosophy, video_blog',
      )
      .eq('id', session.user.id)
      .maybeSingle(),
  ]);

  // `'mindsetter'` is passed explicitly rather than read from `profiles.account_type`: the caller
  // is standing inside the Mindsetter wizard, and a caller whose promotion was refused above (a
  // required step's data missing) is still a Member, so reading it here would score this screen
  // against the two-section Member set. The argument selects the section SET, not rights.
  const completeness = computeProfileCompleteness(
    'mindsetter',
    {
      fullName: profile?.full_name ?? null,
      lastName: profile?.last_name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      countryCode: profile?.country_code ?? null,
      cityGeonameId: profile?.city_geoname_id ?? null,
      languages: profile?.languages ?? null,
      bio: profile?.bio ?? null,
      company: profile?.company ?? null,
      role: profile?.role ?? null,
      industries: profile?.industries ?? null,
      industryCustom: profile?.industry_custom ?? null,
      socials: profile?.socials ?? null,
    },
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
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      {/* The band the top-left Back used to occupy, kept empty so the heading lines up with the
          other steps: Back sits in the form's bottom row, pinned next to "Save and continue"
          (`OnboardingBack`, owner's call of 31.10.2026). When the profile preview button shows
          (Release 4 П1) it takes this slot instead, above the heading — `ShineForm` renders both,
          because the button's link carries the blocks ticked in that form. */}
      {canPreview ? null : <div aria-hidden="true" className="h-14 md:h-[52px]" />}

      <div className="mx-auto flex w-full max-w-[640px] flex-col">
        <OnboardingBack href="/mindsetter-onboarding/help">
          <ShineForm
            completeness={completeness}
            initialSelected={initialSelected}
            previewUsername={canPreview ? session.profile.username : null}
          />
        </OnboardingBack>
      </div>
    </div>
  );
}
