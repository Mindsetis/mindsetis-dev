import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { NumbersForm } from '@/components/mindsetter-onboarding/NumbersForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import type { NumberItem } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.numbers');
}

/**
 * Cabinet → My Profile → "numbers" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Cancel + "Save changes", returns to the section list on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardNumbersSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.numbers');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('numbers')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="numbers" title={t('title')} description={t('editorHint')}>
      <NumbersForm
        initialNumbers={(mindsetterProfile?.numbers ?? undefined) as NumberItem[] | undefined}
        nextHref="/dashboard/profile"
        editMode
      />
    </SectionEditorShell>
  );
}
