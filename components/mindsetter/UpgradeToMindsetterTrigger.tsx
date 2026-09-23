'use client';

import { useRef, useState } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

import { UpgradeToMindsetterDialog } from './UpgradeToMindsetterDialog';

type UpgradeToMindsetterTriggerProps = Omit<ButtonProps, 'onClick' | 'type' | 'asChild'>;

/**
 * Shared "Upgrade" button + `UpgradeToMindsetterDialog` in one client island (Release-1 C7). The
 * three server-component entry points that need this — `components/layout/Header.tsx`,
 * `components/marketing/main-page/WhatIsMindsetis.tsx`, and `components/dashboard/
 * MemberStatusBanner.tsx` — render this instead of their own `Button asChild` + `GuardedLink`
 * pair, so only this small island ships client JS rather than either whole section becoming a
 * client component. Every `ButtonProps` (`variant`, `size`, `className`, …) passes straight
 * through, so each call site keeps its own exact CTA styling; only `onClick`/`type`/`asChild` are
 * owned here, since this always renders a real `<button>` that opens the dialog rather than
 * linking anywhere directly.
 *
 * FOCUS RESTORE (2026-09-21, found by live QA on C7): closing the dialog used to drop focus on
 * `<body>` instead of returning it to the button that opened it, so a keyboard visitor lost their
 * place on the page and had to Tab from the top again. Radix restores focus by itself, but only to
 * a `Dialog.Trigger` — and this island deliberately does NOT use one, because the `<Dialog>` root
 * lives inside `UpgradeToMindsetterDialog` while the button lives out here, which is what lets all
 * four call sites keep their own CTA styling. So the element is captured here and handed to the
 * dialog, which focuses it in `onCloseAutoFocus`.
 *
 * It is captured from the click's `currentTarget` rather than a `ref` on purpose: `ButtonProps` is
 * `ButtonHTMLAttributes`, which carries no `ref`, and widening a UI primitive used across the whole
 * app to fix one dialog is the larger change. `currentTarget` inside the button's own handler is
 * always that `<button>` — including on keyboard Enter/Space, which dispatch a real click.
 */
export function UpgradeToMindsetterTrigger({
  children,
  ...buttonProps
}: UpgradeToMindsetterTriggerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        type="button"
        onClick={(event) => {
          triggerRef.current = event.currentTarget;
          setOpen(true);
        }}
        {...buttonProps}
      >
        {children}
      </Button>
      <UpgradeToMindsetterDialog open={open} onOpenChange={setOpen} triggerRef={triggerRef} />
    </>
  );
}
