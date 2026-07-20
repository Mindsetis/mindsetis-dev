import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';

type BlockShellProps = {
  /** Previous picked block (`buildBlockHref(blocks, index - 1)`), or back to the "Make your
   * profile shine" picker for the first picked block (`index === 0`) — computed by the page,
   * not this component, since only the page has the parsed `?blocks=&i=` handoff. */
  backHref: string;
  /** 0-based position of this block within the picked sequence. Kept in the prop shape even
   * though no counter is rendered (product decision D5 — no step/block indicators anywhere in
   * this flow) since callers still compute it for `backHref`. */
  index: number;
  /** Total number of picked blocks — same "kept for the caller's own computed hrefs" reasoning
   * as `index` above. */
  total: number;
  children: ReactNode;
};

/**
 * Shared chrome for the "optional block" screens (onboarding doc section 7, ROADMAP stage 1.9).
 * These run AFTER the core wizard, so they deliberately do NOT reuse `RegistrationProgress`
 * (product decision D5: no step/block counters anywhere in this flow, matching Figma) — but the
 * Back link itself now matches every other onboarding step exactly: `RegistrationBackLink` in
 * the same `relative mb-8 md:mb-[28px]` wrapper (product follow-up, 2026-07-19 — previously a
 * bespoke `Link`+`ArrowLeft` row shared with a "Skip" link, both removed: "Skip" doesn't belong
 * here per the same follow-up — a picked block is meant to be filled, not skipped one-by-one;
 * bailing out entirely is still possible via the "Make your profile shine" picker's own Back).
 * The Back link itself overrides `RegistrationBackLink`'s default `md:absolute` centering trick
 * (`md:static md:translate-y-0`, product follow-up 2026-07-19) — that trick only makes sense when
 * a sibling progress bar sets the wrapper's real height (as in `RegistrationStepHeader`); here the
 * wrapper has no other content, so `md:mb-[28px]` (52px minus the link's own ~24px row height) is
 * tuned so the heading below lands at the same 52px offset as before, without the link floating
 * over a phantom zero-height box.
 *
 * Every block page wraps its heading + form in this shell so the chrome (and the `?blocks=&i=`
 * query-param handoff it implies) stays identical across all 8 block routes.
 */
export async function BlockShell({ backHref, children }: BlockShellProps) {
  const t = await getTranslations('auth');

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <div className="relative mb-8 md:mb-[28px]">
        <RegistrationBackLink
          href={backHref}
          label={t('signUp.back')}
          className="md:static md:translate-y-0"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">{children}</div>
    </div>
  );
}
