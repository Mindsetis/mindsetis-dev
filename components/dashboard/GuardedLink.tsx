'use client';

import { forwardRef, type MouseEvent } from 'react';

import { useUnsavedChanges } from '@/components/dashboard/unsaved-changes';
import { Link, useRouter } from '@/i18n/navigation';

type LinkProps = React.ComponentProps<typeof Link>;

/**
 * Drop-in replacement for the locale-aware `Link` (`@/i18n/navigation`) that respects the
 * cabinet's "unsaved changes" guard (Release-1 C-continuation, 2026-09-19): every exit path out
 * of a dirty section editor — the top "All sections" link, the sidebar, the site header, the
 * account menu — renders this instead of a plain `Link`, so clicking it while a section form is
 * dirty opens the shared confirmation dialog instead of navigating away silently.
 *
 * Behaves as a completely transparent `Link` the rest of the time — `isDirty` reads `false`
 * almost everywhere in the app, see `unsaved-changes.tsx`'s own doc comment on the default
 * context value — since the click handler below only intervenes on a plain left-click while dirty,
 * exactly mirroring which clicks `Link`/a native anchor would otherwise navigate on, so opening a
 * link in a new tab (`Cmd`/`Ctrl`/middle-click) is never intercepted even mid-edit.
 *
 * `forwardRef` because several call sites render this inside `Button asChild`/`DropdownMenuItem
 * asChild` (Radix `Slot`), which clones its child and needs a ref to forward.
 */
export const GuardedLink = forwardRef<HTMLAnchorElement, LinkProps>(function GuardedLink(
  { href, onClick, ...props },
  ref,
) {
  const { isDirty, guard } = useUnsavedChanges();
  const router = useRouter();

  return (
    <Link
      ref={ref}
      href={href}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        // Always runs first — e.g. `AccountSheet`'s rows use this to close the sheet on every
        // click, guarded or not.
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isDirty) return;
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        // `Link`'s own `href` type is a superset of what `router.push` accepts (it also allows a
        // bare `UrlObject` with an optional `pathname`, which `push` doesn't) — every call site in
        // this app only ever passes a plain string or a fully-formed `{ pathname }`, so this is a
        // safe narrowing, not a real type hole.
        guard(() => router.push(href as Parameters<typeof router.push>[0]));
      }}
      {...props}
    />
  );
});
