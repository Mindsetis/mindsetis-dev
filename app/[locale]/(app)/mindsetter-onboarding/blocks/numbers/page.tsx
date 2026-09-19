import { getTranslations, setRequestLocale } from 'next-intl/server';

import { NumbersBlockIcon } from '@/components/icons/shine-block-icons';
import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { NumbersForm } from '@/components/mindsetter-onboarding/NumbersForm';
import { redirect } from '@/i18n/navigation';
import { pageTitle } from '@/i18n/page-metadata';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';
import type { NumberItem } from '@/lib/validation/mindsetter';

type NumbersBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

export async function generateMetadata({ params }: NumbersBlockPageProps) {
  const { locale } = await params;
  return pageTitle(locale, 'mindsetterOnboarding', 'blocks.numbers.title');
}

/**
 * Optional block "Numbers" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/promo/page.tsx` exactly: same auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff (`lib/mindsetter-onboarding/blocks.ts`).
 */
export default async function MindsetterOnboardingNumbersBlockPage({
  params,
  searchParams,
}: NumbersBlockPageProps) {
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
    .select('numbers')
    .eq('id', session.user.id)
    .maybeSingle();
  const initialNumbers = (mindsetterProfile?.numbers ?? undefined) as NumberItem[] | undefined;

  return (
    <BlockShell backHref={backHref} index={index} total={blocks.length}>
      <div className="flex items-center gap-2 md:gap-4">
        <NumbersBlockIcon className="size-7 md:size-10" />
        <h1 className="font-display text-[24px] leading-none text-foreground md:text-h3">
          {t('blocks.numbers.title')}
        </h1>
      </div>
      <NumbersForm initialNumbers={initialNumbers} nextHref={nextHref} />
    </BlockShell>
  );
}
