'use client';

import { UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type OnboardingFlowProps = {
  /** Carried over from the Welcome-screen email capture (`HeroEmailCta`), if present. */
  initialEmail?: string;
};

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;
const TOTAL_STEPS = STEP_KEYS.length;

/**
 * Onboarding modal-card flow — Figma "Onboarding - 1..4" (mobile) / "Onboarding - 1..3 -
 * 1440 px" (desktop). Client Component: the only interactivity in the whole feature (step
 * navigation), everything else is static per-step copy.
 *
 * NOTE: Figma has no desktop frame for step 4 (only two duplicate copies of step 3 exist at
 * 1440px) — the step-4 card here is extrapolated from the same container/typography pattern
 * used by desktop steps 1–3, combined with the real step-4 copy from the mobile frame
 * ("Onboarding - 4"). Flag this to design if the real desktop step-4 layout differs.
 */
export function OnboardingFlow({ initialEmail }: OnboardingFlowProps) {
  const t = useTranslations('onboarding');
  const [stepIndex, setStepIndex] = useState(0);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOTAL_STEPS - 1;
  const stepKey = STEP_KEYS[stepIndex];

  const signUpHref = initialEmail
    ? `/sign-up?email=${encodeURIComponent(initialEmail)}`
    : '/sign-up';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-[736px] rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
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
                  index <= stepIndex ? 'bg-primary' : 'bg-white/10',
                )}
              />
            ))}
          </div>

          <Link
            href="/"
            aria-label={t('close')}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:text-muted-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <h1 className="font-display text-[1.5rem] leading-[1] text-primary md:text-m">
            {t(`steps.${stepKey}.title`)}
          </h1>
          <p className="text-body text-foreground md:text-tiny">{t(`steps.${stepKey}.body`)}</p>
        </div>

        <div className="mt-8 flex h-[200px] items-center justify-center rounded-2xl bg-background px-6 text-center text-base font-bold text-foreground md:h-[300px]">
          {t('screenshotPlaceholder')}
        </div>

        <div className="mt-8 flex gap-3">
          {!isFirstStep ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStepIndex((step) => step - 1)}
            >
              {t('back')}
            </Button>
          ) : null}

          {isLastStep ? (
            <Button asChild size="lg" className="flex-1">
              <Link href={signUpHref}>
                <UserPlus aria-hidden="true" />
                {t('finish')}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 border-primary text-primary shadow-glow-primary hover:bg-primary/10"
              onClick={() => setStepIndex((step) => step + 1)}
            >
              {t('next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
