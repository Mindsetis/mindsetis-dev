'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Tooltip (Radix). Added 2026-08-06 for the "coming soon" markers on controls whose feature
 * isn't built yet.
 *
 * NOTHING IMPORTS IT RIGHT NOW. Those markers became `components/ui/not-yet-available.tsx`, a
 * click-opened dialog, precisely because a tooltip was the wrong tool for them: hover copy is
 * invisible on touch, and the wrapper span never received the keyboard activation a tooltip
 * needs. This file stays as a general UI Kit primitive for a future tooltip that is genuinely
 * supplementary — but if none appears, delete it together with `@radix-ui/react-tooltip`
 * rather than letting it sit here unused.
 *
 * `TooltipProvider` is baked into `Tooltip` itself rather than mounted once at the app root:
 * every tooltip in this app is an isolated, self-contained marker (no shared open/close
 * choreography between them), so a per-instance provider keeps call sites to a single element
 * and avoids a layout-level import that only one feature needs. `delayDuration={200}` is short
 * enough to feel responsive without firing on an accidental pass of the cursor.
 */
function Tooltip({
  delayDuration = 200,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root> & { delayDuration?: number }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
}

function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          // Same surface/border pair the app's other floating panels use (`--color-card` on
          // `--color-background`), so a tooltip reads as part of the same system as the
          // dialogs and select menus.
          'z-50 w-fit rounded-lg border border-border bg-card px-3 py-1.5 text-tiny text-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
