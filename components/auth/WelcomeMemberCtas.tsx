'use client';

import { Search, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProfilePageIcon } from '@/components/icons/profile-page-icon';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/coming-soon';
import { Link } from '@/i18n/navigation';

/**
 * `/welcome`'s SECOND phase — Figma "Congrats screen" `421:3798`, reached by pressing "Continue
 * as Member" on the first phase (`WelcomeCtas`, frame `387:3000`). The two frames share a name
 * and a heading style but are different screens: the first pitches the Mindsetter upgrade, this
 * one is where someone who declined it lands.
 *
 * The three Member CTAs route nowhere: Mindsetter-matching, event invites and the event catalog
 * are unbuilt. They are disabled buttons wrapped in `ComingSoon`, which dims them and explains
 * why on hover/focus — deliberately not `<Link href="/">`, which used to bounce the caller to
 * the homepage and read as a broken destination rather than an unfinished feature.
 *
 * Button variants (product request, 2026-07-17): "Find Mindseter for me" `primaryOutline`
 * (gradient border); "Invite on Mindsetis event" plain `outline`; "Find Mindsetis event"
 * borderless `ghost`; "See how looks my profile page" `primary` (gradient background), linking
 * to the caller's own Member profile (`/members/{username}` — locale-prefixed automatically by
 * the next-intl `Link`). `username` is resolved server-side by `/welcome/page.tsx` from the
 * session; if it's missing we fall back to the homepage rather than emit a broken `/members/`.
 */
export function WelcomeMemberCtas({ username }: { username: string | null }) {
  const t = useTranslations('auth.welcome.ctas');

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3">
        <ComingSoon className="w-full">
          <Button type="button" variant="primaryOutline" size="lg" disabled className="w-full">
            <Search aria-hidden="true" />
            {t('findMindsetter')}
          </Button>
        </ComingSoon>

        <ComingSoon className="w-full">
          <Button type="button" variant="outline" size="lg" disabled className="w-full">
            <UserPlus aria-hidden="true" />
            {t('inviteEvent')}
          </Button>
        </ComingSoon>

        <ComingSoon className="w-full">
          <Button type="button" variant="ghost" size="lg" disabled className="w-full">
            <Search aria-hidden="true" />
            {t('findEvent')}
          </Button>
        </ComingSoon>
      </div>

      {/* Deliberately large, asymmetric gap to the profile-preview button below — 80px desktop
          (measured on `421:3798`: the CTA stack ends at y=538, this button starts at y=618), but
          MORE on mobile (137px), per direct product request 2026-07-17. */}
      <div className="mt-[137px] md:mt-20">
        {/* Sits at the very bottom of a finished wizard, where nothing else on screen suggests
            there is anything left to do — so it has to draw the eye itself. See `cta-hover-lift`
            in `app/styles/tokens/motion.css`. */}
        <Button asChild variant="primary" size="lg" className="w-full cta-hover-lift">
          <Link href={username ? `/members/${username}` : '/'}>
            <ProfilePageIcon />
            {t('seeProfile')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
