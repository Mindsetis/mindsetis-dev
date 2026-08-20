'use client';

import { useTranslations } from 'next-intl';

import { toast } from '@/components/ui/sonner';
import { useRouter } from '@/i18n/navigation';

/**
 * What a cabinet section editor does after a SUCCESSFUL save (2026-08-11).
 *
 * It deliberately does NOT navigate. Section editors used to bounce back to the section list on
 * save, which made "Save changes" and "Cancel" behave inconsistently once Cancel became an
 * in-place revert — and it threw away the caller's place in a long form (Hero is twelve fields)
 * for no reason. Staying put needs two things that navigating away got for free:
 *
 *   - `toast` — with no page change, nothing else on screen confirms the write landed.
 *   - `router.refresh()` — the cabinet header's completeness bar and the section list's summaries
 *     are Server Component output. Without a refresh they'd keep showing pre-save numbers until
 *     the caller navigated somewhere themselves.
 *
 * Callers must ALSO rebase their form's baseline (`form.reset(values)`), so a later "Cancel"
 * reverts to what was just saved rather than to what the page originally loaded. That part can't
 * live here — only the form owns its values.
 */
export function useCabinetSaved(): () => void {
  const t = useTranslations('dashboard.profile');
  const router = useRouter();

  return () => {
    toast.success(t('saved'));
    router.refresh();
  };
}
