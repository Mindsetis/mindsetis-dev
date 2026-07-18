'use client';

import { Search, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { ProfilePageIcon } from '@/components/icons/profile-page-icon';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

import { WhoIsMindsetterDialog } from './WhoIsMindsetterDialog';

/**
 * Congrats-screen ("/welcome") CTAs — stage 1.6 copy/UI follow-up, replacing the old single
 * "Browse the community" button with four CTAs plus a "Who is Mindsetter?" info modal.
 *
 * All four buttons link to the homepage (`/`) for now — this is an explicit placeholder:
 * there's no Mindsetter-matching, event-invite, event-catalog, or profile-preview route in the
 * codebase yet. Wire these up to their real destinations once those pages exist.
 *
 * The "Find out who a Mindsetter is" button opens the full "Who is Mindsetter?" modal (see
 * `WhoIsMindsetterDialog`, built from Figma Frame 267). Confirming it ("Understand, I want to be
 * a Member") closes the modal and permanently swaps that same button slot for "See how looks my
 * profile page" — tracked only as local client state (`dismissed`), not persisted anywhere,
 * since the task only calls for this to hold for the current page view.
 *
 * Button variants (direct product request, 2026-07-17): "Find Mindseter for me" stays
 * `primaryOutline` (gradient border); "Invite on Mindsetis event" is plain `outline` (solid
 * border); "Find Mindsetis event" is borderless/backgroundless `ghost`; "Find out who a
 * Mindsetter is" is its own `outlineArrow` variant (white text, `#747474` border, text pinned
 * left / trailing icon pinned right — see `components/ui/button.tsx` for the full state spec)
 * with the custom `MindsetterArrowIcon` in place of the previous `lucide-react`
 * `CircleArrowRight`; once dismissed, "See how looks my profile page" switches to `primary`
 * (gradient background).
 */
export function WelcomeCtas() {
  const t = useTranslations('auth');
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      <div className="flex flex-col">
        <div className="flex flex-col gap-3">
          <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
            {/* Placeholder destination — no Mindsetter-matching route exists yet. */}
            <Link href="/">
              <Search aria-hidden="true" />
              {t('welcome.ctas.findMindsetter')}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
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
        </div>

        {/* Deliberately large, asymmetric gap to the info/profile-preview button below —
            80px desktop, but MORE on mobile (137px), per direct product request 2026-07-17. */}
        <div className="mt-[137px] md:mt-20">
          {dismissed ? (
            <Button asChild variant="primary" size="lg" className="w-full">
              {/* Placeholder destination — no profile-preview route exists yet. */}
              <Link href="/">
                <ProfilePageIcon />
                {t('welcome.ctas.seeProfile')}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlineArrow"
              size="lg"
              className="w-full px-5"
              onClick={() => setModalOpen(true)}
            >
              {t('welcome.ctas.findMindsetterInfo')}
              <MindsetterArrowIcon />
            </Button>
          )}
        </div>
      </div>

      <WhoIsMindsetterDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={() => {
          setModalOpen(false);
          setDismissed(true);
        }}
      />
    </>
  );
}
