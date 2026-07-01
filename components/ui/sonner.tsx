'use client';

import type { CSSProperties } from 'react';
import { toast, Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Toast surface (Mindsetis is dark-only — no light/dark toggle, so `theme` is fixed).
 * Mount once near the app root (see `app/[locale]/layout.tsx`); call `toast(...)` anywhere.
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--color-popover)',
          '--normal-text': 'var(--color-popover-foreground)',
          '--normal-border': 'var(--color-border)',
          '--success-bg': 'var(--color-popover)',
          '--success-text': 'var(--color-success)',
          '--success-border': 'var(--color-border)',
          '--error-bg': 'var(--color-popover)',
          '--error-text': 'var(--color-destructive)',
          '--error-border': 'var(--color-border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { toast, Toaster };
