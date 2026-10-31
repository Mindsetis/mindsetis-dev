import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Proof that the current session came from a password-reset link — required by `updatePassword`
 * (security audit, 30.10.2026).
 *
 * WHY: since Release-2 П3 the reset screen keeps the user signed in, and `/reset-password` itself
 * is open to any signed-in session. Without a marker, ANY session — a stolen cookie, a laptop left
 * unlocked — could set a new password without knowing the old one, bypassing the re-auth the
 * cabinet's own "Change password" deliberately asks for. So `/api/auth/confirm` issues this
 * marker only after a recovery link verifies, and `updatePassword` refuses without it.
 *
 * It must be unforgeable, not just present: whoever holds a session also controls their own
 * cookies. So the value is `userId.expiresAt.signature`, HMAC-signed with a key derived from the
 * server-only Supabase secret, and checked against the session's own user id.
 */
export const RECOVERY_MARKER_COOKIE = 'mindsetis_recovery';

/** How long after clicking the reset link the new password may be set. */
export const RECOVERY_MARKER_TTL_SECONDS = 15 * 60;

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('SUPABASE_SECRET_KEY is not set');
  // Derived rather than the secret itself, so this signature can never double as anything else.
  return createHmac('sha256', secret).update('mindsetis:recovery-marker:v1').digest();
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

/** A fresh marker value for `userId`, valid for `RECOVERY_MARKER_TTL_SECONDS`. */
export function createRecoveryMarker(userId: string): string {
  const payload = `${userId}.${Date.now() + RECOVERY_MARKER_TTL_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

/** Whether `value` is an unexpired marker issued for `userId`. */
export function isValidRecoveryMarker(value: string | undefined, userId: string): boolean {
  if (!value) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const payload = value.slice(0, lastDot);
  const [markerUserId, expiresAt] = payload.split('.');
  if (markerUserId !== userId || !(Number(expiresAt) > Date.now())) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(value.slice(lastDot + 1));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
