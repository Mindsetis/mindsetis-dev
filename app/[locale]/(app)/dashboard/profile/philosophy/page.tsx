import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { PhilosophyForm } from '@/components/mindsetter-onboarding/PhilosophyForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.philosophy');
}

/**
 * Cabinet → My Profile → "My Philosophy" section editor.
 *
 * Joined the cabinet on 2026-08-14, together with the quote's new author field — until then the
 * block existed only inside the onboarding wizard and was deliberately left out of the section
 * list while product decided whether it survived at all.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card.
 */
export default async function DashboardPhilosophySectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.philosophy');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('philosophy, philosophy_author')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="philosophy" title={t('title')} description={t('editorHint')}>
      <PhilosophyForm
        initialPhilosophy={mindsetterProfile?.philosophy}
        initialPhilosophyAuthor={mindsetterProfile?.philosophy_author}
        nextHref={nextSectionHref(cabinet.completeness.sections, 'philosophy')}
        editMode
      />
    </SectionEditorShell>
  );
}
