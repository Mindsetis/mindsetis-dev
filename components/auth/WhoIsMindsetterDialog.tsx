'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { labelVariants } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';

const CHECKLIST_KEYS = ['owner', 'verified', 'experience'] as const;
const FEATURE_KEYS = ['site', 'earn', 'brand'] as const;

/** Checklist-item check icon (16×16) — provided verbatim by the designer. */
function ChecklistCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7.9987 14.6667C11.6806 14.6667 14.6654 11.6819 14.6654 8.00004C14.6654 4.31814 11.6806 1.33337 7.9987 1.33337C4.3168 1.33337 1.33203 4.31814 1.33203 8.00004C1.33203 11.6819 4.3168 14.6667 7.9987 14.6667ZM11.1654 5.83338C11.4257 6.09373 11.4257 6.51583 11.1654 6.77618L8.03914 9.9024C7.64861 10.2929 7.01545 10.2929 6.62492 9.9024L4.9987 8.27618C4.73835 8.01583 4.73835 7.59372 4.9987 7.33337C5.25905 7.07302 5.68116 7.07303 5.9415 7.33337L7.33203 8.72391L10.2226 5.83337C10.4829 5.57302 10.905 5.57303 11.1654 5.83338Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

type WhoIsMindsetterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fired by the "Understand, I want to be a Member" button — closing the popup itself is
   * handled by the caller via `onOpenChange`/state, this only carries the extra "swap the CTA"
   * side effect that lives in `WelcomeCtas`.
   */
  onConfirm: () => void;
};

/**
 * "Who is Mindsetter?" info popup — full design per Figma Frame 267 (near the `/welcome`
 * Congrats screen), stage 1.6 "Popup expansion checklist" (ROADMAP 1.6, reopened 2026-07-16),
 * restyled per a direct product spec (2026-07-17).
 *
 * Responsive shape: a centered 800px-wide, fully-rounded (30px) modal on desktop; a bottom
 * sheet on mobile (pinned to the viewport's bottom edge, full width, only the top corners
 * rounded at 32px, a single grey top border — the only border this popup has anywhere, the
 * desktop modal is explicitly borderless). Both breakpoints share the same `DialogContent`
 * element; the mobile-vs-desktop positioning/sizing/border/radius are all plain `md:`-prefixed
 * Tailwind overrides layered on top of the shared `dialog.tsx` primitive's base classes.
 *
 * Two pieces are deliberately NOT reused from the shared UI Kit (per product decision recorded
 * in ROADMAP 1.6):
 * - The circular close (X) button: Figma's resting style (32×32, dark fill, grey border) has
 *   no equivalent in `DialogContent`'s default close (plain X, no fill/border), so
 *   `showCloseButton` is turned off and a bespoke one is built here, wired to `DialogClose`.
 * - The "Understand, I want to be a Member" button uses the shared `outline` variant directly
 *   (its resting text is `text-foreground`/white as of the 2026-07-17 button-variant pass, so
 *   no local override is needed here anymore — this popup no longer diverges from the shared
 *   variant, unlike before that pass).
 *
 * The description's line break after "sessions" is real markup (`<br/>` via `t.rich`, not a
 * manual `\n` in the translation string) so it can be hidden on mobile (`hidden md:block`) — the
 * spec explicitly asks for the forced break only at desktop widths, letting mobile wrap
 * naturally instead.
 *
 * Figma also contained a hidden/clipped orphan Title/Description/Link sub-form nested inside
 * the checklist card that never renders in the design — confirmed leftover paste debris, not
 * part of this popup, intentionally not built.
 */
export function WhoIsMindsetterDialog({
  open,
  onOpenChange,
  onConfirm,
}: WhoIsMindsetterDialogProps) {
  const t = useTranslations('auth.welcome.modal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={[
          // Mobile: bottom sheet — pinned to the viewport's bottom edge, full width, only the
          // top corners rounded, single grey top border (this popup's only border anywhere).
          // Deliberately explicit `left-0 right-0` (not the `inset-x-0` shorthand) — mixing
          // that shorthand with the desktop override's standalone `md:left-[50%]` confused
          // tailwind-merge's conflict resolution (both landed in the same "inset" class group),
          // silently dropping `md:left-[50%]` and leaving the desktop modal pinned to the left
          // edge instead of centered. Plain longhand `left`/`right`/`top`/`bottom` throughout
          // avoids that shorthand-vs-longhand ambiguity entirely.
          'top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0',
          'translate-y-0 gap-4 overflow-y-auto rounded-t-[32px] rounded-b-none border-0',
          'border-t border-t-[#a5a5a5] px-4 pt-6 pb-6',
          // Desktop: centered modal, 800px wide, fully rounded 30px, no border, 32px padding.
          'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-w-[800px]',
          'md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-[30px] md:border-0 md:p-8',
        ].join(' ')}
      >
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-6 right-6 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-input transition-colors hover:border-primary hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t('close')}</span>
          </button>
        </DialogClose>

        <DialogHeader className="gap-0 pr-10 text-left">
          <DialogTitle className="text-[22px] text-primary">{t('title')}</DialogTitle>
          <DialogDescription>
            {t.rich('description', { br: () => <br className="hidden md:block" /> })}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[16px] border border-border bg-card p-4">
          <p className={labelVariants({ variant: 'boldSpacing' })}>{t('checklist.label')}</p>
          <ul className="mt-4 flex flex-col gap-1 md:mt-3 md:flex-row md:gap-4">
            {CHECKLIST_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2 md:flex-1 md:gap-1">
                <ChecklistCheckIcon />
                <span className="text-sm text-foreground">{t(`checklist.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-0">
              <h3 className="text-base font-bold text-primary">{t(`features.${key}.title`)}</h3>
              <p className="text-[12px] text-muted-foreground md:text-sm">
                {t(`features.${key}.body`)}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-2 flex-col gap-3 md:mt-0 md:flex-row md:gap-4">
          {/* `md:order-*` swaps these two visually on desktop only (Understand first/left,
              Cool second/right) without touching DOM order — DOM order stays Cool-then-
              Understand so mobile's stacking (Cool on top) is untouched, per an earlier request.
              `md:flex-1` (was `md:w-auto`) stretches both to fill the row equally at desktop. */}
          <Button
            asChild
            variant="primaryOutline"
            size="lg"
            className="w-full md:order-2 md:flex-1"
          >
            {/* Placeholder destination — no real Mindsetter-onboarding route exists yet (same
                convention as the rest of stage 1.6's new buttons). */}
            <Link href="/">{t('becomeMindsetter')}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full md:order-1 md:flex-1"
            onClick={onConfirm}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
