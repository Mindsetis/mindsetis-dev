'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { Button } from '@/components/ui/button';

/**
 * "See how it looks" CTA on the Mindsetter onboarding "Your roles" step (`roles/page.tsx`) —
 * reuses the SAME onboarding tour popup as the homepage's "See platform features" button
 * (`OnboardingCta` → `OnboardingDialog`), styled to match it exactly (`outlineArrow`, full width,
 * trailing `MindsetterArrowIcon`, `px-5` padding override — see `OnboardingCta.tsx`).
 *
 * Unlike the homepage's usage, this popup's last step shows a plain "Next" button that just
 * closes the popup (`onFinish`) instead of the default "Ok, continue registration" link to
 * `/sign-up` — the caller is already signed in and mid Mindsetter onboarding, so "continue
 * registration" doesn't apply here.
 */
export function RolesPreviewCta() {
  const t = useTranslations('mindsetterOnboarding');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outlineArrow"
        size="lg"
        className="w-full px-5"
        onClick={() => setOpen(true)}
      >
        {t('roles.seeHowItLooks')}
        <MindsetterArrowIcon />
      </Button>

      <OnboardingDialog open={open} onOpenChange={setOpen} onFinish={() => setOpen(false)} />
    </>
  );
}
