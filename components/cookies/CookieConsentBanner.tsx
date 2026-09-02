'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useCookieConsent } from './CookieConsentProvider';

/**
 * Compact cookie-consent banner — Figma "Cookie notice" (`1123:31228` desktop / `1155:35350`
 * mobile), CSS dump lines 1–795 (desktop) / 796–1591 (mobile) in the customer's
 * `Desktop/Mobile Cookie notice` sections.
 *
 * Only rendered while `isUndecided` (no cookie on record yet) — the parent (`app/[locale]/
 * layout.tsx`) mounts it unconditionally, but it returns `null` once a decision exists so it
 * never needs a second gate at the call site.
 *
 * NOT a dialog: it doesn't block the page (the dump shows no overlay for this frame — a
 * separate `Overlay`/`Rectangle` node only exists for the "Manage Cookie Preferences" frame,
 * confirmed by reading both directly off Figma), so this is `role="region"` with its own
 * `aria-label`, not `role="dialog"`. No close (×) button either — the design's only ways to
 * leave the undecided state are the three actions below.
 *
 * WHITE WIDGET ON A DARK SITE. Every color here is a literal value from the CSS dump, not a
 * theme token — `bg-white`/`text-black` is deliberate, not a mistake. The one dump value that
 * happens to already exist as a design-system token is reused instead of repeating the hex:
 * the accept button's gradient IS `--gradient-primary` (`app/styles/tokens/effects.css`), the
 * exact same three stops (`#C3E4F9 0% / #79B9E3 51.73% / #21B8E6 100%`) — that's why `Button`'s
 * own `variant="primary"` is reused unmodified for "Accept all" rather than hand-rolling the
 * gradient again.
 *
 * `Button`'s `primary` variant is flat `bg-primary` on mobile and only switches to the gradient
 * at `md:` — a deliberate, sitewide convention (see that component's own doc comment: "Figma:
 * mobile Primary CTA... is a flat fill with no gradient/glow; the gradient + soft glow only
 * appear on desktop"). This cookie notice's OWN Figma frame shows the gradient at BOTH
 * breakpoints (`background: linear-gradient(...)` is identical in both the desktop and mobile
 * dump sections) — a genuine conflict between this one widget's design and the shared button's
 * established site convention.
 *
 * Resolved at THIS call site only, with `max-md:bg-[image:var(--gradient-primary)]`: below `md:`
 * the variant paints a flat `background-color`, so laying the same token's gradient on as a
 * `background-image` covers it without touching `button.tsx` or the convention every other
 * mobile CTA follows. Scoped to `max-md:` because from `md:` up the variant's own `gradient-fill`
 * pseudo-element already paints this exact gradient, and a second identical layer would just be
 * dead weight.
 *
 * "Manage"/"Reject all" are `Button`'s `outline` variant with the color utilities overridden —
 * `outline`'s default `text-foreground`/`border-border` are dark-theme values (white text,
 * `#747474` border) tuned for a DARK card; on this WHITE card `text-foreground` would be
 * invisible. Overridden to the dump's actual `#000000` text / `#A5A5A5` border (the "secondary
 * text" stroke color used on this frame's two outline buttons — note this is a DIFFERENT grey
 * than the modal's own outline button, which the dump gives `#747474` instead; not a mistake,
 * two different Figma stroke styles).
 */
export function CookieConsentBanner() {
  const t = useTranslations('cookies.banner');
  const { isUndecided, acceptAll, rejectAll, openPreferences, bannerHeight, setBannerHeight } =
    useCookieConsent();

  // Measured, not hardcoded — the height moves with the viewport width, the translated copy's
  // line count, and the visitor's font size. It feeds two things: the spacer below (see its own
  // comment) and, through the provider, anything else pinned to the bottom edge that has to clear
  // this banner on a phone — `ScrollToTopButton` today.
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = bannerRef.current;
    if (!element) {
      // Reports 0 on unmount too, so a consumer never keeps offsetting for a banner that is gone.
      setBannerHeight(0);
      return;
    }

    const observer = new ResizeObserver(() => setBannerHeight(element.offsetHeight));
    observer.observe(element);

    return () => {
      observer.disconnect();
      setBannerHeight(0);
    };
  }, [isUndecided, setBannerHeight]);

  if (!isUndecided) {
    return null;
  }

  return (
    <>
      <div
        ref={bannerRef}
        role="region"
        aria-label={t('ariaLabel')}
        className={cn(
          'fixed inset-x-4 bottom-4 z-40 flex flex-col items-start gap-3 rounded-2xl bg-white p-4 text-black shadow-[0px_24px_60px_rgba(0,0,0,0.55)]',
          'md:inset-x-auto md:bottom-6 md:left-6 md:w-[380px] md:gap-4 md:p-6',
        )}
      >
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-base leading-[22px] font-bold text-black md:font-display md:text-[22px] md:leading-[29px] md:font-normal">
            <span aria-hidden="true">🥠</span>
            {t('title')}
          </h2>
          <p className="text-[12px] leading-4 text-[#2A2A2A] md:text-[14px] md:leading-[19px]">
            <span className="md:hidden">{t('bodyMobile')}</span>
            <span className="hidden md:inline md:whitespace-pre-line">{t('body')}</span>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            className="w-full max-md:bg-[image:var(--gradient-primary)]"
            onClick={acceptAll}
          >
            {t('acceptAll')}
          </Button>
          <div className="flex w-full flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 border-[#A5A5A5] text-[#000000] hover:border-black hover:text-black active:border-black active:text-black"
              onClick={openPreferences}
            >
              {t('manage')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-[#A5A5A5] text-[#000000] hover:border-black hover:text-black active:border-black active:text-black"
              onClick={rejectAll}
            >
              {t('rejectAll')}
            </Button>
          </div>
        </div>
      </div>

      {/* Below `md:` the banner spans the full width and lands exactly on top of the footer's
          legal row, so at the bottom of the page "Privacy Policy" / "Terms of Service" /
          "Cookies Settings" are covered and unclickable — a fixed element reserves no space of
          its own. This spacer sits after `children` (the banner is rendered after them in
          `app/[locale]/layout.tsx`), which puts it after the footer in flow, so the page can
          scroll far enough for those links to clear the banner. Its height is the banner's own
          plus the 16px `bottom-4` offset and 16px of breathing room.

          Not needed from `md:` up, where the banner is a 380px card pinned bottom-left and the
          footer's legal row sits on the right — no overlap to clear. */}
      <div
        aria-hidden="true"
        className="shrink-0 md:hidden"
        style={{ height: bannerHeight ? bannerHeight + 32 : 0 }}
      />
    </>
  );
}
