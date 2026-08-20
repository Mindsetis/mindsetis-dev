import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SectionEditorShell } from '@/components/dashboard/SectionEditorShell';
import { ReelLifeForm } from '@/components/mindsetter-onboarding/ReelLifeForm';
import { requireMindsetterCabinet } from '@/lib/profile/cabinet';
import { createClient } from '@/lib/supabase/server';
import { MAX_REEL_LIFE_PHOTOS, MIN_REEL_LIFE_PHOTOS_TO_DISPLAY } from '@/lib/validation/mindsetter';

type SectionPageProps = {
  params: Promise<{ locale: string }>;
};

/** Matches the onboarding block's own TTL — a fresh batch is minted on every page load. */
const REEL_LIFE_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Cabinet → My Profile → "Reel Life" section editor. Unlike the other sections this one has to
 * resolve Storage paths to short-lived signed URLs before rendering, since `reel_life` holds
 * private-bucket object paths rather than displayable values — same read the onboarding block
 * page does, through the ordinary request-scoped client (the `reel-life` bucket's policies already
 * grant the OWNER access to their own folder, and the owner is exactly who this page serves).
 *
 * Mindsetter-only: `requireMindsetterCabinet()` → `notFound()` for a Member.
 */
export default async function DashboardReelLifeSectionPage({ params }: SectionPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard.profile.sections.reelLife');

  const cabinet = await requireMindsetterCabinet();
  if (!cabinet) notFound();

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('reel_life')
    .eq('id', cabinet.userId)
    .maybeSingle();

  const paths = (
    Array.isArray(mindsetterProfile?.reel_life) ? mindsetterProfile.reel_life : []
  ).filter((path): path is string => typeof path === 'string' && path.length > 0);

  let initialPhotos: { path: string; url: string }[] = [];
  if (paths.length > 0) {
    const { data: signedUrls, error } = await supabase.storage
      .from('reel-life')
      .createSignedUrls(paths, REEL_LIFE_SIGNED_URL_TTL_SECONDS);

    if (error) {
      // A failed signing run degrades to "no photos shown" rather than a broken page — the paths
      // themselves are untouched, so a reload retries. Same handling as the onboarding block.
      console.error('[dashboard/profile] reel-life signed URLs failed:', error);
    } else {
      initialPhotos = paths
        .map((path, index) => ({ path, url: signedUrls[index]?.signedUrl ?? null }))
        .filter((photo): photo is { path: string; url: string } => Boolean(photo.url));
    }
  }

  return (
    <SectionEditorShell
      sectionKey="reelLife"
      title={t('title')}
      description={t('editorHint', {
        min: MIN_REEL_LIFE_PHOTOS_TO_DISPLAY,
        max: MAX_REEL_LIFE_PHOTOS,
      })}
    >
      <ReelLifeForm initialPhotos={initialPhotos} nextHref="/dashboard/profile" editMode />
    </SectionEditorShell>
  );
}
