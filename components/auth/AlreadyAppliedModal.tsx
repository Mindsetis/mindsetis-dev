'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link, useRouter } from '@/i18n/navigation';

type AlreadyAppliedModalProps = {
  /** The signed-in caller's email, read server-side by `/join-applied` — never client state. */
  email: string;
};

/** Where both the primary button and the inline "Edit your existing details" link go. */
const EDIT_PROFILE_PATH = '/dashboard/profile';

/**
 * Release-1 A5's "you've already applied" dialog — the client's own wording, verbatim
 * (`docs`, dynamic-redirect item). `/join-applied` renders nothing else — this IS the page's
 * content, always open, with no trigger of its own.
 *
 * NO SIGN-OUT BUTTON (deliberate, and still an open question for the client)
 *   Her text has no sign-out action, only the ✕ / Edit Profile / support-email trio, so this
 *   doesn't add one on its own initiative. It's flagged back to her as an open question in
 *   `docs/release-1-log.md`: this dialog exists partly for "I don't remember which email I
 *   registered with", and without a sign-out here that visitor has to find the avatar menu
 *   instead — arguably the same friction the modal exists to remove. Her call, not ours.
 *
 * CLOSING (✕ / Esc / overlay click) GOES HOME
 *   All three are the same Radix `onOpenChange(false)` event. There is nothing left on this
 *   page once the dialog is gone — it exists solely to show this message — so leaving the
 *   visitor on a blank page would just be a second dead end. Sent to `/` rather than back to
 *   `/join` (impossible anyway: a signed-in visitor hitting `/join` bounces straight back here
 *   via `/continue`, see `middleware.ts`) or to `EDIT_PROFILE_PATH` (closing isn't the same
 *   gesture as choosing "Edit Profile" below, and shouldn't be treated as if it were). Also an
 *   open question to the client — her text just says the ✕ "closes the window", and there's no
 *   page underneath this dialog to fall back to, so `/` is the closest equivalent, not a
 *   confirmed answer.
 */
export function AlreadyAppliedModal({ email }: AlreadyAppliedModalProps) {
  const t = useTranslations('auth.alreadyApplied');
  const router = useRouter();

  function handleOpenChange(open: boolean) {
    if (open) return;
    router.push('/');
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      {/* Radix moves focus to the first focusable child on open by default. This dialog opens
          on NAVIGATION rather than on a click, so the browser treats that focus as
          keyboard-originated and paints the `focus-visible` ring: the visitor lands on a page
          with a button highlighted as if it were pre-selected (caught in manual testing,
          17.09.2026). Focus still has to enter the dialog — Esc and screen-reader announcement
          depend on it — so it goes to the content container instead of nowhere. */}
      <DialogContent
        // `focus:outline-none`: the container takes focus programmatically (below) and is not
        // keyboard-reachable — `tabindex="-1"` — so the browser's default ring around the whole
        // dialog would state something the visitor cannot act on. The button/links keep their
        // own `focus-visible` ring for real Tab navigation.
        className="max-w-[480px] focus:outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DialogHeader>
          {/* `break-words`: the one piece of this dialog's own text with no natural break point
              — the email itself. `DialogHeader`'s `min-w-0` (see `dialog.tsx`) lets the grid
              column shrink to the dialog's actual width; this is what then makes the browser
              actually break the token instead of overflowing the title's own box once it does.
              Measured live (real Chromium, `romanloza211+t03@gmail.com` in the title, both
              fixes applied): at 375px the dialog box is exactly 375×… (was overflowing past
              the viewport before this fix), `document.documentElement.scrollWidth` equals
              `window.innerWidth` (no horizontal scroll), and the title's own box stays inside
              the dialog's — it wrapped (taller box) instead of clipping or overflowing. At
              1280px the dialog holds its intended 480px with the `p-6` 24px inset on BOTH
              sides (24px/24px computed padding at both widths — the right inset used to
              disappear here). */}
          <DialogTitle className="break-words">{t('title', { email })}</DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={EDIT_PROFILE_PATH}>{t('editProfile')}</Link>
          </Button>
        </DialogFooter>

        {/* Three more lines from the client's own copy, in order: an inline link for anyone who
            didn't notice the button above, the one-profile-per-person notice, and a support
            contact. Plain paragraphs (not `DialogDescription`) — same precedent as
            `NotYetAvailable`'s `emailPromise` line, since the title itself already carries the
            one essential fact (which email this is) and Radix's Description slot is meant for a
            single summary, not three. */}
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            {t.rich('editPrompt', {
              link: (chunks) => (
                <Link
                  href={EDIT_PROFILE_PATH}
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p>{t('duplicateNotice')}</p>
          <p>
            {t.rich('supportLine', {
              link: (chunks) => (
                <a
                  href="mailto:support@mindsetis.com"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
