import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { HelpForm } from '@/components/mindsetter-onboarding/HelpForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import type { Expertise } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.helpWith');
}

/**
 * Cabinet → My Profile → "helpWith" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Cancel + "Save changes", returns to the section list on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardHelpSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.helpWith');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('help_with')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="helpWith" title={t('title')} description={t('editorHint')}>
      <HelpForm
        initialExpertise={(mindsetterProfile?.help_with ?? undefined) as Expertise[] | undefined}
        editMode
      />
    </SectionEditorShell>
  );
}
