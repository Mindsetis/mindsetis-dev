'use client';

import { useTranslations } from 'next-intl';

import { toast } from '@/components/ui/sonner';
import { useRouter } from '@/i18n/navigation';

/**
 * What a cabinet section editor does after a SUCCESSFUL save.
 *
 * NAVIGATES to `nextHref` when the caller passes one — "Save & Next" (Release-1 C3, 2026-09-19):
 * the button's own name promises a step forward, so a save now walks to the NEXT section in
 * cabinet card order, or back to the section list once the last one (`videoBlog`) saves. Each
 * caller computes that href itself via `lib/profile/completeness.ts#nextSectionHref` (it already
 * has the cabinet's section list in hand) and passes it straight through — see e.g. `HeroForm.tsx`.
 *
 * THIS SUPERSEDES the 2026-08-11 "stay on the section" decision recorded below, kept for context:
 * section editors used to bounce back to the section list on save, which made "Save changes" and
 * "Cancel" behave inconsistently once Cancel became an in-place revert — and it threw away the
 * caller's place in a long form (Hero is twelve fields) for no reason. Staying put needed two
 * things that navigating away got for free: a `toast` (with no page change, nothing else on screen
 * confirmed the write landed) and `router.refresh()` (the header's completeness bar and the section
 * list's summaries are Server Component output, and would keep showing pre-save numbers until the
 * caller navigated somewhere themselves). "Cancel" is now "Back" and no longer reverts in place
 * either (`StepActions.tsx`), so that inconsistency is gone, and every save has somewhere concrete
 * to go — `nextHref` is effectively always passed now, but stays optional so a caller with no
 * sensible "next" (there is none today) can fall back to the old stay-and-refresh behavior instead
 * of being forced to invent a destination.
 *
 * Toast still fires either way — with `router.push`, Sonner's toast lives in the root layout
 * (`app/[locale]/layout.tsx`, outside the routed page), so it survives the navigation instead of
 * unmounting with the page that triggered it.
 */
export function useCabinetSaved(): (nextHref?: string) => void {
  const t = useTranslations('dashboard.profile');
  const router = useRouter();

  return (nextHref) => {
    toast.success(t('saved'));
    if (nextHref) {
      router.push(nextHref);
      return;
    }
    router.refresh();
  };
}
