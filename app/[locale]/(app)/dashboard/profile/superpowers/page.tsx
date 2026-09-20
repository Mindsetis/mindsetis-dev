import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { SuperpowersForm } from '@/components/mindsetter-onboarding/SuperpowersForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';
import type { Superpower } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.superpowers');
}

/**
 * Cabinet → My Profile → "superpowers" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Back + "Save & Next", walks to the next section on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardSuperpowersSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.superpowers');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('superpowers')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="superpowers" title={t('title')} description={t('editorHint')}>
      <SuperpowersForm
        initialSuperpowers={
          (mindsetterProfile?.superpowers ?? undefined) as Superpower[] | undefined
        }
        nextHref={nextSectionHref(cabinet.completeness.sections, 'superpowers')}
        editMode
      />
    </SectionEditorShell>
  );
}
