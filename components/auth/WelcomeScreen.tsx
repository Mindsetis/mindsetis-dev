'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { WelcomeCtas } from '@/components/auth/WelcomeCtas';
import { WelcomeMemberCtas } from '@/components/auth/WelcomeMemberCtas';

/**
 * `/welcome`'s body — TWO Figma frames behind one route, switched by "Continue as Member":
 *
 * 1. `387:3000` "Congrats screen" — "Your Member application has been received", the white
 *    "What's the difference…" pill, the Mindsetter pitch card, and Apply / Continue / Learn more
 *    (`WelcomeCtas`).
 * 2. `421:3798` — "You are now a member of the community" plus the three Member CTAs and "See
 *    how looks my profile page" (`WelcomeMemberCtas`), shown once the visitor declines the
 *    Mindsetter upgrade.
 *
 * The HEADING changes with the phase too, which is why it lives here rather than in the page's
 * Server Component: the two frames carry different copy (`title` vs `memberTitle`), and only
 * this component knows which one is on screen.
 *
 * Phase state is local and NOT persisted — a reload returns to phase 1. That matches what this
 * screen is (a choice about what to show next, not a saved preference) and keeps the Mindsetter
 * path reachable instead of one-way-dismissable; nothing about the account changes either way,
 * since "Member" is already what the visitor is by this point in the wizard.
 */
export function WelcomeScreen({ username }: { username: string | null }) {
  const t = useTranslations('auth.welcome');
  const [continuedAsMember, setContinuedAsMember] = useState(false);

  return (
    <>
      {/* Only the "Congratulations!" line is gradient-filled (`accent`, exact stops supplied by
          the designer 2026-08-18); the lines under it stay flat white (`text-foreground` = #fff
          on the `h1`). Hardcoded inline rather than reusing `--gradient-primary`: that token is
          the *button* gradient and differs slightly (91.51deg, #c3e4f9, stops 0/51.73/100%), so
          this would silently drift from the spec. Same pattern the hero headline already uses
          (`HeroSection.tsx`). `bg-clip-text` + `text-transparent` clips to that span's own text
          box, so the gradient spans "Congratulations!" alone, not the whole heading.

          `brDesktop` is `hidden md:block` — phase 1's heading is 3 lines on desktop but 2 on
          mobile (confirmed via the raw Figma text data). Phase 2's copy has no such split, so it
          only uses `br`; passing an unused tag to `t.rich` is harmless. */}
      <h1 className="font-display text-h1 text-foreground md:text-h3">
        {t.rich(continuedAsMember ? 'memberTitle' : 'title', {
          accent: (chunks) => (
            <span className="bg-[linear-gradient(91.2deg,#c3e4fa_1.66%,#79b9e3_50.18%,#21b8e6_99.72%)] bg-clip-text text-transparent">
              {chunks}
            </span>
          ),
          brDesktop: () => <br className="hidden md:block" />,
          br: () => <br />,
        })}
      </h1>

      {continuedAsMember ? (
        <WelcomeMemberCtas username={username} />
      ) : (
        <WelcomeCtas onContinueAsMember={() => setContinuedAsMember(true)} />
      )}
    </>
  );
}
