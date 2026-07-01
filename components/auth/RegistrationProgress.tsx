import { cn } from '@/lib/utils';

type RegistrationProgressProps = {
  step: number;
  total: number;
  /** Accessible label, e.g. "Step 1 of 4" — visual "1/4" text is rendered separately. */
  label: string;
};

/**
 * Segmented step indicator + "1/4" — Figma "Registration" (mobile `165:2853`, node
 * `401:6989`) / "Registration 1/4 - 1440 px" (desktop `387:1725`, node `387:1911`).
 *
 * Purely decorative/static: this app doesn't (yet) implement the multi-step registration
 * funnel the design implies (account → verify → profile → …) — only step 1 ("Create
 * account") exists today, so this always renders `1/4` and never advances. Distinct from the
 * onboarding flow's own stepper (`OnboardingFlow.tsx`), which tracks its own real state.
 */
export function RegistrationProgress({ step, total, label }: RegistrationProgressProps) {
  return (
    <div className="flex w-full items-center gap-4">
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
        className="flex flex-1 items-center gap-2"
      >
        {/* Segments stretch to fill the container so the bar spans the form width. */}
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn('h-1.5 flex-1 rounded-full', index < step ? 'bg-primary' : 'bg-card')}
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className="text-tiny font-bold tracking-[0.3em] whitespace-nowrap text-muted-foreground uppercase"
      >
        {step}/{total}
      </span>
    </div>
  );
}
