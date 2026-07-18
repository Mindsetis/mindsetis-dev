import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { MyWayForm } from '@/components/mindsetter-onboarding/MyWayForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';
import type { MyWayStage } from '@/lib/validation/mindsetter';

type MyWayBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

/**
 * Optional block "My Way" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/promo/page.tsx` exactly: same auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff (`lib/mindsetter-onboarding/blocks.ts`).
 */
export default async function MindsetterOnboardingMyWayBlockPage({
  params,
  searchParams,
}: MyWayBlockPageProps) {
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
    .select('my_way')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialMyWay = (mindsetterProfile?.my_way ?? undefined) as MyWayStage[] | undefined;

  return (
    <BlockShell backHref={backHref} skipHref={nextHref} index={index} total={blocks.length}>
      <h1 className="font-display text-h1 text-foreground md:text-h3">{t('blocks.myWay.title')}</h1>
      <MyWayForm initialMyWay={initialMyWay} nextHref={nextHref} />
    </BlockShell>
  );
}
