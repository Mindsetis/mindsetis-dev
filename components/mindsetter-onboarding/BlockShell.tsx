import type { ReactNode } from 'react';

import { OnboardingTopBack } from '@/components/mindsetter-onboarding/OnboardingTopBack';

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
 * (product decision D5: no step/block counters anywhere in this flow, matching Figma).
 *
 * Back sits top-left above the heading (`OnboardingTopBack`, call of 28.10.2026), as on every
 * wizard step; from 2026-09-29 until then it lived in the form's bottom row. There is no "Skip"
 * per block (product follow-up, 2026-07-19): a picked block is meant to be filled, not skipped
 * one-by-one; bailing out entirely is still possible via the "Make your profile shine" picker.
 *
 * Every block page wraps its heading + form in this shell so the chrome (and the `?blocks=&i=`
 * query-param handoff it implies) stays identical across all 8 block routes.
 */
export function BlockShell({ backHref, children }: BlockShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-20 sm:px-6 md:pt-6 md:pb-[150px] lg:px-[70px]">
      <OnboardingTopBack href={backHref} />

      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">{children}</div>
    </div>
  );
}
