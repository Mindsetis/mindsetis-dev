import { getTranslations, setRequestLocale } from 'next-intl/server';

import { FckupsBlockIcon } from '@/components/icons/shine-block-icons';
import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { FckupsForm } from '@/components/mindsetter-onboarding/FckupsForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';
import type { Fckup } from '@/lib/validation/mindsetter';

type FckupsBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

/**
 * Optional block "My F*ckUp(s)" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/promo/page.tsx` exactly: same auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff (`lib/mindsetter-onboarding/blocks.ts`).
 */
export default async function MindsetterOnboardingFckupsBlockPage({
  params,
  searchParams,
}: FckupsBlockPageProps) {
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
    .select('fckups')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialFckups = (mindsetterProfile?.fckups ?? undefined) as Fckup[] | undefined;

  return (
    <BlockShell backHref={backHref} index={index} total={blocks.length}>
      <div className="flex items-center gap-2 md:gap-4">
        <FckupsBlockIcon className="size-7 text-primary md:size-10" />
        <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
          {t('blocks.fckups.title')}
        </h1>
      </div>
      <FckupsForm initialFckups={initialFckups} nextHref={nextHref} />
    </BlockShell>
  );
}
