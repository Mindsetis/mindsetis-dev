import { getTranslations, setRequestLocale } from 'next-intl/server';

import { MyWinsBlockIcon } from '@/components/icons/shine-block-icons';
import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { WinsForm } from '@/components/mindsetter-onboarding/WinsForm';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';
import type { Win } from '@/lib/validation/mindsetter';

type WinsBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

export async function generateMetadata({ params }: WinsBlockPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'mindsetterOnboarding', 'blocks.wins.title');
}

/**
 * Optional block "My Wins" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/promo/page.tsx` exactly: same auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff (`lib/mindsetter-onboarding/blocks.ts`).
 */
export default async function MindsetterOnboardingWinsBlockPage({
  params,
  searchParams,
}: WinsBlockPageProps) {
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
    .select('wins')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialWins = (mindsetterProfile?.wins ?? undefined) as Win[] | undefined;

  return (
    <BlockShell backHref={backHref} index={index} total={blocks.length}>
      <div className="flex items-center gap-2 md:gap-4">
        <MyWinsBlockIcon className="size-7 md:size-10" />
        <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
          {t('blocks.wins.title')}
        </h1>
      </div>
      <WinsForm initialWins={initialWins} nextHref={nextHref} />
    </BlockShell>
  );
}
