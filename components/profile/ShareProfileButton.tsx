'use client';

import { Share2 } from 'lucide-react';

import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export interface ShareProfileButtonProps {
  /**
   * Canonical, already-locale-prefixed, already-absolute public profile URL (e.g.
   * `https://mindsetis.community/es/mindsetters/anastasia`) — computed server-side by the page
   * (`siteUrl(localePath(locale, ...))`, see `mindsetters/[username]/page.tsx`) rather than
   * derived here from `window.location`, so a share always points at the real public route
   * regardless of which internal path happened to render this component.
   */
  url: string;
  /** Accessible name for this icon-only control — there's no visible label, so `aria-label`
   * carries the whole accessible name. */
  ariaLabel: string;
  /**
   * Announced when the clipboard-copy fallback fires (`toast.success`, `components/ui/sonner`,
   * mounted once near the app root). Sonner's own toast region is `aria-live`, so this reaches
   * screen readers with no extra plumbing here. The `navigator.share` path needs no separate
   * announcement — the OS-level share sheet it opens is already its own feedback.
   */
  copiedMessage: string;
  /**
   * Shown when BOTH paths are unavailable — no `navigator.share`, and the clipboard write throws
   * (older browser, denied permission, insecure context). Rare on this app's own HTTPS deploys,
   * but without it the button would simply do nothing at all, which reads as broken.
   */
  errorMessage: string;
  /** Passed through to `navigator.share`'s own `title` field (e.g. the profile owner's display
   * name), so a native share target (iMessage/WhatsApp link previews, etc.) shows more than a
   * bare URL. Optional — omitted entirely when the caller has nothing meaningful to put there. */
  shareTitle?: string;
  className?: string;
}

/**
 * Release-1 G3 — a REAL, working "Share" control: tries the Web Share API first (native share
 * sheet, mainly a mobile-browser feature), falling back to copying the link to the clipboard
 * (plus a toast confirmation) on the many browsers — most desktop ones, as of this build — that
 * don't implement `navigator.share` at all.
 *
 * This replaces the `NotYetAvailable`-wrapped placeholder that used to live in each profile
 * screen's owner-only preview banner (removed by Release-1 G1) — the one control across these
 * screens that goes from "not yet available" to actually working, since sharing a link needs no
 * backend.
 *
 * A small `"use client"` island by necessity — `navigator.share`/`navigator.clipboard` only
 * exist in the browser — inside an otherwise server-rendered profile page; everything it needs
 * (the URL, the two translated strings) is plain, already-resolved data passed in as props, so
 * no client-side data fetching or Supabase client of any kind is involved here.
 *
 * A real `<button>` (not `NotYetAvailable`'s disabled-control-plus-wrapper-span trick — that
 * pattern exists only to make a `disabled` control keyboard-reachable/clickable; this control is
 * neither disabled nor wrapping one), so normal button semantics already cover Enter/Space
 * activation and focus — no bespoke keyboard handling needed.
 */
export function ShareProfileButton({
  url,
  ariaLabel,
  copiedMessage,
  errorMessage,
  shareTitle,
  className,
}: ShareProfileButtonProps) {
  async function handleShare() {
    // Feature-detected per click rather than cached in state — this only ever runs from a real
    // user gesture, so the cost of re-checking is irrelevant, and it keeps the component free of
    // any hydration-mismatch risk from reading `navigator` during render.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (error) {
        // The user dismissing the OS share sheet throws `AbortError` — not a failure, nothing to
        // report. Any other error (a real share-target failure) falls through to the clipboard
        // path below instead of leaving the click with no effect at all.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(copiedMessage);
    } catch {
      // Clipboard access denied or unavailable (older browser, blocked permission, insecure
      // context). There is nothing left to try, but silence is the one outcome this button must
      // never have: with both paths gone the click would look broken. Tell the person instead,
      // and point them at the address bar, which still holds the same URL.
      toast.error(errorMessage);
    }
  }

  return (
    <button type="button" onClick={handleShare} aria-label={ariaLabel} className={cn(className)}>
      <Share2 className="size-4" aria-hidden="true" />
    </button>
  );
}
