import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PromoVideoBlockIcon } from '@/components/icons/shine-block-icons';
import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { PromoForm } from '@/components/mindsetter-onboarding/PromoForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';

type PromoBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

/** How long a resolved signed URL for an already-uploaded promo video stays valid on this page —
 * long enough for one edit session; a fresh one is minted on every page load (mirrors the
 * reel-life page's own TTL). */
const PROMO_VIDEO_SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Optional block "Promo video" (onboarding doc section 7, ROADMAP stage 1.9). Only reached if
 * picked on the "Make your profile shine" picker (`../../shine/page.tsx`) — the `?blocks=&i=`
 * query-param handoff (`lib/mindsetter-onboarding/blocks.ts`) says which other blocks were also
 * picked and where this one sits in that sequence.
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth as
 * every other Mindsetter-onboarding page.
 */
export default async function MindsetterOnboardingPromoBlockPage({
  params,
  searchParams,
}: PromoBlockPageProps) {
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
    .select('promo_video')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialPromoVideo = mindsetterProfile?.promo_video as
    | { youtube?: string | null; vimeo?: string | null; videoPath?: string | null }
    | null
    | undefined;

  // Resolve an already-uploaded video's private-bucket path to a signed URL up front, so the
  // caller sees their previously-uploaded video on revisit — same "resolve path → displayable URL
  // before rendering" precedent as `blocks/reel-life/page.tsx`.
  const initialVideoPath = initialPromoVideo?.videoPath ?? '';
  let initialVideoUrl: string | null = null;
  if (initialVideoPath) {
    const { data: signed, error } = await supabase.storage
      .from('promo-video')
      .createSignedUrl(initialVideoPath, PROMO_VIDEO_SIGNED_URL_TTL_SECONDS);
    if (error) {
      console.error('[mindsetter-onboarding] promo-video signed URL failed:', error);
    } else {
      initialVideoUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <BlockShell backHref={backHref} index={index} total={blocks.length}>
      <div className="flex items-center gap-2 md:gap-4">
        <PromoVideoBlockIcon className="size-7 md:size-10" />
        <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
          {t('blocks.promo.title')}
        </h1>
      </div>
      <PromoForm
        initialPromoVideo={initialPromoVideo}
        initialVideoPath={initialVideoPath}
        initialVideoUrl={initialVideoUrl}
        userId={session.user.id}
        nextHref={nextHref}
      />
    </BlockShell>
  );
}
