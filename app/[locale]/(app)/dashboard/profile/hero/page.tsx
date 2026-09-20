import { getTranslations, setRequestLocale } from 'next-intl/server';

import { HeroForm } from '@/components/dashboard/HeroForm';
import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import type { IndustryValue } from '@/lib/constants/industries';
import { INDUSTRY_VALUES } from '@/lib/constants/industries';
import type { InterestValue } from '@/lib/constants/interests';
import { INTEREST_VALUES } from '@/lib/constants/interests';
import type { LanguageValue } from '@/lib/constants/languages';
import { listCountries } from '@/lib/geo/countries';
import { loadCabinetProfile } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.hero');
}

/**
 * Cabinet → My Profile → "Hero" section editor (Figma `613:4445`). Available to Members and
 * Mindsetters alike — it edits the shared `profiles` columns both account types have.
 *
 * Prefill mirrors `/member-profile`'s: the saved city is rebuilt from the profile's own
 * denormalized snapshot + codes so the picker shows it immediately instead of blanking until the
 * user searches again, and unknown interest slugs (a tag removed from the catalog after this
 * profile saved it) are dropped so they can't block resubmission from a chip that isn't rendered.
 */
export default async function DashboardHeroSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.hero');

  const cabinet = await loadCabinetProfile();
  if (!cabinet) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, last_name, username, country, city, country_code, region_code, region_name, city_geoname_id, timezone, bio, about, languages, interests, avatar_url, company, role, industry',
    )
    .eq('id', cabinet.userId)
    .maybeSingle();

  // Small, stable reference data — one server query beats a client round-trip on mount. Cities
  // stay a remote search (170k rows), see `CityCombobox`.
  const countries = await listCountries();

  const initialCity =
    profile?.city_geoname_id && profile.city && profile.country_code
      ? {
          geonameId: profile.city_geoname_id,
          name: profile.city,
          regionCode: profile.region_code,
          regionName: profile.region_name,
          countryCode: profile.country_code,
          timezone: profile.timezone,
        }
      : null;

  const knownInterestValues = new Set<string>(INTEREST_VALUES);
  const initialInterestIds = ((profile?.interests ?? []) as string[]).filter(
    (value): value is InterestValue => knownInterestValues.has(value),
  );

  // Same guard for a stale industry slug: an unknown value would fail the `z.enum` on save with
  // no matching option visible in the picker to change it.
  const knownIndustryValues = new Set<string>(INDUSTRY_VALUES);
  const initialIndustry =
    profile?.industry && knownIndustryValues.has(profile.industry)
      ? (profile.industry as IndustryValue)
      : undefined;

  return (
    <SectionEditorShell sectionKey="hero" title={t('title')} description={t('editorHint')}>
      <HeroForm
        initialFullName={profile?.full_name ?? ''}
        initialLastName={profile?.last_name ?? ''}
        initialUsername={cabinet.username}
        initialCountryCode={profile?.country_code ?? undefined}
        initialCity={initialCity}
        countries={countries}
        initialLanguages={(profile?.languages ?? undefined) as LanguageValue[] | undefined}
        initialBio={profile?.bio ?? undefined}
        initialAbout={profile?.about ?? undefined}
        initialInterestIds={initialInterestIds}
        initialAvatarUrl={profile?.avatar_url ?? undefined}
        initialCompany={profile?.company ?? undefined}
        initialRole={profile?.role ?? undefined}
        initialIndustry={initialIndustry}
        nextHref={nextSectionHref(cabinet.completeness.sections, 'hero')}
      />
    </SectionEditorShell>
  );
}
