'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { type ComponentProps, useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

function Popover({ ...props }: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({ ...props }: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
  className,
  align = 'start',
  sideOffset = 4,
  ref,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/**
 * Tracks which side Radix actually rendered a popover's content on (`'top'` or `'bottom'`) — it
 * flips away from its preferred side when there isn't enough viewport space below the trigger,
 * and the "merged shape" trigger/content border trick (`Combobox`, `LanguagesMultiSelect`)
 * needs to square off whichever edge actually touches the content, not just assume "always
 * below". Radix sets `data-side` on the content DOM node itself and keeps it live-updated (e.g.
 * on scroll it may re-flip), so a `MutationObserver` on that one attribute is enough — no need
 * to duplicate Radix's own collision-detection math.
 *
 * The observer is wired up via a CALLBACK ref (not a `useRef` + a `useEffect` keyed on `open`) —
 * an earlier version used the latter and it never actually flipped `side` in production: Radix
 * mounts/unmounts the content DOM node through its own internal `Presence`, which doesn't
 * necessarily land in the same commit as the caller's `open` state update, so `contentRef.current`
 * could still be `null` (or already stale) by the time that effect ran, permanently skipping the
 * observer setup for that open session. A callback ref fires exactly when the node itself mounts/
 * unmounts, so the observer is always attached in time to catch Radix's own placement write —
 * live-verified via a real flipped popover (`browser-tester`, 2026-07-19) that the effect-based
 * version left stuck on `'bottom'` even with `data-side="top"` on the actual DOM node. Returns a
 * `ref` to attach to `PopoverContent` plus the current side (defaults to `'bottom'`, the common
 * case, until the first open reports otherwise).
 */
function usePopoverContentSide() {
  const [side, setSide] = useState<'top' | 'bottom'>('bottom');
  const observerRef = useRef<MutationObserver | null>(null);

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    function readSide() {
      const attr = node?.getAttribute('data-side');
      if (attr === 'top' || attr === 'bottom') setSide(attr);
    }
    readSide();

    const observer = new MutationObserver(readSide);
    observer.observe(node, { attributes: true, attributeFilter: ['data-side'] });
    observerRef.current = observer;
  }, []);

  return { contentRef, side };
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger, usePopoverContentSide };
