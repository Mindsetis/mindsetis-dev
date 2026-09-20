'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/components/cookies/CookieConsentProvider';
import { ScrollTopArrowIcon } from '@/components/icons/scroll-top-arrow-icon';
import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Below this scroll offset the button stays hidden. A fixed pixel value rather than "one
 * viewport height" on purpose — viewport height swings wildly across this app's real traffic
 * (a ~600px phone vs. a ~1400px desktop window), so a vh-relative threshold would make the
 * button appear almost immediately on short mobile screens but require a long scroll on tall
 * desktop ones. Raised from 400 to 800 (product request, 2026-08-19): at 400 it surfaced while
 * the visitor was still inside the first screenful on desktop, where there is nothing to scroll
 * back up to yet. */
const SCROLL_THRESHOLD_PX = 800;

/**
 * Floating "back to top" pill — Figma "Scroll up" (`1133:31269`), a standalone component with
 * no page context and no mobile variant in the file (searched by name, only one match), so the
 * same size/position is used at every breakpoint.
 *
 * Structure (Hug×Hug in Figma, so this reproduces it as content-sized flex/padding/gap rather
 * than a fixed 136×54 box): pill — `rounded-full`, `bg-card` (`#1a1a1a`, Figma "grey shadow" —
 * confirmed same token this project already maps that style name to), 1px inside border
 * `border-[#2a2a2a]` (Figma "grey line" — no `--color-*` token matches this exact hex, same
 * precedent as the 404 page's card border and the legal pages' body text color), padding
 * `2px top/bottom, 2px left, 16px right` (asymmetric — the icon badge fills the 2px inset
 * almost edge-to-edge, the text gets real breathing room), 12px gap. Icon badge — 48×48,
 * `rounded-full`, `bg-[image:var(--gradient-primary)]` (Figma "gradient / brand" — same
 * reusable token already used for the Mindsetter-pitch-card heading, the 404 numeral, and
 * button fills), 16px padding around the 16×16 arrow icon. Label — "TO TOP", Manrope 11px
 * bold, `tracking-[0.3em]` (Figma's 30% letter-spacing, same value already used everywhere
 * else in this codebase for that style), white, uppercase (the copy is already all-caps, but
 * `uppercase` is applied defensively — same pattern `labelVariants`' `boldSpacing` variant
 * uses). No token matches 11px in the type scale (`text-tiny` is 14/12px) — hardcoded
 * `text-[11px]`, same "hardcode only when there's truly no token" rule as everywhere else.
 *
 * The visible "TO TOP" text is the button's accessible name — no separate `aria-label` (would
 * just duplicate it); the icon carries its own `aria-hidden` inside `ScrollTopArrowIcon`.
 *
 * CLEARS THE COOKIE BANNER ON A PHONE (2026-09-02). Below `md:` that banner is a full-width
 * bar along the bottom edge at `z-40` — exactly where this button sits, and above it in the
 * stacking order, so the button was simply buried until the visitor answered it. The offset
 * below lifts this button by the banner's own MEASURED height (published on the consent context
 * by `CookieConsentBanner`, and 0 whenever no banner is up) rather than by a guessed constant
 * that would drift with translated copy or the visitor's font size. No offset is needed from
 * `md:` up, where the banner is a 380px card pinned bottom-LEFT and this button is bottom-right.
 *
 * `fixed`, bottom-right, `z-30` — below the sticky header's `z-40` (`Header.tsx`) and any
 * modal/dropdown/tooltip (`z-50` throughout `components/ui/`), so it never floats over an open
 * dialog. Figma has no reactions on this component (checked via `get_reactions`) and no
 * page-context frame around it either, so there's no on-page position to copy — `right-4
 * bottom-4 sm:right-6 sm:bottom-6` matches this codebase's usual `px-4 sm:px-6` edge-padding
 * scale rather than inventing new spacing values.
 *
 * Rendered globally from `app/[locale]/layout.tsx` (NOT in the locale-less
 * `app/not-found.tsx` root fallback — that file has no `NextIntlClientProvider`, so a
 * `useTranslations` client component would throw there).
 */
export function ScrollToTopButton() {
  const t = useTranslations('common');
  const { bannerHeight } = useCookieConsent();
  const [visible, setVisible] = useState(false);
  // `usePathname` from `@/i18n/navigation` returns the locale-STRIPPED path (same helper
  // `CabinetSidebar` uses), so this matches every `/dashboard/*` route regardless of locale.
  const pathname = usePathname();
  const isCabinetRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  useEffect(() => {
    let ticking = false;

    function updateVisibility() {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    }

    // In case the page loads already scrolled (e.g. hash navigation, browser scroll restore).
    updateVisibility();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  // Removed from the cabinet entirely (Release-1 C3, 2026-09-19) — the client asked for it gone
  // from `/dashboard/*` specifically while it stays on the marketing site. `null` after the
  // scroll-listener effect above (not before it): the effect itself is harmless with nobody able
  // to see the button, and keeping every hook call unconditional avoids a "rendered fewer hooks
  // than expected" error on a route change between a cabinet and a non-cabinet page.
  if (isCabinetRoute) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      // Only the phone layout needs the offset; `md:bottom-6` above wins from `md:` up, so the
      // variable is harmless there even while a banner is on screen.
      // Cast: a CSS custom property is a legal inline style but is not in React's typed
      // `CSSProperties` surface, so this is the standard escape hatch rather than a type hole.
      style={
        {
          '--cookie-banner-offset': bannerHeight ? `${bannerHeight + 16}px` : '0px',
        } as CSSProperties
      }
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed right-4 bottom-[calc(1rem+var(--cookie-banner-offset,0px))] z-30 flex shrink-0 cursor-pointer items-center gap-3 rounded-full border border-[#2a2a2a] bg-card py-0.5 pr-4 pl-0.5 transition-all duration-200 motion-reduce:transition-none sm:right-6 md:bottom-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)]">
        <ScrollTopArrowIcon />
      </span>
      <span className="text-[11px] font-bold tracking-[0.3em] text-white uppercase">
        {t('scrollToTop')}
      </span>
    </button>
  );
}
