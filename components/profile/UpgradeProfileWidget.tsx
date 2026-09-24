'use client';

import { Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/components/cookies/CookieConsentProvider';
import { UpgradeToMindsetterTrigger } from '@/components/mindsetter/UpgradeToMindsetterTrigger';
import { Link } from '@/i18n/navigation';
import { EXAMPLE_MINDSETTER_PROFILE_USERNAME } from '@/lib/profile/example-profile';
import { cn } from '@/lib/utils';

/** `localStorage` key prefix — same naming scheme as `MemberProfileReadyDialog`'s own key and
 * `lib/cookies/consent.ts`'s cookie name. Suffixed with `userId`: this is a browser-scoped record,
 * not an account-scoped one, so a shared browser can't let one account's dismissals silence the
 * widget for a different account signing in later. */
const STORAGE_KEY_PREFIX = 'mindsetis_upgrade_profile_widget_';

/** Product-owner rule #2 (2026-09-20, C8): a closed widget stays hidden for three days. */
const DISMISS_PAUSE_MS = 3 * 24 * 60 * 60 * 1000;

/** Product-owner rule #3 (2026-09-20, C8): closed a third time, gone for good. */
const MAX_DISMISS_COUNT = 3;

/** Product-owner rule #1 (2026-09-20, C8): don't surface immediately — wait for either a scroll
 * past the hero or ~15s on the page, whichever comes first. There's no shared ref to the actual
 * hero element at this mount point (this is a fixed, page-independent overlay, not part of the
 * profile layout), so "past the hero" is approximated as "scrolled roughly one viewport height",
 * the same kind of fixed heuristic `ScrollToTopButton` uses for its own reveal threshold — the
 * member hero on `/members/[username]` fills close to a full screen on both mobile and desktop. */
const REVEAL_DELAY_MS = 15_000;
const HERO_SCROLL_FRACTION = 0.9;

/** Breathing room above the cookie-consent banner, and (on mobile) again above `ScrollToTopButton`
 * — same 16px `ScrollToTopButton` itself adds above the banner (`bannerHeight + 16`, see that
 * component's own `--cookie-banner-offset`), reused here for both gaps for the same reason: a
 * banner/pill's own drop shadow needs a little clearance, not a flush edge. */
const STACK_GAP_PX = 16;

/**
 * `ScrollToTopButton`'s own doc comment documents its Figma source ("Scroll up", `1133:31269`) as
 * a 136×54 Hug×Hug component — 54px is that pill's real on-screen height. Named here (not
 * hardcoded inline) because this widget has to reserve exactly that much extra clearance on
 * mobile — see the "STACKING ABOVE THE SCROLL-TO-TOP PILL" note in this component's own doc
 * comment for why. If a live measurement ever finds the two pills genuinely mismatched, correct
 * THIS constant rather than reaching for a magic number at the call site.
 */
const SCROLL_TOP_BUTTON_HEIGHT_PX = 54;

type WidgetState = {
  dismissCount: number;
  /** ISO timestamp of the most recent dismissal, or `null` before the first one. */
  lastDismissedAt: string | null;
};

const DEFAULT_STATE: WidgetState = { dismissCount: 0, lastDismissedAt: null };

/**
 * Both read and write are wrapped in `try/catch` — same reasoning as `MemberProfileReadyDialog`'s
 * own storage helpers: private browsing / blocked site data can make `localStorage` throw on any
 * access, and that must never break this (already non-essential) page furniture. A read failure,
 * or a value that doesn't parse into the expected shape (hand-edited, written by an older/newer
 * version of this widget), is treated as "never dismissed" rather than crashing.
 */
function readState(userId: string): WidgetState {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WidgetState>;
    if (typeof parsed.dismissCount !== 'number') return DEFAULT_STATE;
    return {
      dismissCount: parsed.dismissCount,
      lastDismissedAt: typeof parsed.lastDismissedAt === 'string' ? parsed.lastDismissedAt : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(userId: string, state: WidgetState): void {
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    // Storage unavailable — the widget just won't remember this dismissal, so it may reappear
    // sooner than the 3-day pause on this visitor's next visit. Not worth failing the page over.
  }
}

export type UpgradeProfileWidgetProps = {
  userId: string;
};

/**
 * Floating "become a Mindsetter" nudge on a Member's OWN public profile — Release-1 C8. Rendered
 * only by `/members/[username]/page.tsx`, only for `isOwner && account_type === 'member'`: nobody
 * else ever sees this, including staff and other visitors.
 *
 * DRAFT COPY (2026-09-20): title/body are our own one-liners — the client gave no copy for this
 * widget, only its behavior — kept short and swappable via a translation-key edit alone.
 *
 * "SEE EXAMPLE" — see `lib/profile/example-profile.ts`'s own doc comment: that constant is empty
 * until the client finishes building her example profile, and this renders NO link at all while
 * it's blank (no dead link to a profile that doesn't exist).
 *
 * POSITIONING — bottom-LEFT (`ScrollToTopButton` owns bottom-right, permanently, on every
 * non-cabinet page including this one). CORRECTED, 2026-09-20 review + live pass: an earlier
 * version of this comment described the cookie-consent banner as a minor, mostly-resolved-by-then
 * corner conflict — it is not. Below `md:` that banner (`CookieConsentBanner.tsx`) is
 * `fixed inset-x-4 bottom-4 z-40` — a FULL-WIDTH bar, not a corner card — so while it's up it sits
 * directly on top of this widget's entire footprint, ✕ button and CTA included, at a higher
 * `z-40` than this widget's `z-30`: on a phone the widget is not just visually behind the banner,
 * it is completely unreachable. From `md:` up the banner narrows to a 380px card pinned
 * `bottom-6 left-6` — the SAME corner this widget uses — so the overlap continues there too, just
 * partial instead of total.
 *
 * FIX: `useCookieConsent()`'s `bannerHeight` (0 whenever the banner isn't rendered, its real
 * measured height otherwise — the same value `ScrollToTopButton` already reads for its own
 * `--cookie-banner-offset`) lifts this widget clear of the banner at EVERY breakpoint, not just
 * mobile like `ScrollToTopButton` needs (that button sits on the OPPOSITE corner from the banner
 * once it reaches its `md:left-6` card, so from `md:` up `ScrollToTopButton` needs no offset at
 * all — this widget shares the banner's own corner at every width, so it always does).
 *
 * STACKING ABOVE THE SCROLL-TO-TOP PILL (mobile only). Once lifted clear of the banner, this
 * widget's card — up to `320px` wide, i.e. most of a 375px viewport — would sit at the exact same
 * `bottom` offset as `ScrollToTopButton`'s pill on the OTHER edge (both read the identical
 * `bannerHeight`-derived offset), and the two would collide where the widget's right edge and the
 * button's left edge meet. Below `md:` this widget's `bottom` therefore adds
 * `SCROLL_TOP_BUTTON_HEIGHT_PX + STACK_GAP_PX` on top of the banner clearance, putting it a full
 * pill's height (plus a gap) above that button instead of beside it. Not needed from `md:` up:
 * `ScrollToTopButton` stays pinned bottom-right there regardless of this widget, on the opposite
 * side of the screen from this widget's `md:left-6`, so there is nothing to stack above.
 */
export function UpgradeProfileWidget({ userId }: UpgradeProfileWidgetProps) {
  const t = useTranslations('upgradeProfileWidget');
  const { bannerHeight } = useCookieConsent();
  // `null` = still deciding (first client-side effect hasn't run yet); `false` = permanently
  // hidden for this page view (dismissed too many times, or still inside the 3-day pause);
  // `true` = allowed to appear once the reveal trigger (scroll/timer) below fires.
  const [canShow, setCanShow] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Named inner function, not a bare `setCanShow(...)` at the effect's top level — same
    // `react-hooks/set-state-in-effect`-avoiding shape as `MemberProfileReadyDialog`'s own
    // `maybeOpen` (see that component's doc comment on this effect for the full reasoning).
    function decideVisibility() {
      const state = readState(userId);
      if (state.dismissCount >= MAX_DISMISS_COUNT) {
        setCanShow(false);
        return;
      }
      if (state.lastDismissedAt) {
        const elapsed = Date.now() - new Date(state.lastDismissedAt).getTime();
        if (Number.isFinite(elapsed) && elapsed < DISMISS_PAUSE_MS) {
          setCanShow(false);
          return;
        }
      }
      setCanShow(true);
    }
    decideVisibility();
  }, [userId]);

  useEffect(() => {
    if (!canShow) return;

    let revealed = false;
    const threshold = window.innerHeight * HERO_SCROLL_FRACTION;

    function reveal() {
      if (revealed) return;
      revealed = true;
      setVisible(true);
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timeoutId);
    }

    function onScroll() {
      if (window.scrollY > threshold) reveal();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // In case the page is already scrolled past the hero when this mounts (deep link, scroll
    // restore) — same defensive check `ScrollToTopButton` runs on its own listener.
    onScroll();
    const timeoutId = setTimeout(reveal, REVEAL_DELAY_MS);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timeoutId);
    };
  }, [canShow]);

  function handleClose() {
    const state = readState(userId);
    writeState(userId, {
      dismissCount: state.dismissCount + 1,
      lastDismissedAt: new Date().toISOString(),
    });
    setVisible(false);
    // Also gates THIS mount immediately — otherwise a visitor who scrolls back up and past the
    // threshold again in the same page view would simply re-trigger `reveal()`.
    setCanShow(false);
  }

  // Not yet decided, or decided-and-hidden (dismiss limit / pause window) — render nothing at all
  // rather than an invisible-but-mounted widget, same as `MemberStatusBanner` returning `null`.
  if (!canShow) return null;

  const exampleHref = EXAMPLE_MINDSETTER_PROFILE_USERNAME
    ? `/mindsetters/${EXAMPLE_MINDSETTER_PROFILE_USERNAME}`
    : null;

  // See the "FIX" / "STACKING ABOVE THE SCROLL-TO-TOP PILL" doc-comment sections above for the
  // full reasoning — mobile always clears `ScrollToTopButton`'s own footprint (it co-occupies the
  // same vertical band once both are lifted by the same `bannerHeight`), `md:`+ only ever needs
  // to clear the banner itself.
  const bannerClearancePx = bannerHeight ? bannerHeight + STACK_GAP_PX : 0;
  const mobileOffsetPx = bannerClearancePx + SCROLL_TOP_BUTTON_HEIGHT_PX + STACK_GAP_PX;

  return (
    <div
      aria-hidden={!visible}
      // Cast: a CSS custom property is a legal inline style but isn't in React's typed
      // `CSSProperties` surface — same escape hatch `ScrollToTopButton` uses for its own
      // `--cookie-banner-offset`.
      style={
        {
          '--upgrade-widget-offset': `${mobileOffsetPx}px`,
          '--upgrade-widget-offset-md': `${bannerClearancePx}px`,
        } as CSSProperties
      }
      className={cn(
        // `max-w-[calc(100vw-2rem)]` clamps the card so it can never force horizontal scroll on a
        // narrow phone regardless of copy length; `fixed` positioning already keeps it out of
        // document flow, so it never shifts any other layout either. `bottom-[calc(...)]` below
        // `md:` starts from the same `1rem` (16px) baseline `ScrollToTopButton` uses, `md:` up
        // from its `1.5rem` (24px) one — both breakpoints matched to `md:` (not `sm:`) so this
        // widget's own step lines up with the ones `CookieConsentBanner` and `ScrollToTopButton`
        // already use, rather than switching layout a step early/late relative to either.
        'fixed left-4 bottom-[calc(1rem+var(--upgrade-widget-offset,0px))] z-30 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border border-[#2a2a2a] bg-card p-4 shadow-[0px_24px_60px_rgba(0,0,0,0.55)] transition-all duration-200 motion-reduce:transition-none md:bottom-[calc(1.5rem+var(--upgrade-widget-offset-md,0px))] md:left-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          <span className="text-tiny font-bold uppercase">{t('title')}</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          tabIndex={visible ? 0 : -1}
          aria-label={t('close')}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="text-tiny text-foreground">{t('body')}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UpgradeToMindsetterTrigger size="sm" tabIndex={visible ? 0 : -1}>
          {t('cta')}
        </UpgradeToMindsetterTrigger>
        {exampleHref && (
          <Link
            href={exampleHref}
            tabIndex={visible ? 0 : -1}
            className="text-tiny font-medium text-primary underline"
          >
            {t('seeExample')}
          </Link>
        )}
      </div>
    </div>
  );
}
