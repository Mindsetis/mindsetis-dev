import { z } from 'zod';

/**
 * Cookie-consent state: what it is, how it's stored, and how it's read back.
 *
 * Shared by the server (the root layout reads the cookie during SSR) and the client (the
 * provider writes it), so this module must stay free of `next/headers`, `server-only`, and
 * anything DOM — the two side-specific halves live in `lib/cookies/server.ts` and
 * `components/cookies/CookieConsentProvider.tsx`.
 *
 * WHY A COOKIE AND NOT `localStorage`. The banner's visibility is decided during SSR. Only a
 * cookie is visible to the server, so reading it there lets the first painted HTML already know
 * whether to render the banner; `localStorage` is client-only, which would mean either a flash
 * of the banner for everyone who has already chosen, or a flash of nothing for those who
 * haven't. Not `HttpOnly` for the same reason the value is deliberately non-sensitive: the
 * client has to read it to gate scripts, and it carries no identifier — just three booleans.
 *
 * NO COOKIE IS WRITTEN UNTIL THE VISITOR CHOOSES. Absence is a meaningful state ("undecided"),
 * distinct from "decided, everything off" — the banner shows for the former and not the latter.
 */

export const COOKIE_CONSENT_NAME = 'mindsetis_cookie_consent';

/**
 * Bumped whenever the set of categories changes, which invalidates every stored choice and
 * re-asks. Consent given against a three-category prompt isn't consent to a fourth category the
 * visitor was never shown, so a stale version has to be treated as "undecided" rather than
 * silently carried forward — see `parseCookieConsent`.
 */
export const COOKIE_CONSENT_VERSION = 1;

/** ~6 months. Long enough not to nag, short enough that consent stays a current decision. */
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

/**
 * The categories the visitor can actually decide, in the order Figma's preferences modal lists
 * them. "Strictly necessary" is deliberately NOT here: it can't be switched off, so there is no
 * decision to store, and modelling it as a stored `true` would invite code that reads it as if
 * it were a choice.
 */
export const OPTIONAL_COOKIE_CATEGORIES = ['analytics', 'marketing', 'functional'] as const;

export type OptionalCookieCategory = (typeof OPTIONAL_COOKIE_CATEGORIES)[number];

export type CookieConsent = {
  v: number;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  /** ISO timestamp of the decision — needed to evidence *when* consent was given. */
  ts: string;
};

/**
 * A cookie value is untrusted input (any visitor can hand-edit it), so it goes through Zod like
 * every other boundary in this codebase. Kept local rather than in `lib/validation/` because
 * nothing outside this module parses it.
 */
const cookieConsentSchema = z.object({
  v: z.number().int(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  functional: z.boolean(),
  ts: z.string(),
});

/**
 * Returns `null` for "no decision on record" — cookie absent, unparseable, hand-edited into a
 * shape we don't recognise, or written against an older category set. Every one of those cases
 * has to re-ask rather than assume, so they collapse to one return value on purpose.
 */
export function parseCookieConsent(raw: string | undefined | null): CookieConsent | null {
  if (!raw) return null;

  // Written URL-encoded: a raw JSON string is not a legal cookie value, since RFC 6265's
  // cookie-octet excludes the double quote, comma, and braces this payload is full of. Whether
  // it arrives back still encoded depends on who parsed the header, so both forms are accepted
  // rather than betting on one — the decoded form is tried second, and because the payload
  // contains no literal percent sign, decoding an already-decoded value is a no-op.
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    try {
      candidate = JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }

  const parsed = cookieConsentSchema.safeParse(candidate);
  if (!parsed.success) return null;
  if (parsed.data.v !== COOKIE_CONSENT_VERSION) return null;

  return parsed.data;
}

/** Every optional category on — the "Accept all" button. */
export function acceptAllConsent(now: string): CookieConsent {
  return { v: COOKIE_CONSENT_VERSION, analytics: true, marketing: true, functional: true, ts: now };
}

/**
 * Every optional category off — the "Reject all" button, on BOTH the banner and the modal.
 * Rejecting is a recorded decision, not the absence of one: it writes a cookie so the banner
 * stops appearing. (That cookie is itself strictly necessary — remembering "no" is the only way
 * to honour it.)
 */
export function rejectAllConsent(now: string): CookieConsent {
  return {
    v: COOKIE_CONSENT_VERSION,
    analytics: false,
    marketing: false,
    functional: false,
    ts: now,
  };
}

export function isCategoryAllowed(
  consent: CookieConsent | null,
  category: OptionalCookieCategory,
): boolean {
  return consent?.[category] === true;
}
