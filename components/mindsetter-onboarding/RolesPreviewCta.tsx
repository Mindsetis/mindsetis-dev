'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { Button } from '@/components/ui/button';

/**
 * "See how it looks" CTA on the Mindsetter onboarding "Your roles" step (`roles/page.tsx`) —
 * opens the same onboarding tour popup (`OnboardingDialog`) that originally lived behind the
 * homepage hero's "See platform features" button before that hero was removed with the
 * ROADMAP stage 1.11 coming-soon placeholder swap.
 *
 * This popup's last step shows a plain "Next" button that just closes the popup (`onFinish`)
 * instead of the default "Ok, continue registration" link to `/sign-up` — the caller is
 * already signed in and mid Mindsetter onboarding, so "continue registration" doesn't apply
 * here.
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
