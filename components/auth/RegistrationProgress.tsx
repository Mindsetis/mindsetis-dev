import { cn } from '@/lib/utils';

type RegistrationProgressProps = {
  step: number;
  total: number;
  /** Accessible label, e.g. "Step 1 of 4" — visual "1/4" text is rendered separately. */
  label: string;
};

/**
 * Segmented step indicator + "n/total" — Figma "Registration" (mobile `165:2853`, node
 * `401:6989`) / "Registration 1/4 - 1440 px" (desktop `387:1725`, node `387:1911`).
 *
 * Used by all four registration-wizard steps — `/sign-up` (1), `/verify-email` (2),
 * `/member-profile` (3), `/build-profile` (4) — each passing its own `step`/`label`; there's no
 * internal state here, the caller (the URL/page) is the source of truth for which step is
 * "current". Distinct from the onboarding flow's own stepper (`OnboardingFlow.tsx`), which
 * tracks its own real state.
 *
 * Three visual states per segment (stage 1.4 Figma audit — previously only 2: solid vs
 * `bg-card`):
 *   - **done** (`index < step - 1`): solid `bg-primary` fill, same as before.
 *   - **current** (`index === step - 1`): a "soft glow" — the `bg-card` (`#1a1a1a`) track with
 *     two stacked translucent cyan layers (`#04c7ff4d` + `#4ea6ed4d`, ~30% opacity each)
 *     overlaid, distinct from the solid "done" fill.
 *   - **future** (`index > step - 1`): the same `bg-card` track with a single translucent
 *     `#04c7ff4d` layer (a faint cyan tint, not a plain flat gray).
 * No matching Tailwind/theme tokens exist for the two translucent hex values yet (they're
 * specific to this one Figma effect) — kept as arbitrary-value utilities rather than adding
 * one-off `--color-*` tokens for a single consumer.
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
        // 4px gap between segments (Figma); 12px segment height set per-segment below.
        className="flex flex-1 items-center gap-1"
      >
        {/* Segments stretch to fill the container so the bar spans the form width. */}
        {Array.from({ length: total }, (_, index) => {
          const isDone = index < step - 1;
          const isCurrent = index === step - 1;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'relative h-3 flex-1 overflow-hidden rounded-full',
                isDone ? 'bg-primary' : 'bg-card',
              )}
            >
              {isCurrent ? (
                <>
                  <span className="absolute inset-0 bg-[#04c7ff4d]" />
                  <span className="absolute inset-0 bg-[#4ea6ed4d]" />
                </>
              ) : null}
              {!isDone && !isCurrent ? <span className="absolute inset-0 bg-[#04c7ff4d]" /> : null}
            </span>
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
