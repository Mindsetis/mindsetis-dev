import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Sticky mobile CTA — bottom-fixed action bar shown only below `md`. Every public page
 * that needs a persistent primary action (book, join, sign up…) renders its `Button`(s)
 * as children here; desktop keeps its inline CTA and this bar simply doesn't render.
 */
function StickyMobileCta({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sticky-mobile-cta"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden',
        'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { StickyMobileCta };
