import { getTranslations, setRequestLocale } from 'next-intl/server';

import type { SocialsJson } from '@/app/[locale]/(app)/member-profile/page';
import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { SocialLinksForm } from '@/components/dashboard/SocialLinksForm';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { loadCabinetProfile } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.socialLinks');
}

/**
 * Cabinet → My Profile → "Social links" section editor (Figma `613:4606`). Available to both
 * account types — `profiles.socials` is a shared column.
 *
 * `SocialsJson` is reused from the wizard's step-3 page rather than redeclared, so both writers of
 * this jsonb agree on its shape.
 */
export default async function DashboardSocialLinksSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.socialLinks');

  const cabinet = await loadCabinetProfile();
  if (!cabinet) {
    redirect({ href: '/login', locale });
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('socials')
    .eq('id', cabinet.userId)
    .maybeSingle();

  const socials = (profile?.socials ?? {}) as SocialsJson;

  return (
    <SectionEditorShell sectionKey="socialLinks" title={t('title')} description={t('editorHint')}>
      <SocialLinksForm
        initialSocials={socials}
        nextHref={nextSectionHref(cabinet.completeness.sections, 'socialLinks')}
      />
    </SectionEditorShell>
  );
}
