'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { signOut } from '@/app/[locale]/(app)/(auth)/actions';
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

type AlreadyAppliedModalProps = {
  /** The signed-in caller's email, read server-side by `/join-applied` — never client state. */
  email: string;
};

/**
 * Release-1 A5's "you've already applied" dialog. `/join-applied` renders nothing else — this
 * IS the page's content, always open, with no trigger of its own.
 *
 * CLOSING (✕ / Esc / overlay click) GOES HOME
 *   All three are the same Radix `onOpenChange(false)` event. There is nothing left on this
 *   page once the dialog is gone — it exists solely to show this message — so leaving the
 *   visitor on a blank page would just be a second dead end. Sent to `/` rather than back to
 *   `/join` (impossible anyway: a signed-in visitor hitting `/join` bounces straight back here
 *   via `/continue`, see `middleware.ts`) or to `/dashboard` (closing isn't the same gesture as
 *   choosing "go to my dashboard" below, and shouldn't be treated as if it were).
 */
export function AlreadyAppliedModal({ email }: AlreadyAppliedModalProps) {
  const t = useTranslations('auth.alreadyApplied');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(open: boolean) {
    if (open) return;
    router.push('/');
  }

  function handleSignOut() {
    startTransition(async () => {
      const result = await signOut({});
      if (!result.ok) {
        console.error('[join-applied] sign-out failed:', result.error.message);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      {/* Radix moves focus to the first focusable child on open — here the "Sign out" button,
          which `DialogFooter`'s `flex-col-reverse` puts first in the DOM. This dialog opens on
          NAVIGATION rather than on a click, so the browser treats that focus as
          keyboard-originated and paints the `focus-visible` ring: the visitor lands on a page
          with "Sign out" highlighted as if it were the suggested action (caught in manual
          testing, 17.09.2026). Focus still has to enter the dialog — Esc and screen-reader
          announcement depend on it — so it goes to the content container instead of nowhere. */}
      <DialogContent
        // `focus:outline-none`: the container takes focus programmatically (below) and is not
        // keyboard-reachable — `tabindex="-1"` — so the browser's default ring around the whole
        // dialog would state something the visitor cannot act on. The buttons keep their own
        // `focus-visible` ring for real Tab navigation.
        className="max-w-[480px] focus:outline-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body', { email })}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={handleSignOut}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? t('signingOut') : t('signOutCta')}
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">{t('primaryCta')}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
