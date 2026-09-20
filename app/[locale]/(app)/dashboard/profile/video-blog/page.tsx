import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { VideoBlogForm } from '@/components/mindsetter-onboarding/VideoBlogForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { nextSectionHref } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.videoBlog');
}

/**
 * Cabinet → My Profile → "videoBlog" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Back + "Save & Next", walks to the next section on success) rather than a second
 * implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardVideoBlogSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.videoBlog');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('video_blog')
    .eq('id', cabinet.userId)
    .maybeSingle();

  const initialVideoBlog = mindsetterProfile?.video_blog as
    { youtube?: string | null; vimeo?: string | null } | null | undefined;

  return (
    <SectionEditorShell sectionKey="videoBlog" title={t('title')} description={t('editorHint')}>
      <VideoBlogForm
        initialVideoBlog={initialVideoBlog}
        nextHref={nextSectionHref(cabinet.completeness.sections, 'videoBlog')}
        editMode
      />
    </SectionEditorShell>
  );
}
