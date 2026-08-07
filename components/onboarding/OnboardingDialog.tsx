'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;
const TOTAL_STEPS = STEP_KEYS.length;

/** "Ok, continue registration" button icon (16×16) — provided verbatim by the designer. */
function FinishIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.57245 9.36339C9.02618 9.41169 9.33464 9.82011 9.33464 10.2764V13.6665C9.33464 14.2188 8.88692 14.6665 8.33464 14.6665H3.66797C3.11568 14.6665 2.65818 14.2146 2.76054 13.6719C3.22646 11.2017 5.39567 9.33317 8.0013 9.33317C8.19425 9.33317 8.3848 9.34342 8.57245 9.36339ZM8.0013 8.6665C5.7913 8.6665 4.0013 6.8765 4.0013 4.6665C4.0013 2.4565 5.7913 0.666504 8.0013 0.666504C10.2113 0.666504 12.0013 2.4565 12.0013 4.6665C12.0013 6.8765 10.2113 8.6665 8.0013 8.6665ZM12.0013 11.3332V9.99984C12.0013 9.63165 12.2998 9.33317 12.668 9.33317C13.0362 9.33317 13.3346 9.63165 13.3346 9.99984V11.3332H14.668C15.0362 11.3332 15.3346 11.6316 15.3346 11.9998C15.3346 12.368 15.0362 12.6665 14.668 12.6665H13.3346V13.9998C13.3346 14.368 13.0362 14.6665 12.668 14.6665C12.2998 14.6665 12.0013 14.368 12.0013 13.9998V12.6665H10.668C10.2998 12.6665 10.0013 12.368 10.0013 11.9998C10.0013 11.6316 10.2998 11.3332 10.668 11.3332H12.0013Z"
        fill="black"
      />
    </svg>
  );
}

type OnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When provided, the LAST step's action button becomes a plain "Next" button that just calls
   * this (closing the popup) instead of the default `Link`-to-`/sign-up` "Ok, continue
   * registration" button. Used by `RolesPreviewCta` (Mindsetter onboarding "Your roles" step's
   * "See how it looks" preview) — that caller is already mid-onboarding, so "continue
   * registration" doesn't apply. Omitted for the default sign-up-linking behavior.
   */
  onFinish?: () => void;
};

/**
 * Onboarding tour popup — Figma "Onboarding - 1..4" (mobile) / "Onboarding - 1..3 - 1440 px"
 * (desktop). Previously its own route (`/onboarding`); reworked into a popup (direct product
 * request, 2026-07-18) opened from a "See platform features"-style button instead of a page
 * navigation. Two callers: the landing hero's `OnboardingCta` (the original trigger — live
 * only while `COMING_SOON_MODE` is off, since the waitlist placeholder replaces that hero
 * otherwise) and `RolesPreviewCta` (see its own doc comment).
 *
 * The `DialogContent` container (positioning, radius, border, close button) reuses the same
 * shape as `WhoIsMindsetterDialog` — mobile bottom sheet / desktop centered 30px-rounded modal
 * — per that same product request; the step content itself (progress dots, per-step
 * title/body/screenshot placeholder, Back/Next/Finish nav) is unchanged from the old page.
 *
 * No longer carries an `initialEmail` — the old page's email round-trip
 * (`/onboarding?email=...` from the sign-up "Back" link) existed only to restore what a visitor
 * had already typed on the sign-up form if they navigated back into onboarding and forward
 * again. Now that "Back" just returns to the homepage instead of reopening this popup (see
 * `app/[locale]/(app)/sign-up/page.tsx`), that round-trip has no reason to exist — "Finish" always
 * routes to a plain `/sign-up`.
 *
 * NOTE: Figma has no desktop frame for step 4 (only two duplicate copies of step 3 exist at
 * 1440px) — the step-4 card here is extrapolated from the same container/typography pattern
 * used by desktop steps 1–3, combined with the real step-4 copy from the mobile frame
 * ("Onboarding - 4"). Flag this to design if the real desktop step-4 layout differs.
 */
export function OnboardingDialog({ open, onOpenChange, onFinish }: OnboardingDialogProps) {
  const t = useTranslations('onboarding');
  const [stepIndex, setStepIndex] = useState(0);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOTAL_STEPS - 1;
  const stepKey = STEP_KEYS[stepIndex];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStepIndex(0);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={[
          'top-auto right-0 bottom-0 left-0 max-h-[85vh] w-full max-w-none translate-x-0',
          'translate-y-0 gap-0 overflow-y-auto rounded-t-[32px] rounded-b-none border-0',
          'border-t border-t-[#a5a5a5] px-4 pt-6 pb-6',
          'md:top-[50%] md:right-auto md:bottom-auto md:left-[50%] md:max-w-[736px]',
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

        <div className="flex items-center justify-between pr-10">
          <div
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            className="flex items-center gap-1"
          >
            <span className="sr-only">
              {t('progressLabel', { step: stepIndex + 1, total: TOTAL_STEPS })}
            </span>
            {STEP_KEYS.map((key, index) => (
              <span
                key={key}
                aria-hidden="true"
                className={cn(
                  'h-3 w-8 rounded-full transition-colors',
                  index <= stepIndex ? 'bg-primary' : 'bg-[#747474]',
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 md:mt-4 md:gap-0">
          <h1 className="font-display text-[1.5rem] leading-[1] text-primary md:text-m">
            {t(`steps.${stepKey}.title`)}
          </h1>
          <p className="text-body text-foreground md:text-tiny">
            {t.rich(`steps.${stepKey}.body`, { br: () => <br className="hidden md:block" /> })}
          </p>
        </div>

        <div className="mt-6 h-[200px] overflow-hidden rounded-2xl bg-background md:mt-4 md:h-[300px]">
          {/* Placeholder test clip (2026-07-18, same file for every step) — swap in the real
              per-step platform screenshot/video once that asset exists. */}
          <video
            className="size-full object-cover"
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        <div className="mt-6 flex gap-2 md:mt-4">
          {!isFirstStep ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn('flex-1', isLastStep && 'hidden md:inline-flex')}
              onClick={() => setStepIndex((step) => step - 1)}
            >
              {t('back')}
            </Button>
          ) : null}

          {isLastStep ? (
            onFinish ? (
              <Button
                type="button"
                variant="primaryOutline"
                size="lg"
                className="flex-1"
                onClick={onFinish}
              >
                {t('next')}
              </Button>
            ) : (
              <Button asChild size="lg" className="flex-1">
                <Link href="/sign-up">
                  <FinishIcon />
                  {t('finish')}
                </Link>
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="primaryOutline"
              size="lg"
              className="flex-1"
              onClick={() => setStepIndex((step) => step + 1)}
            >
              {t('next')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
