import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { MyWayForm } from '@/components/mindsetter-onboarding/MyWayForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import type { MyWayStage } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.myWay');
}

/**
 * Cabinet → My Profile → "myWay" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Cancel + "Save changes", returns to the section list on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardMyWaySectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.myWay');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('my_way')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="myWay" title={t('title')} description={t('editorHint')}>
      <MyWayForm
        initialMyWay={(mindsetterProfile?.my_way ?? undefined) as MyWayStage[] | undefined}
        nextHref="/dashboard/profile"
        editMode
      />
    </SectionEditorShell>
  );
}
