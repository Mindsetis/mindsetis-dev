'use client';

import { CheckCircle2, X } from 'lucide-react';
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
 * Congrats screen), stage 1.6 "Popup expansion checklist" (ROADMAP 1.6, reopened 2026-07-16).
 * Replaces the earlier minimal placeholder (title + single button) built before that frame's
 * content was available.
 *
 * Two pieces are deliberately NOT reused from the shared UI Kit (per product decision recorded
 * in ROADMAP 1.6):
 * - The circular close (X) button: Figma's resting style (32×32, dark fill, grey border) has
 *   no equivalent in `DialogContent`'s default close (plain X, no fill/border), so
 *   `showCloseButton` is turned off and a bespoke one is built here, wired to `DialogClose`.
 * - The "Understand, I want to be a Member" button: Figma's resting state is white/foreground
 *   text on a grey (`border-border`) border with a transparent background — closest to the
 *   `outline` variant, but that variant's resting text is `text-border` (grey), not
 *   `text-foreground` (white). A single `className` override on `variant="outline"` covers the
 *   gap without touching the shared `button.tsx` variants for a one-off usage.
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
        className="max-h-[85vh] gap-6 overflow-y-auto sm:max-w-2xl"
      >
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-6 right-6 flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-foreground"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{t('close')}</span>
          </button>
        </DialogClose>

        <DialogHeader className="pr-10">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <p className={labelVariants({ variant: 'boldSpacing' })}>{t('checklist.label')}</p>
          <ul className="mt-4 flex flex-col gap-3 md:flex-row md:gap-6">
            {CHECKLIST_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2 md:flex-1">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm text-foreground">{t(`checklist.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-foreground">{t(`features.${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`features.${key}.body`)}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-3 md:flex-row">
          <Button asChild variant="primaryOutline" size="lg" className="w-full md:w-auto">
            {/* Placeholder destination — no real Mindsetter-onboarding route exists yet (same
                convention as the rest of stage 1.6's new buttons). */}
            <Link href="/">{t('becomeMindsetter')}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full text-foreground md:w-auto"
            onClick={onConfirm}
          >
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
