import { getTranslations } from 'next-intl/server';

import { RegistrationBackLink } from '@/components/auth/RegistrationBackLink';
import { RegistrationProgress } from '@/components/auth/RegistrationProgress';

type RegistrationStepHeaderProps = {
  backHref: string;
  step: number;
  total: number;
  label: string;
};

/**
 * Shared step-header chrome (Back link + `RegistrationProgress`) for the four registration
 * wizard pages (`/sign-up`, `/verify-email`, `/member-profile`, `/build-profile`) — previously
 * duplicated verbatim in each page. Composes `RegistrationBackLink`/`RegistrationProgress`
 * rather than reimplementing them.
 *
 * `label` is the `RegistrationProgress` accessible label (e.g. "Step 1 of 4" — caller-supplied
 * since it embeds the step number). The Back link's own label (`t('signUp.back')`, "Back") is
 * identical across all four steps, so this (async server) component fetches it itself instead
 * of taking it as a prop.
 *
 * Layout: on mobile the progress bar renders above the Back link (`flex-col-reverse`, Back
 * stays the first JSX child so `RegistrationBackLink`'s own `md:absolute` positioning trick
 * still works on desktop), left-aligned, 12px gap. On desktop this is unchanged from the prior
 * inline layout — Back is absolutely pinned to the left edge, the progress bar is centered.
 */
export async function RegistrationStepHeader({
  backHref,
  step,
  total,
  label,
}: RegistrationStepHeaderProps) {
  const t = await getTranslations('auth');

  return (
    <div className="relative mb-8 flex flex-col-reverse items-start gap-3 md:mb-[100px] md:flex-row md:items-center md:justify-center md:gap-4">
      <RegistrationBackLink href={backHref} label={t('signUp.back')} />

      {/* Progress spans the form width (max-w-640) and is centered over the form. */}
      <div className="w-full max-w-[640px] flex-1 md:flex-none">
        <RegistrationProgress step={step} total={total} label={label} />
      </div>
    </div>
  );
}
