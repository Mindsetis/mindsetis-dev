/**
 * Server-side auth/permission guards — the entry point for "who is calling?".
 *
 * These are the *server* line of defense that complements RLS (the database baseline).
 * Use `getCurrentUser` / `getSessionContext` for optional auth (rendering), and the
 * `requireX` variants inside Server Actions / Route Handlers to hard-fail with a typed
 * `ActionError` when the caller isn't allowed.
 *
 * NOTE: the full permission matrix (verified-member / mindsetter gating, 14-day flag) is
 * finalized in stage 0.7 (RBAC). This module ships the *pattern* + the primitives it needs;
 * `requireVerifiedMember` is provided so booking/event actions have a gate to call, and 0.7
 * layers the effective-permissions resolver on top.
 */
import 'server-only';

import type { User } from '@supabase/supabase-js';

import { ActionError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';

/** Minimal profile fields needed for permission checks. */
export interface ProfileContext {
  id: string;
  username: string;
  account_type: 'member' | 'mindsetter';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_deadline: string | null;
  is_blocked: boolean;
}

export interface SessionContext {
  user: User;
  profile: ProfileContext | null;
}

/** The signed-in user, or `null`. Uses `getUser()` (re-validates the token server-side). */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The user + their profile row, or `null` when unauthenticated. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, account_type, verification_status, verification_deadline, is_blocked')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: (profile as ProfileContext | null) ?? null };
}

/** Require a signed-in user. Throws `unauthenticated` otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ActionError('unauthenticated', 'You must be signed in to do that.');
  }
  return user;
}

/** Require a signed-in user whose email is confirmed. Throws otherwise. */
export async function requireConfirmedUser(): Promise<User> {
  const user = await requireUser();
  if (!user.email_confirmed_at) {
    throw new ActionError('forbidden', 'Please confirm your email address first.');
  }
  return user;
}

/** Require a full session context (user + existing profile). */
export async function requireSessionContext(): Promise<
  SessionContext & { profile: ProfileContext }
> {
  const ctx = await getSessionContext();
  if (!ctx) throw new ActionError('unauthenticated', 'You must be signed in to do that.');
  if (!ctx.profile) throw new ActionError('not_found', 'Your profile could not be found.');
  if (ctx.profile.is_blocked) throw new ActionError('forbidden', 'Your account is blocked.');
  return { user: ctx.user, profile: ctx.profile };
}

/** True when the 14-day window has NOT lapsed (or no deadline is set). */
export function isWithinVerificationWindow(
  profile: ProfileContext,
  now: Date = new Date(),
): boolean {
  if (!profile.verification_deadline) return true;
  return new Date(profile.verification_deadline).getTime() >= now.getTime();
}

/**
 * Require a verified member (may book 1:1 / create events / send Invites).
 *
 * A member counts as verified when `verification_status === 'verified'`. This implementation
 * ALSO grants rights to `unverified` users still inside the 14-day window, per the §3.2
 * "14-day rule" ("expired unverified users lose the right to book"). NOTE: the permission
 * matrix table (CLAUDE.md / spec) marks unverified as ❌ unconditionally, so the two can be
 * read as conflicting. This guard is NOT wired to any live action yet — resolve the intended
 * semantics with the spec owner in stage 0.7 before hanging real booking/event/invite
 * actions off it. Full matrix + effective-permissions resolver land in 0.7.
 */
export async function requireVerifiedMember(): Promise<
  SessionContext & { profile: ProfileContext }
> {
  const ctx = await requireSessionContext();
  const { profile } = ctx;
  const allowed =
    profile.verification_status === 'verified' ||
    (profile.verification_status === 'unverified' && isWithinVerificationWindow(profile));
  if (!allowed) {
    throw new ActionError(
      'forbidden',
      'This action requires a verified account. Please complete verification.',
    );
  }
  return ctx;
}
