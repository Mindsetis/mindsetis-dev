import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ReelLifeBlockIcon } from '@/components/icons/shine-block-icons';
import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { ReelLifeForm } from '@/components/mindsetter-onboarding/ReelLifeForm';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';

type ReelLifeBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

export async function generateMetadata({ params }: ReelLifeBlockPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'mindsetterOnboarding', 'blocks.reelLife.title');
}

/** How long a resolved signed URL for an already-saved photo stays valid on this page — long
 * enough for one edit session; a fresh batch is minted on every page load, so there's no need
 * for a long-lived token (mirrors `uploadReelLifePhoto`'s own TTL, `actions.ts`). */
const REEL_LIFE_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Optional block "Reel Life" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/wins/page.tsx` exactly for the auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff — but unlike every sibling block, `mindsetter_profiles.reel_life` only stores bare
 * Storage object PATHS (private bucket, see the schema-alignment migration's own comment), so
 * this page also resolves every already-saved path to a signed URL up front
 * (`createSignedUrls`) before handing them to `ReelLifeForm` — the same "resolve to a
 * displayable URL before rendering" precedent `AvatarUpload`'s `initialAvatarUrl` prop assumes,
 * just batched since there can be many photos here instead of one.
 */
export default async function MindsetterOnboardingReelLifeBlockPage({
  params,
  searchParams,
}: ReelLifeBlockPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('mindsetterOnboarding');

  const session = await getSessionContext();
  if (!session?.profile) {
    redirect({ href: '/login', locale });
    return null;
  }

  const { blocks, index } = parseBlocksParam(await searchParams);
  const backHref = index === 0 ? '/mindsetter-onboarding/shine' : buildBlockHref(blocks, index - 1);
  const nextHref = nextBlockHref(blocks, index);

  const supabase = await createClient();
  const { data: mindsetterProfile } = await supabase
    .from('mindsetter_profiles')
    .select('reel_life')
    .eq('id', session.user.id)
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
      console.error('[mindsetter-onboarding] reel-life signed URLs failed:', error);
    } else {
      initialPhotos = paths
        .map((path, i) => ({ path, url: signedUrls[i]?.signedUrl ?? null }))
        .filter((photo): photo is { path: string; url: string } => Boolean(photo.url));
    }
  }

  return (
    <BlockShell backHref={backHref} index={index} total={blocks.length}>
      <div className="flex items-center gap-2 md:gap-4">
        <ReelLifeBlockIcon className="size-7 md:size-10" />
        <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
          {t('blocks.reelLife.title')}
        </h1>
      </div>
      <ReelLifeForm initialPhotos={initialPhotos} nextHref={nextHref} />
    </BlockShell>
  );
}
