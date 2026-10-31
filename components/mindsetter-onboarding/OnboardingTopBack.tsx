'use client';

import { useTranslations } from 'next-intl';

import { BackArrowIcon } from '@/components/auth/RegistrationBackLink';
import { GuardedLink } from '@/components/dashboard/GuardedLink';

/**
 * The Mindsetter wizard's Back, top-left above the heading (call of 28.10.2026, Release-2 П6:
 * "Back in the top-left corner, for consistency" with the Member wizard). It replaces the bottom
 * Back that sat beside "Save & Continue" since 2026-09-29. Occupies exactly the 56/52px band the
 * pages had kept as an empty spacer since then, so headings don't move.
 *
 * A `GuardedLink`, unlike `RegistrationBackLink`'s plain `Link`: every wizard form reports its
 * unsaved edits through `useSectionDirtyGuard`, and stepping back must ask before dropping them,
 * the same as every other way out of the step.
 */
export function OnboardingTopBack({ href }: { href: string }) {
  const t = useTranslations('dashboard.profile');
  return (
    <div className="flex h-14 items-center md:h-[52px]">
      <GuardedLink
        href={href}
        className="flex shrink-0 items-center gap-1 text-base font-bold text-foreground hover:text-muted-foreground"
      >
        <BackArrowIcon />
        {t('back')}
      </GuardedLink>
    </div>
  );
}
