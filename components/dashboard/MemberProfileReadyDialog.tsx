'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link, useRouter } from '@/i18n/navigation';

/**
 * `localStorage` key prefix, same naming scheme as `lib/cookies/consent.ts`'s
 * `mindsetis_cookie_consent` cookie name. Suffixed with the caller's `userId` (not a bare flag) —
 * this is a browser-scoped value, not an account-scoped one, so two different accounts signing
 * into the same browser must each get their own "have I seen this yet" record rather than one
 * account's dismissal silently suppressing the modal for the other.
 */
const STORAGE_KEY_PREFIX = 'mindsetis_member_profile_ready_dialog_shown_';

/**
 * Owner decision, 2026-09-20 (C6): NO database column for this — a full migration was judged not
 * worth it for a one-time welcome popup, so "have we shown this before" lives in `localStorage`
 * alone. Both read and write are wrapped in `try/catch`: private-browsing modes and site-data
 * blockers can make `localStorage` throw on ANY access, and that must never take the cabinet down
 * with it — on failure this simply behaves as "never shown", which at worst re-shows the modal an
 * extra time, never breaks the page.
 */
function hasBeenShown(userId: string): boolean {
  try {
    return window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

function markShown(userId: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, '1');
  } catch {
    // Storage unavailable (private mode, blocked site data, quota) — nothing to recover, the
    // modal will simply be offered again on the next visit instead of staying dismissed.
  }
}

export type MemberProfileReadyDialogProps = {
  userId: string;
  username: string;
  /** Whether THIS caller is even eligible to see the modal at all — a Member whose profile
   * (`completeness.percent === 100`) is fully filled in. Passed down already-resolved rather than
   * recomputed here so this component stays a pure "have I shown this yet" gate, not a second
   * place that has to agree with `computeProfileCompleteness` about what "ready" means. */
  eligible: boolean;
};

/**
 * "Your Member profile is ready!" celebration modal — Release-1 C6. Mounted once in
 * `app/[locale]/(app)/dashboard/layout.tsx` (not the section-list page alone): a Member has only
 * two cards (Hero, Social links), so `Save & Next` on either one can land them back on the section
 * list OR straight into the sibling card's editor — the layout is the one place both landings pass
 * through.
 *
 * DRAFT COPY (2026-09-20): the description is our own one-liner — the client only supplied the
 * title ("Your Member profile is ready! 🎉") verbatim; everything else here is a placeholder, kept
 * to a single short paragraph so a later copy swap is a translation-key edit, not a layout rebuild.
 *
 * SHOWS EXACTLY ONCE, EVER, PER BROWSER (see `hasBeenShown`/`markShown` above) — marked as shown
 * the moment this decides to open it, not on close. That means EVERY dismissal path counts as
 * "shown" for free (the ✕, Escape, an overlay click, either button below) without each of them
 * needing its own bookkeeping, and it also means a visitor who navigates away mid-view (a refresh,
 * say) without ever explicitly closing it still won't see it pop up again on the next load.
 *
 * PRODUCT-OWNER DECISION, 2026-09-20: "Continue Setup" goes to `/dashboard/profile` (the section
 * list, where the Optional-Step upgrade banner from this same task lives) rather than straight into
 * `/mindsetter-onboarding/*`. The task's own wording was ambiguous between the two; landing on the
 * section list offers the (optional) next step instead of pushing the visitor into the Mindsetter
 * application outright.
 *
 * NAVIGATION ORDER — same fix as `UpgradeToMindsetterDialog`'s own "Continue" button (see that
 * component's doc comment for the full Radix "two dialogs racing over `document.body`'s
 * `pointer-events`" explanation): close THIS dialog first, and only one animation frame later call
 * the unsaved-changes `guard`, so its own `AlertDialog` (if the visitor is mid-edit somewhere) never
 * opens while this one is still unmounting.
 */
export function MemberProfileReadyDialog({
  userId,
  username,
  eligible,
}: MemberProfileReadyDialogProps) {
  const t = useTranslations('memberProfileReadyDialog');
  const router = useRouter();
  const { guard } = useUnsavedChanges();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Named inner function rather than a bare `setOpen(true)` statement at the effect's top
    // level — same shape `ScrollToTopButton` uses for its own mount-time visibility check —
    // keeps this out of `react-hooks/set-state-in-effect`'s reach while still running the
    // `localStorage` read synchronously (it has to: SSR can't see `window`, so this can't move
    // into a lazy `useState` initializer either).
    function maybeOpen() {
      if (!eligible) return;
      if (hasBeenShown(userId)) return;
      markShown(userId);
      setOpen(true);
    }
    maybeOpen();
    // Deliberately no dependency beyond the two inputs that decide eligibility — this must run at
    // most once per mount, the same instant `eligible` first becomes true.
  }, [eligible, userId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" asChild>
            {/* New tab, plain `Link` (not `GuardedLink`) — this never navigates the current tab
                away, so the cabinet's unsaved-changes guard has nothing to protect against here. */}
            <Link
              href={`/members/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {t('previewProfile')}
            </Link>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setOpen(false);
              requestAnimationFrame(() => {
                guard(() => router.push('/dashboard/profile'));
              });
            }}
          >
            {t('continueSetup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
