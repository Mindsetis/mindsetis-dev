import { Unlock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import { UpgradeToMindsetterTrigger } from '@/components/mindsetter/UpgradeToMindsetterTrigger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export type MemberStatusBannerProps = {
  accountType: 'member' | 'mindsetter';
  /** The Member already started the Mindsetter wizard (Release-2 П5). */
  wizardStarted: boolean;
};

/**
 * Standing "Your status: Member" banner at the top of the cabinet — Release-1 C5. Built as an
 * exact sibling of `PhotoReminderBanner` (same `Alert` neutral variant, same server-component
 * shape, same slot in `app/[locale]/(app)/dashboard/layout.tsx`) rather than a one-off, so the two
 * banners stack consistently when both apply.
 *
 * `accountType === 'mindsetter'` renders nothing (product-owner decision, 2026-09-20): a
 * Mindsetter already has what this banner is nudging a Member toward, so there is nothing to
 * upsell them into. Unlike `PhotoReminderBanner`, this has no OTHER gating condition — it shows
 * for every Member, complete profile or not.
 *
 * "Upgrade Now" opens the `UpgradeToMindsetterDialog` confirmation (Release-1 C7) via the shared
 * `UpgradeToMindsetterTrigger` island, not a direct link to `/mindsetter-onboarding/roles` — same
 * destination-behind-a-confirmation change applied to the header and landing-page "Upgrade" CTAs.
 *
 * Once the Member has started the wizard (`wizardStarted`, Release-2 П5 — call of 28.10.2026) the
 * pitch is replaced by a reminder and "Continue Registration", which goes straight to the
 * wizard's entry route and resumes at the next unsaved step — no upgrade dialog in front of it.
 */
export async function MemberStatusBanner({ accountType, wizardStarted }: MemberStatusBannerProps) {
  if (accountType !== 'member') return null;

  const t = await getTranslations('dashboard.statusBanner');

  return (
    <Alert>
      <Unlock aria-hidden="true" />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription>
        {wizardStarted ? (
          <>
            <p>{t('inProgressBody')}</p>
            <Button asChild size="sm" className="mt-2">
              <GuardedLink href="/mindsetter-onboarding">{t('inProgressCta')}</GuardedLink>
            </Button>
          </>
        ) : (
          <>
            <p>{t('body')}</p>
            <UpgradeToMindsetterTrigger size="sm" className="mt-2">
              {t('cta')}
            </UpgradeToMindsetterTrigger>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
