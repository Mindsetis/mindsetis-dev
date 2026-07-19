import { getTranslations } from 'next-intl/server';

import { ProfilePageIcon } from '@/components/icons/profile-page-icon';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** "Find Mindsetis event" icon (16×16, white) — provided verbatim by the designer, replacing
 * `lucide-react`'s `Search`. */
function FindEventIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M14.4742 13.5266L12.0009 11.0733C12.961 9.87621 13.4259 8.3568 13.3001 6.82747C13.1743 5.29814 12.4674 3.87512 11.3246 2.85103C10.1818 1.82694 8.69012 1.27961 7.15619 1.32158C5.62227 1.36356 4.16273 1.99164 3.07767 3.0767C1.99262 4.16175 1.36453 5.62129 1.32256 7.15522C1.28059 8.68914 1.82792 10.1808 2.85201 11.3236C3.8761 12.4664 5.29911 13.1733 6.82845 13.2991C8.35778 13.4249 9.87719 12.96 11.0742 11.9999L13.5276 14.4533C13.5896 14.5158 13.6633 14.5654 13.7445 14.5992C13.8258 14.633 13.9129 14.6505 14.0009 14.6505C14.0889 14.6505 14.1761 14.633 14.2573 14.5992C14.3385 14.5654 14.4123 14.5158 14.4742 14.4533C14.5944 14.329 14.6616 14.1628 14.6616 13.9899C14.6616 13.817 14.5944 13.6509 14.4742 13.5266ZM7.33425 11.9999C6.41127 11.9999 5.50901 11.7262 4.74158 11.2135C3.97416 10.7007 3.37602 9.97185 3.02281 9.11913C2.6696 8.2664 2.57718 7.32809 2.75725 6.42285C2.93731 5.5176 3.38177 4.68608 4.03441 4.03344C4.68706 3.38079 5.51858 2.93634 6.42382 2.75627C7.32907 2.57621 8.26738 2.66862 9.1201 3.02183C9.97282 3.37504 10.7017 3.97318 11.2144 4.74061C11.7272 5.50804 12.0009 6.41029 12.0009 7.33327C12.0009 8.57095 11.5092 9.75793 10.6341 10.6331C9.75891 11.5083 8.57192 11.9999 7.33425 11.9999Z"
        fill="white"
      />
    </svg>
  );
}

/** "Invite on Mindsetis event" icon (16×16, `#79B9E3`) — provided verbatim by the designer,
 * replacing `lucide-react`'s `UserPlus`. */
function InviteEventIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8.5705 9.36388C9.02423 9.41218 9.33268 9.8206 9.33268 10.2769V13.667C9.33268 14.2193 8.88497 14.667 8.33268 14.667H3.66601C3.11373 14.667 2.65622 14.2151 2.75859 13.6724C3.22451 11.2022 5.39372 9.33366 7.99935 9.33366C8.19229 9.33366 8.38285 9.3439 8.5705 9.36388ZM7.99935 8.66699C5.78935 8.66699 3.99935 6.87699 3.99935 4.66699C3.99935 2.45699 5.78935 0.666992 7.99935 0.666992C10.2093 0.666992 11.9993 2.45699 11.9993 4.66699C11.9993 6.87699 10.2093 8.66699 7.99935 8.66699ZM11.9993 11.3337V10.0003C11.9993 9.63214 12.2978 9.33366 12.666 9.33366C13.0342 9.33366 13.3327 9.63214 13.3327 10.0003V11.3337H14.666C15.0342 11.3337 15.3327 11.6321 15.3327 12.0003C15.3327 12.3685 15.0342 12.667 14.666 12.667H13.3327V14.0003C13.3327 14.3685 13.0342 14.667 12.666 14.667C12.2978 14.667 11.9993 14.3685 11.9993 14.0003V12.667H10.666C10.2978 12.667 9.99935 12.3685 9.99935 12.0003C9.99935 11.6321 10.2978 11.3337 10.666 11.3337H11.9993Z"
        fill="#79B9E3"
      />
    </svg>
  );
}

/**
 * Mindsetter Congrats-screen CTAs (`docs/mindsetter-extended-onboarding.md` section 8) — the
 * simpler sibling of the Member congrats screen's `WelcomeCtas`: same button/icon conventions
 * (`primaryOutline` person+ icon, `outline` bordered search icon, and the large gradient
 * `primary` bottom CTA with the shared `ProfilePageIcon`), but with NO "Who is Mindsetter?"
 * popup and NO dismiss/swap-after-confirm logic — there's nothing left to explain to someone who
 * just became a Mindsetter. No client state is needed here, so this stays a plain async Server
 * Component (no `"use client"`, `getTranslations` instead of the client `useTranslations` hook),
 * unlike `WelcomeCtas`.
 *
 * "Find event"/"Invite" row (2026-07-19 follow-up): side by side on desktop, evenly split
 * (`md:flex-1` on both — Find first, Invite second) but stacked full-width on mobile with the
 * OPPOSITE visual order (Invite first, Find second). DOM order stays Invite-then-Find — matching
 * the mobile order needs no override — and `md:order-*` swaps them visually at desktop only,
 * same "keep DOM order fixed, swap via CSS order" precedent `WhoIsMindsetterDialog`'s footer
 * buttons already use.
 *
 * All three destinations are explicit placeholders (`/`) — no event-invite, event-catalog, or
 * profile-preview route exists in the codebase yet (onboarding doc section D).
 */
export async function MindsetterCongratsCtas() {
  const t = await getTranslations('mindsetterOnboarding.congrats');

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <Button asChild variant="primaryOutline" size="lg" className="w-full md:order-2 md:flex-1">
          {/* TODO: no event-invite route exists yet — placeholder destination. */}
          <Link href="/">
            <InviteEventIcon />
            {t('ctas.inviteEvent')}
          </Link>
        </Button>

        <Button asChild variant="outline" size="lg" className="w-full md:order-1 md:flex-1">
          {/* TODO: no event-catalog route exists yet — placeholder destination. */}
          <Link href="/">
            <FindEventIcon />
            {t('ctas.findEvent')}
          </Link>
        </Button>
      </div>

      <div className="mt-[236px] md:mt-[116px]">
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
