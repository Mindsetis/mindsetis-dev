'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * The round ✕ that dismisses a dialog/sheet — brand-blue disc, black glyph (2026-08-14 request,
 * replacing the previous outlined dark circle).
 *
 * Exported as one component because four surfaces had each hand-rolled the same button
 * (`PlatformFeeModal`, `OnboardingDialog`, `AccountSheet`, and `DialogContent`'s own built-in
 * one), so a restyle meant editing four files and hoping none drifted.
 *
 * Positioning is NOT baked in — the built-in one pins itself to the corner, the sheet's sits in a
 * flex row — so each call site passes its own `className`.
 */
function DialogCloseButton({
  className,
  label,
  ...props
}: ComponentProps<typeof DialogPrimitive.Close> & { label: string }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close-button"
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground outline-none transition-colors hover:bg-primary-hover disabled:pointer-events-none',
        className,
      )}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </DialogPrimitive.Close>
  );
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/80',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  // Feeds only the built-in close button rendered below. Every call site that flips
  // `showCloseButton` to `false` instead builds its own `DialogCloseButton` with its own
  // (already-translated) `label` — `WhoIsMindsetterDialog`, `CookiePreferencesDialog`,
  // `AccountSheet`, `AmbassadorApplicationDialog`, `PlatformFeeModal`, `OnboardingDialog`, and
  // `ReviewQuoteText` — so this doesn't touch any of those.
  const t = useTranslations('common');
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          // Keep the header clear of the built-in close button, which is absolutely positioned
          // (`top-4 right-4`, `size-8`) and so overlaps the last ~24px of a title that runs the
          // full content width: `p-6` leaves 24px, the button claims 16-48px. Caught in manual
          // testing (17.09.2026) on the "not yet available" popup. It lives here rather than in
          // `DialogHeader` because only THIS branch renders the button — dialogs passing
          // `showCloseButton={false}` build their own and already pad themselves.
          showCloseButton && '[&_[data-slot=dialog-header]]:pr-10',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogCloseButton label={t('closeDialog')} className="absolute top-4 right-4" />
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      // shadcn ships this header centred below `sm` (`text-center sm:text-left`). In this app the
      // body copy that follows a header sits OUTSIDE it — e.g. the `emailPromise` line in
      // `NotYetAvailable` — and stays left-aligned, so on a phone the title centred while the last
      // line did not (caught in manual testing, 17.09.2026). One alignment everywhere instead.
      //
      // `min-w-0`: this `div` is a direct child of `DialogContent`'s `grid` — a grid item's
      // initial `min-width` is `auto`, i.e. "at least my content's min-content size", which for
      // a long unbreakable token (an email, a URL) is that token's full rendered width. With no
      // override, the grid track grows to fit it and the whole dialog overflows its `max-w-*`
      // instead of wrapping (caught in manual/live testing, Release-1 A5's "already applied"
      // modal, 17.09.2026: a long email in `DialogTitle` pushed the dialog ~124px past the
      // viewport at 375px). `min-w-0` lets this item — and the column it sizes — shrink back
      // down to the container's actual width; it has no effect on short content, which never
      // needed the room in the first place, so every other dialog is visually unchanged.
      // Breaking the long token itself is a second, separate step — see whichever child
      // actually renders it (e.g. `break-words` on that dialog's own `DialogTitle`).
      className={cn('min-w-0 flex flex-col gap-2 text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      // `min-w-0`: same grid-shrink fix as `DialogHeader` above — this is the other direct
      // `DialogContent` grid child every dialog renders.
      className={cn('min-w-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-display text-l leading-none font-normal', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
