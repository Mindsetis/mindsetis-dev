import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

type BlockShellProps = {
  /** Previous picked block (`buildBlockHref(blocks, index - 1)`), or back to the "Make your
   * profile shine" picker for the first picked block (`index === 0`) — computed by the page,
   * not this component, since only the page has the parsed `?blocks=&i=` handoff. */
  backHref: string;
  /**
   * Where "Skip" navigates: the next picked block, or the Personal-session step if this was the
   * last one (`nextBlockHref(blocks, index)`) — reached WITHOUT saving this block's data, unlike
   * the form's own "Save and continue", which persists first and navigates to the same href only
   * on success.
   */
  skipHref: string;
  /** 0-based position of this block within the picked sequence. Kept in the prop shape even
   * though no counter is rendered (product decision D5 — no step/block indicators anywhere in
   * this flow) since callers still compute it for `backHref`/`skipHref`. */
  index: number;
  /** Total number of picked blocks — same "kept for the caller's own computed hrefs" reasoning
   * as `index` above. */
  total: number;
  children: ReactNode;
};

/**
 * Shared chrome for the "optional block" screens (onboarding doc section 7, ROADMAP stage 1.9).
 * These run AFTER the core wizard, so they deliberately do NOT reuse
 * `RegistrationStepHeader`/`RegistrationProgress` — instead a lightweight header: a Back link +
 * a "Skip" link (product decision D5: no step/block counters anywhere in this flow, matching
 * Figma), plus the shared page container/max-width every core step's own page.tsx already uses.
 *
 * Every block page wraps its heading + form in this shell so the chrome (and the `?blocks=&i=`
 * query-param handoff it implies) stays identical across all 8 block routes.
 */
export async function BlockShell({ backHref, skipHref, children }: BlockShellProps) {
  const t = await getTranslations('mindsetterOnboarding.blocks.shell');

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="mx-auto mb-8 flex w-full max-w-[640px] items-center justify-between gap-3 md:mb-[100px]">
        <Link
          href={backHref}
          className="flex shrink-0 items-center gap-1 text-base font-bold text-foreground hover:text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('back')}
        </Link>

        <Link
          href={skipHref}
          className="shrink-0 text-base font-bold text-muted-foreground hover:text-foreground"
        >
          {t('skip')}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">{children}</div>
    </div>
  );
}
