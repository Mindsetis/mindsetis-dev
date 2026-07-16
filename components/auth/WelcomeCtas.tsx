'use client';

import { CircleArrowRight, IdCard, Search, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';

/**
 * Congrats-screen ("/welcome") CTAs — stage 1.6 copy/UI follow-up, replacing the old single
 * "Browse the community" button with four CTAs plus a "Who is Mindsetter?" info modal.
 *
 * All four buttons link to the homepage (`/`) for now — this is an explicit placeholder:
 * there's no Mindsetter-matching, event-invite, event-catalog, or profile-preview route in the
 * codebase yet. Wire these up to their real destinations once those pages exist.
 *
 * The "Find out who a Mindsetter is" button opens a minimal "Who is Mindsetter?" modal (no
 * body-copy spec beyond the title + one button yet). Confirming it ("Understand, I want to be a
 * Member") closes the modal and permanently swaps that same button slot for "See how looks my
 * profile page" — tracked only as local client state (`dismissed`), not persisted anywhere,
 * since the task only calls for this to hold for the current page view.
 *
 * Icons (added after a Figma audit, stage 1.6): Figma's "Find Mindsetis event" button is
 * borderless/tertiary, hence `variant="ghost"` there instead of `primaryOutline` like its
 * siblings. The "Find out who a Mindsetter is" trailing icon is Figma's `arrow-left-long-line`
 * flipped to point right — a circular arrow badge — which lucide-react ships natively as
 * `CircleArrowRight`, so no custom circular wrapper was needed.
 */
export function WelcomeCtas() {
  const t = useTranslations('auth');
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
          {/* Placeholder destination — no Mindsetter-matching route exists yet. */}
          <Link href="/">
            <Search aria-hidden="true" />
            {t('welcome.ctas.findMindsetter')}
          </Link>
        </Button>

        <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
          {/* Placeholder destination — no event-invite route exists yet. */}
          <Link href="/">
            <UserPlus aria-hidden="true" />
            {t('welcome.ctas.inviteEvent')}
          </Link>
        </Button>

        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
          {/* Placeholder destination — no event-catalog route exists yet. */}
          <Link href="/">
            <Search aria-hidden="true" />
            {t('welcome.ctas.findEvent')}
          </Link>
        </Button>

        {dismissed ? (
          <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
            {/* Placeholder destination — no profile-preview route exists yet. */}
            <Link href="/">
              <IdCard aria-hidden="true" />
              {t('welcome.ctas.seeProfile')}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primaryOutline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            {t('welcome.ctas.findMindsetterInfo')}
            <CircleArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('welcome.modal.title')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => {
                setModalOpen(false);
                setDismissed(true);
              }}
            >
              {t('welcome.modal.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
