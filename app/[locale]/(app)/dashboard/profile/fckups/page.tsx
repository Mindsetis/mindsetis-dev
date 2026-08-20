import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { FckupsForm } from '@/components/mindsetter-onboarding/FckupsForm';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import type { Fckup } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Cabinet → My Profile → "fckups" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Cancel + "Save changes", returns to the section list on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardFckupsSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.fckups');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('fckups')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="fckups" title={t('title')} description={t('editorHint')}>
      <FckupsForm
        initialFckups={(mindsetterProfile?.fckups ?? undefined) as Fckup[] | undefined}
        nextHref="/dashboard/profile"
        editMode
      />
    </SectionEditorShell>
  );
}
