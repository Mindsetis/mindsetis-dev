import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { VideoBlogForm } from '@/components/mindsetter-onboarding/VideoBlogForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';

type VideoBlogBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

/**
 * Optional block "Video blog" (un-deferred from Phase 2 back into MVP scope, migration
 * `20260718185944_mindsetter_video_blog.sql`). Mirrors `blocks/promo/page.tsx` exactly: same
 * auth guard, `BlockShell` chrome, and the `?blocks=&i=` handoff
 * (`lib/mindsetter-onboarding/blocks.ts`).
 *
 * Requires a signed-in user — redirect to `/login` at the page level, same defense-in-depth as
 * every other Mindsetter-onboarding page.
 */
export default async function MindsetterOnboardingVideoBlogBlockPage({
  params,
  searchParams,
}: VideoBlogBlockPageProps) {
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
    .select('video_blog')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialVideoBlog = mindsetterProfile?.video_blog as
    { youtube?: string | null; vimeo?: string | null } | null | undefined;

  return (
    <BlockShell backHref={backHref} skipHref={nextHref} index={index} total={blocks.length}>
      <h1 className="font-display text-h1 text-foreground md:text-h3">
        {t('blocks.videoBlog.title')}
      </h1>
      <VideoBlogForm initialVideoBlog={initialVideoBlog} nextHref={nextHref} />
    </BlockShell>
  );
}
