'use client';

import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react';

import {
  acceptAllConsent,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_VERSION,
  type CookieConsent,
  isCategoryAllowed,
  type OptionalCookieCategory,
  rejectAllConsent,
} from '@/lib/cookies/consent';

/**
 * Owns the visitor's cookie choice: the current value, the two dialogs that change it, and the
 * write to `document.cookie`.
 *
 * `initialConsent` is read on the SERVER (`lib/cookies/server.ts`, called from the root layout)
 * and handed down as a prop, so the very first render already knows whether the banner belongs
 * on screen. Deriving it client-side instead would mean the banner either flashes for everyone
 * who has already decided, or appears a beat late for everyone who hasn't.
 *
 * The write goes straight to `document.cookie` rather than through a Server Action: this is a
 * client-only preference with no server state behind it, and a round-trip would make the banner
 * dismiss visibly lag the click. The value is deliberately non-sensitive (three booleans and a
 * timestamp, no identifier) and must stay readable by scripts, which is also why it isn't
 * `HttpOnly` — see `lib/cookies/consent.ts` for the full reasoning.
 */

type CookieConsentContextValue = {
  /** `null` means "no decision on record" — the banner shows for exactly this state. */
  consent: CookieConsent | null;
  /** True until the visitor accepts, rejects, or saves — i.e. whether to show the banner. */
  isUndecided: boolean;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (choices: Record<OptionalCookieCategory, boolean>) => void;
  isAllowed: (category: OptionalCookieCategory) => boolean;
  /**
   * Height in px of the rendered banner, 0 when it isn't shown. Published here because the
   * banner is a full-width fixed bar on a phone, so anything else pinned to the bottom edge —
   * today `ScrollToTopButton` — has to move out of its way, and the amount is measured rather
   * than guessed (it moves with viewport width, translated copy, and the visitor's font size).
   */
  bannerHeight: number;
  setBannerHeight: (height: number) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function writeConsentCookie(consent: CookieConsent) {
  // `Secure` only over HTTPS — setting it on plain `http://localhost` makes the browser drop the
  // cookie outright, which would silently break the banner in local development.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const value = encodeURIComponent(JSON.stringify(consent));

  document.cookie =
    `${COOKIE_CONSENT_NAME}=${value}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax` +
    secure;
}

export function CookieConsentProvider({
  initialConsent,
  children,
}: {
  initialConsent: CookieConsent | null;
  children: ReactNode;
}) {
  const [consent, setConsent] = useState<CookieConsent | null>(initialConsent);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);

  const commit = useCallback((next: CookieConsent) => {
    writeConsentCookie(next);
    setConsent(next);
    setIsPreferencesOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(() => {
    // Stamped at click time, not at render time: the timestamp records WHEN consent was given,
    // which is the part that has to be evidenced.
    const now = () => new Date().toISOString();

    return {
      consent,
      isUndecided: consent === null,
      isPreferencesOpen,
      openPreferences: () => setIsPreferencesOpen(true),
      // Closing the modal without choosing is not a decision — no cookie is written, so an
      // undecided visitor still has the banner waiting for them underneath.
      closePreferences: () => setIsPreferencesOpen(false),
      acceptAll: () => commit(acceptAllConsent(now())),
      rejectAll: () => commit(rejectAllConsent(now())),
      savePreferences: (choices) =>
        commit({
          v: COOKIE_CONSENT_VERSION,
          analytics: choices.analytics,
          marketing: choices.marketing,
          functional: choices.functional,
          ts: now(),
        }),
      isAllowed: (category) => isCategoryAllowed(consent, category),
      bannerHeight,
      setBannerHeight,
    };
  }, [bannerHeight, commit, consent, isPreferencesOpen]);

  return <CookieConsentContext value={value}>{children}</CookieConsentContext>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = use(CookieConsentContext);

  if (!context) {
    throw new Error('useCookieConsent must be used inside <CookieConsentProvider>.');
  }

  return context;
}
