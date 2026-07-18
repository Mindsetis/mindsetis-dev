import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BlockShell } from '@/components/mindsetter-onboarding/BlockShell';
import { PhilosophyForm } from '@/components/mindsetter-onboarding/PhilosophyForm';
import { redirect } from '@/i18n/navigation';
import { getSessionContext } from '@/lib/auth/guards';
import {
  buildBlockHref,
  nextBlockHref,
  parseBlocksParam,
} from '@/lib/mindsetter-onboarding/blocks';
import { createClient } from '@/lib/supabase/server';

type PhilosophyBlockPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ blocks?: string | string[]; i?: string | string[] }>;
};

/**
 * Optional block "My Philosophy" (onboarding doc section 7, ROADMAP stage 1.9). Mirrors
 * `blocks/promo/page.tsx` exactly: same auth guard, `BlockShell` chrome, and the `?blocks=&i=`
 * handoff (`lib/mindsetter-onboarding/blocks.ts`). Unlike the other blocks, `philosophy` is a
 * plain scalar column, so there's no array item type to import here.
 */
export default async function MindsetterOnboardingPhilosophyBlockPage({
  params,
  searchParams,
}: PhilosophyBlockPageProps) {
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
    .select('philosophy')
    .eq('id', session.user.id)
    .maybeSingle();

  return (
    <BlockShell backHref={backHref} skipHref={nextHref} index={index} total={blocks.length}>
      <h1 className="font-display text-h1 text-foreground md:text-h3">
        {t('blocks.philosophy.title')}
      </h1>
      <PhilosophyForm initialPhilosophy={mindsetterProfile?.philosophy} nextHref={nextHref} />
    </BlockShell>
  );
}
