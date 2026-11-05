'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type ThreeWaysPopupCardProps = {
  /** The card face (number + title + description) — rendered on the server, passed through. */
  children: ReactNode;
  /** Classes of the card surface (background, text colour, padding, radius). */
  className: string;
  title: string;
  body: string;
  /** The viewer-specific line: "we'll email you" (signed in) or "apply to join" (guest). */
  extra: string;
  isGuest: boolean;
  gotItLabel: string;
  applyLabel: string;
  closeLabel: string;
};

/**
 * A "Three ways…" card that opens a "coming soon" popup (client edit 03.11.2026) instead of
 * navigating. The whole card is the `DialogTrigger` (a real `<button>`, so Enter/Space and focus
 * return on close come from Radix). Dismissal on ×, outside click and Esc is Radix's default.
 *
 * LAUNCH SWITCH: when the directory / Events go live, replace this component at the call site in
 * `ThreeWaysToStart.tsx` with a plain `<Link>` card to the real destination, and send the
 * launch email to signed-in users and applicants (not part of this edit).
 *
 * The built-in close button is swapped for a `DialogCloseButton` with an enlarged invisible hit
 * area (`after:-inset-1.5` → 44x44 around the 32px disc) so it is comfortable to tap on mobile.
 */
export function ThreeWaysPopupCard({
  children,
  className,
  title,
  body,
  extra,
  isGuest,
  gotItLabel,
  applyLabel,
  closeLabel,
}: ThreeWaysPopupCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full cursor-pointer text-left outline-none transition-[filter,transform] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]',
            className,
          )}
        >
          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[480px]" showCloseButton={false}>
        <DialogHeader className="pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{extra}</p>

        <DialogFooter>
          {isGuest ? (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/join">{applyLabel}</Link>
            </Button>
          ) : (
            <DialogClose asChild>
              <Button type="button" size="lg" className="w-full sm:w-auto">
                {gotItLabel}
              </Button>
            </DialogClose>
          )}
        </DialogFooter>

        <DialogCloseButton
          label={closeLabel}
          className="absolute top-4 right-4 after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        />
      </DialogContent>
    </Dialog>
  );
}
