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
import { Link } from '@/i18n/navigation';

type MindsetterDirectoryDialogProps = {
  /**
   * Where "Apply to become a Mindsetter" leads for THIS viewer — `resolveBecomeMindsetterHref()`
   * (the same rule as the "Become a Mindsetter" card): guest → `/join`, unfinished Member → their
   * Member step, Member → Mindsetter onboarding, started Mindsetter → their last step. `null` for
   * someone who already IS a Mindsetter: the button would make no sense, only "Got it" stays.
   */
  ctaHref: string | null;
  /** The trigger — a button or a whole card. Must be a single focusable element (`asChild`). */
  children: ReactNode;
};

/**
 * "Mindsetter Directory launches soon" — the client's popup ("Mindsetis. Super final",
 * 10.11.2026) for the Top Mindsetters row: opened by "Find your mindsetter" and by every card
 * except the founder's own (which links to her real page). Copy is the client's, verbatim.
 *
 * Not `NotYetAvailable`: that one has a single "Close" and the shared "we'll email you" line; this
 * one sells becoming a Mindsetter instead, with a real primary action.
 */
export function MindsetterDirectoryDialog({ ctaHref, children }: MindsetterDirectoryDialogProps) {
  const t = useTranslations('home.main.topMindsetters.directoryDialog');

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('lead')}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('body')}</p>
        {/* DOM order "Got it" → CTA: `DialogFooter` stacks `flex-col-reverse` on phones (CTA on
            top) and lays out a right-aligned row from `sm:` (CTA last, on the right). */}
        <DialogFooter className="gap-3">
          <DialogClose asChild>
            <Button
              type="button"
              size="lg"
              variant={ctaHref ? 'outline' : 'primary'}
              className="w-full sm:w-auto"
            >
              {t('close')}
            </Button>
          </DialogClose>
          {ctaHref ? (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={ctaHref}>{t('cta')}</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
