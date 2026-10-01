'use client';

import { useTranslations } from 'next-intl';

import { MindsetterArrowIcon } from '@/components/icons/mindsetter-arrow-icon';
import { Button } from '@/components/ui/button';
import { NotYetAvailable } from '@/components/ui/not-yet-available';
import { EXAMPLE_PROFILE_URL } from '@/lib/config/example-profile';

/**
 * "See how it looks" on the Roles step. Opens the client's showcase profile in a new tab (client
 * request, 2026-09-29) — `EXAMPLE_PROFILE_URL`, shared with `/welcome`'s "See example". That
 * profile doesn't exist yet, so until the URL is configured the button opens the same "Example
 * pages are on the way" dialog as "See example" (owner's choice; it used to open the homepage's
 * platform tour, `OnboardingDialog`, which is unchanged and still used on the homepage).
 */
export function RolesPreviewCta() {
  const t = useTranslations('mindsetterOnboarding');

  if (EXAMPLE_PROFILE_URL) {
    return (
      <Button asChild variant="outlineArrow" size="lg" className="w-full px-5">
        <a href={EXAMPLE_PROFILE_URL} target="_blank" rel="noopener noreferrer">
          {t('roles.seeHowItLooks')}
          <MindsetterArrowIcon />
        </a>
      </Button>
    );
  }

  return (
    <NotYetAvailable feature="exampleProfile" className="w-full">
      <Button type="button" variant="outlineArrow" size="lg" disabled className="w-full px-5">
        {t('roles.seeHowItLooks')}
        <MindsetterArrowIcon disabled />
      </Button>
    </NotYetAvailable>
  );
}
