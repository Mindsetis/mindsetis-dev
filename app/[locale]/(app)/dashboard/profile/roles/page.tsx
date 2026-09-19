import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { RolesForm } from '@/components/mindsetter-onboarding/RolesForm';
import { pageTitle } from '@/i18n/page-metadata';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: SectionPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'dashboard.profile.sections.roles');
}

/**
 * Cabinet → My Profile → "roles" section editor. Reuses the onboarding wizard's own form in
 * `editMode` (Cancel + "Save changes", returns to the section list on success) rather than a
 * second implementation of the same fields — the Figma cabinet frames draw the identical form.
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member, whose section list
 * doesn't include this card at all.
 */
export default async function DashboardRolesSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.roles');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('roles')
    .eq('id', cabinet.userId)
    .maybeSingle();

  return (
    <SectionEditorShell sectionKey="roles" title={t('title')} description={t('editorHint')}>
      <RolesForm
        initialRoles={(mindsetterProfile?.roles ?? undefined) as Role[] | undefined}
        editMode
      />
    </SectionEditorShell>
  );
}
