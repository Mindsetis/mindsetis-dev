import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { PromoForm } from '@/components/mindsetter-onboarding/PromoForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.promoVideo');
}

/**
 * Cabinet → My Profile → "promoVideo" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Back + "Save & Next", walks to the next section on success) rather than a second
 * implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardPromoVideoSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.promoVideo');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('promo_video')
    .eq('id', cabinet.userId)
    .maybeSingle();

  const initialPromoVideo = mindsetterProfile?.promo_video as
    { youtube?: string | null; vimeo?: string | null } | null | undefined;

  return (
    <SectionEditorShell sectionKey="promoVideo" title={t('title')} description={t('editorHint')}>
      <PromoForm
        initialPromoVideo={initialPromoVideo}
        nextHref={nextSectionHref(cabinet.completeness.sections, 'promoVideo')}
        editMode
      />
    </SectionEditorShell>
  );
}
