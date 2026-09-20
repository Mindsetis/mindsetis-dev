'use client';

import { useState } from 'react';

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
 */
export function UpgradeToMindsetterTrigger({
  children,
  ...buttonProps
}: UpgradeToMindsetterTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} {...buttonProps}>
        {children}
      </Button>
      <UpgradeToMindsetterDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
