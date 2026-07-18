import { Search, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ProfilePageIcon } from '@/components/icons/profile-page-icon';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * Mindsetter Congrats-screen CTAs (`docs/mindsetter-extended-onboarding.md` section 8) — the
 * simpler sibling of the Member congrats screen's `WelcomeCtas`: same button/icon conventions
 * (`primaryOutline` person+ icon, `ghost` search icon, and the large gradient `primary` bottom
 * CTA with the shared `ProfilePageIcon`), but with NO "Who is Mindsetter?" popup and NO
 * dismiss/swap-after-confirm logic — there's nothing left to explain to someone who just became
 * a Mindsetter. No client state is needed here, so this stays a plain async Server Component (no
 * `"use client"`, `getTranslations` instead of the client `useTranslations` hook), unlike
 * `WelcomeCtas`.
 *
 * All three destinations are explicit placeholders (`/`) — no event-invite, event-catalog, or
 * profile-preview route exists in the codebase yet (onboarding doc section D).
 */
export async function MindsetterCongratsCtas() {
  const t = await getTranslations('mindsetterOnboarding.congrats');

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3">
        <Button asChild variant="primaryOutline" size="lg" className="w-full sm:w-auto">
          {/* TODO: no event-invite route exists yet — placeholder destination. */}
          <Link href="/">
            <UserPlus aria-hidden="true" />
            {t('ctas.inviteEvent')}
          </Link>
        </Button>

        <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
          {/* TODO: no event-catalog route exists yet — placeholder destination. */}
          <Link href="/">
            <Search aria-hidden="true" />
            {t('ctas.findEvent')}
          </Link>
        </Button>
      </div>

      <div className="mt-[137px] md:mt-20">
        <Button asChild variant="primary" size="lg" className="w-full">
          {/* TODO: no public Mindsetter profile-preview route exists yet — placeholder. */}
          <Link href="/">
            <ProfilePageIcon />
            {t('ctas.seeProfile')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
