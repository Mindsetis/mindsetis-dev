import { cn } from '@/lib/utils';

type RegistrationProgressProps = {
  step: number;
  total: number;
  /** Accessible label, e.g. "Step 1 of 4" — visual "1/4" text is rendered separately. */
  label: string;
  /**
   * When true, every segment up to and including `step` renders as "done" (solid
   * `bg-primary`) and none renders as "current" — for the Congrats screen (`/welcome`),
   * whose `step === total` has no "next" step to still be "in progress" toward. The `n/total`
   * text is unaffected (still driven by `step`/`total` directly).
   */
  complete?: boolean;
};

/**
 * Segmented step indicator + "n/total" — Figma "Registration" (mobile `165:2853`, node
 * `401:6989`) / "Registration 1/4 - 1440 px" (desktop `387:1725`, node `387:1911`).
 *
 * Used by all four registration-wizard steps — `/sign-up` (1), `/verify-email` (2),
 * `/member-profile` (3), `/build-profile` (4) — each passing its own `step`/`label`; there's no
 * internal state here, the caller (the URL/page) is the source of truth for which step is
 * "current". Distinct from the onboarding tour popup's own stepper (`OnboardingDialog.tsx`),
 * which tracks its own real state.
 *
 * Three visual states per segment (colors per direct product request, 2026-07-17):
 *   - **done** (`index < step - 1`): solid `bg-primary` (`#79b9e3`).
 *   - **current** (`index === step - 1`): flat `rgba(78, 166, 237, 0.3)`.
 *   - **future** (`index > step - 1`): solid `bg-card` (`#1a1a1a`).
 */
export function RegistrationProgress({ step, total, label, complete }: RegistrationProgressProps) {
  return (
    <div className="flex w-full items-center gap-4">
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label}
        // 4px gap between segments (Figma); 12px segment height set per-segment below.
        className="flex flex-1 items-center gap-1"
      >
        {/* Segments stretch to fill the container so the bar spans the form width. */}
        {Array.from({ length: total }, (_, index) => {
          const isDone = complete ? index < step : index < step - 1;
          const isCurrent = complete ? false : index === step - 1;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'h-3 flex-1 rounded-full',
                isDone && 'bg-primary',
                isCurrent && 'bg-[rgba(78,166,237,0.3)]',
                !isDone && !isCurrent && 'bg-card',
              )}
            />
          );
        })}
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
