'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog';
import { Button } from '@/components/ui/button';

/**
 * "See platform features" hero CTA — opens the onboarding tour as a popup (`OnboardingDialog`)
 * instead of navigating to a dedicated page (direct product request, 2026-07-18). Pulled out of
 * `HeroSection` (an async Server Component) into its own client island since opening a dialog
 * needs local state, same pattern as `WelcomeCtas`' "Find out who a Mindsetter is" button.
 */
export function OnboardingCta() {
  const t = useTranslations('home.hero');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outlineArrow"
        size="lg"
        className="mt-1 w-full px-5"
        onClick={() => setOpen(true)}
      >
        {t('seeFeatures')}
        <MindsetterArrowIcon />
      </Button>

      <OnboardingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
