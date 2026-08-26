'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Dropdown menu (Radix) — the header's account menu today (Figma component set `910:11291`).
 *
 * Deliberately a SMALL subset of shadcn's dropdown-menu: root, trigger, content and item. The
 * stock kit also ships checkbox/radio items, submenus, labels, separators and shortcuts, none of
 * which this project has a use for; they'd be dead code that still has to be read and maintained.
 * Adding one back later is a copy-paste from upstream.
 *
 * Not built on the existing `components/ui/popover.tsx` even though it also floats a panel: a
 * popover is a generic container whose contents keep normal tab order, while this is a MENU —
 * `role="menu"`/`menuitem`, arrow-key roving focus, typeahead, and "Escape returns focus to the
 * trigger" all come from this primitive and would otherwise have to be hand-rolled.
 */
function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

/**
 * The floating panel. Figma: 14px radius, `#1a1a1a` fill (`bg-card`), `#2a2a2a` hairline border,
 * 8px padding, 2px between items, and a soft drop shadow (the file's "modal shadow" style —
 * 0/24/60 black at 55%).
 *
 * `sideOffset` defaults to 6 to match the design's 6px gap below the trigger; alignment is left to
 * the call site (the account menu centers on its avatar rather than aligning to an edge).
 */
function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden rounded-[14px] border border-[#2a2a2a] bg-card p-2 shadow-[0_24px_60px_0_rgba(0,0,0,0.55)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

/**
 * One row: 44px tall, 9px radius, 12px horizontal padding, 12px between icon and label, 16px/400
 * text. `#242424` background on hover — Radix drives that through `data-highlighted`, which covers
 * both pointer hover and keyboard focus, so the two states can't drift apart.
 *
 * `variant="destructive"` recolors text AND icon to `#ff4c58` (the design's "red system") — the
 * icons render `fill="currentColor"`, so one text-color utility is enough.
 */
function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'flex h-11 cursor-pointer items-center gap-3 rounded-[9px] px-3 text-base font-normal outline-none select-none',
        'transition-colors data-[highlighted]:bg-[#242424]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        variant === 'destructive' ? 'text-destructive' : 'text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
