'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type FooterSoonProps = {
  /** The page ("About Us") or network ("LinkedIn") the popup is about — goes into its title. */
  label: string;
  /** `'page'` for a footer link whose page doesn't exist yet, `'social'` for a social icon. */
  kind: 'page' | 'social';
  /** Accessible name for an icon-only trigger; a text link already has its own. */
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

/**
 * "This isn't live yet" popup for footer entries that have no destination (Albina's footer,
 * "Правки 3.0" П13).
 *
 * WHY THIS EXISTS NEXT TO `NotYetAvailable`. The footer follows the same rule as every other
 * unbuilt control in the app — a dead link explains itself instead of doing nothing or pointing
 * at `/` (Release-1 B1, see `components/ui/not-yet-available.tsx`). `NotYetAvailable` takes a
 * `feature` key whose copy lives in the dictionaries and whose union type lives in `components/
 * ui/`; none of its existing features fits "About Us", "FAQs", "Community Guidelines" or a social
 * network, and a wrong explanation ("Events are on the way" under "FAQs") is worse than none.
 * Where one DOES fit (Catalog, Events, Become a Mindsetter) the footer uses `NotYetAvailable`
 * itself. Once a generic page/social entry is added to that component, this file can go.
 *
 * It reuses that component's dialog shell and its shared "We'll email you as soon as it's live"
 * and "Got it" lines (`common.notYetAvailable`), so only the title/body are new copy
 * (`footer.comingSoon`). The trigger is a real `<button>` — Radix wires Enter/Space and returns
 * focus to it on close, none of which the `<span role="button">` that `NotYetAvailable` needs for
 * disabled children would give for free.
 */
export function FooterSoon({ label, kind, ariaLabel, className, children }: FooterSoonProps) {
  const t = useTranslations('footer.comingSoon');
  const tCommon = useTranslations('common.notYetAvailable');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={ariaLabel} className={cn('cursor-pointer', className)}>
          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {kind === 'social'
              ? t('socialTitle', { network: label })
              : t('pageTitle', { page: label })}
          </DialogTitle>
          <DialogDescription>
            {kind === 'social' ? t('socialBody') : t('pageBody')}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{tCommon('emailPromise')}</p>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" size="lg" className="w-full sm:w-auto">
              {tCommon('close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
