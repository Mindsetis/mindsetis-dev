'use client';

import type { ReactNode } from 'react';

import { useCookieConsent } from '@/components/cookies/CookieConsentProvider';
import type { OptionalCookieCategory } from '@/lib/cookies/consent';

/**
 * Renders its children only once the visitor has opted into `category`.
 *
 * Nothing uses this yet — the platform currently sets no optional cookies at all (the only ones
 * written are Supabase's session cookies, which are strictly necessary, and this consent cookie
 * itself). It exists so that the first script that DOES need consent — analytics, a marketing
 * pixel, the Google Translate widget — is wired in by wrapping it here, rather than by
 * retrofitting consent checks into the banner. Consent is checked at the point of use; the
 * banner only records the decision.
 *
 * Mounting is the gate, so children must be the thing that has the side effect (a `<Script>`, an
 * embed) — not a component that fires it in an effect it might have already run.
 */
export function ConsentGate({
  category,
  children,
  fallback = null,
}: {
  category: OptionalCookieCategory;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAllowed } = useCookieConsent();

  return <>{isAllowed(category) ? children : fallback}</>;
}
