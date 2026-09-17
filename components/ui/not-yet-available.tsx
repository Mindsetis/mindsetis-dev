'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type ReactNode, useState } from 'react';

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

/**
 * Keys under `common.notYetAvailable.features` in the dictionaries. Adding a control here means
 * adding its two lines of copy there — the union is what stops a call site from pointing at a
 * feature nobody wrote a description for.
 */
export type NotYetAvailableFeature =
  | 'aiSearch'
  | 'bookings'
  | 'bookSession'
  | 'createEvent'
  | 'earnings'
  | 'events'
  | 'exampleProfile'
  | 'exploreCommunity'
  | 'findEvent'
  | 'findMindsetter'
  | 'interviews'
  | 'inviteToEvent'
  | 'learnMore'
  | 'originals'
  | 'overview'
  | 'reviews'
  | 'shareProfile';

type NotYetAvailableProps = {
  /** Which feature this control belongs to — picks the explanation shown in the dialog. */
  feature: NotYetAvailableFeature;
  children: ReactNode;
  className?: string;
};

/**
 * Marks a control whose feature does not exist yet, and — when clicked — explains what that
 * feature will do and promises an email when it lands.
 *
 * WHY THIS REPLACED THE "COMING SOON" TOOLTIP
 *   A direct client instruction (15.09.2026, Release-1 B1). Her reasoning, and it is sound:
 *   "Coming soon" tells someone only that a button is dead, so a screen full of them reads as
 *   "half the buttons are broken, what is this". An explanation does three jobs instead — it
 *   removes that impression, it introduces a feature the person hasn't seen yet, and it means
 *   the launch email later reads as "finally" rather than as spam.
 *
 *   It also fixes a real accessibility problem the tooltip had: hover copy is invisible on
 *   touch devices, which is where most of these controls get tapped. A dialog opens on tap.
 *
 * WHY THE WRAPPER SPAN (unchanged from the tooltip it replaces)
 *   A `disabled` control emits no pointer events, so it can't be the trigger itself — the click
 *   lands on this span instead, which is exactly what makes the pattern work. `tabIndex={0}`
 *   keeps it keyboard-reachable, since the disabled control drops out of the tab order.
 *
 * KEYBOARD: BOTH HALVES, AND THEY COME FROM DIFFERENT PLACES
 *   A `<span role="button">` is not a button: the browser does not turn Enter or Space into a
 *   click for it, and `DialogTrigger` only binds `onClick`. On its own, Radix therefore left
 *   this control reachable by Tab but impossible to activate — worse than the hover tooltip it
 *   replaced, which at least appeared on focus. Hence `onKeyDown`, which does what the browser
 *   would have done for a real button; Space additionally needs `preventDefault` or the page
 *   scrolls away underneath the open dialog.
 *
 *   The trigger itself has to STAY, though. Dropping it in favour of a hand-rolled `onClick`
 *   fixed activation and quietly broke the other end: Radix restores focus to its trigger on
 *   close, and with no trigger registered, closing the dialog dumped focus on `<body>` — so a
 *   keyboard user who read the explanation landed at the top of the document and had to tab
 *   back through the whole header (WCAG 2.4.3). Keeping `DialogTrigger` also keeps the
 *   `aria-haspopup="dialog"` / `aria-expanded` it contributes. Both halves are needed: Radix
 *   owns pointer activation and focus return, `onKeyDown` owns the keys Radix can't see.
 *
 * NO `aria-label` ON THE WRAPPER
 *   Deliberate. An `aria-label` here would REPLACE the accessible name rather than extend it,
 *   so a screen reader would announce "Invites are on the way" for a control whose visible text
 *   reads "Invite to event" — which breaks WCAG 2.5.3 "Label in Name" and, more practically,
 *   means voice control ("click Invite to event") cannot reach it. Leaving it off lets the name
 *   be computed from the visible content, which is the thing people actually see and say. The
 *   dialog's own title carries the explanation.
 *
 * WHAT THE CALLER STILL OWNS
 *   Disabling. This component does not reach into its child's props. Deliberate: several of
 *   these controls will need to stay disabled for unrelated reasons once the feature ships (a
 *   Mindsetter can never book a session with themselves), and those two conditions should read
 *   separately at the call site rather than being conflated in here.
 *
 * `className` exists for width: the span sits between a flex row and its item, so a full-width
 * button needs a full-width span or it collapses to content size.
 */
export function NotYetAvailable({ feature, children, className }: NotYetAvailableProps) {
  const t = useTranslations('common.notYetAvailable');
  const [open, setOpen] = useState(false);

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          tabIndex={0}
          role="button"
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className,
          )}
        >
          {children}
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t(`features.${feature}.title`)}</DialogTitle>
          <DialogDescription>{t(`features.${feature}.body`)}</DialogDescription>
        </DialogHeader>

        {/* The promise the client asked for, in one place rather than repeated in fourteen
            descriptions — so changing how we word it is one edit, not fourteen. */}
        <p className="text-sm text-muted-foreground">{t('emailPromise')}</p>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" size="lg" className="w-full sm:w-auto">
              {t('close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
