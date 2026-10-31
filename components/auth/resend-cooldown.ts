'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

/**
 * Client-side pause between two "send me another email" requests (Release 2 Т1) — the client asked
 * for 30–60 seconds, and 60 also matches Supabase's own minimum gap between two auth emails to
 * one address, so a second click inside that minute could only ever fail.
 *
 * This is a UX guard, NOT a security control: it lives in the browser and anyone can skip it. The
 * real ceilings are server-side (per-IP and per-address buckets in the actions, plus Supabase's
 * own limits). What it buys is that an honest visitor cannot hammer the button and burn through
 * those ceilings by accident, and sees WHY nothing is happening.
 *
 * WHY A SHARED, KEYED CLOCK INSTEAD OF A `useState` TIMER IN EACH BUTTON
 *   The mail that matters is often sent BEFORE the button is on screen: sign-up has just mailed a
 *   confirmation by the time `/verify-email` renders, the forgot-password form has just mailed a
 *   reset link by the time `/forgot-password/sent` renders. A timer owned by the button would
 *   start at zero on arrival and let the very first click land inside the minute. Instead the
 *   sender records "no resend before T" under a (scope, address) key and every button for that
 *   pair reads it — across a reload (sessionStorage) and across components (the log-in form's
 *   "confirm your email" button shares the confirmation clock with `/verify-email`).
 *
 * Keyed by SCOPE (which kind of mail) and ADDRESS, so a visitor who corrects a typo and asks for
 * a mail to a different address is not blocked by the previous one.
 */

export const RESEND_COOLDOWN_SECONDS = 60;

/** `confirmation` = signup confirmation email; `reset` = password-reset email. */
export type ResendCooldownScope = 'confirmation' | 'reset';

const TICK_MS = 500;

/** Fallback for browsers where `sessionStorage` throws (private mode, storage disabled). */
const memory = new Map<string, number>();
const listeners = new Set<() => void>();

function keyFor(scope: ResendCooldownScope, email: string): string {
  return `mindsetis:resend-cooldown:${scope}:${email.trim().toLowerCase()}`;
}

function readDeadline(key: string): number {
  try {
    const stored = Number(window.sessionStorage.getItem(key));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // Storage unavailable — fall through to the in-memory copy.
  }
  return memory.get(key) ?? 0;
}

function secondsLeft(key: string): number {
  return Math.max(0, Math.ceil((readDeadline(key) - Date.now()) / 1000));
}

/**
 * Record that a mail of this kind has just gone to `email`: its buttons stay disabled for
 * `seconds`. Call it right after a send (or after the server said "too many"), from client code.
 */
export function startResendCooldown(
  scope: ResendCooldownScope,
  email: string,
  seconds: number = RESEND_COOLDOWN_SECONDS,
): void {
  const key = keyFor(scope, email);
  const deadline = Date.now() + seconds * 1000;
  memory.set(key, deadline);
  try {
    window.sessionStorage.setItem(key, String(deadline));
  } catch {
    // The in-memory copy above still covers this page view.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const interval = window.setInterval(listener, TICK_MS);
  return () => {
    listeners.delete(listener);
    window.clearInterval(interval);
  };
}

/** `m:ss` — 60 → "1:00", 45 → "0:45". */
function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Subscribe a resend button to the clock for (`scope`, `email`).
 *
 * `label` is the localized "Resend in 0:45" text while the pause is running, `null` otherwise —
 * the button swaps it in for its normal caption and disables itself while `coolingDown`.
 * The server snapshot is "no pause", so the first paint matches the server's HTML; a stored
 * pause applies a moment later, on hydration.
 */
export function useResendCooldown(
  scope: ResendCooldownScope,
  email: string,
): { coolingDown: boolean; label: string | null } {
  const t = useTranslations('auth.cooldown');
  const key = keyFor(scope, email);
  const remaining = useSyncExternalStore(
    subscribe,
    () => secondsLeft(key),
    () => 0,
  );

  return {
    coolingDown: remaining > 0,
    label: remaining > 0 ? t('wait', { time: formatCountdown(remaining) }) : null,
  };
}
