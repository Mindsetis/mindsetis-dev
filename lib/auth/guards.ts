/**
 * Server-side auth/permission guards — the entry point for "who is calling?".
 *
 * These are the *server* line of defense that complements RLS (the database baseline).
 * Use `getCurrentUser` / `getSessionContext` for optional auth (rendering), and the
 * `requireX` variants inside Server Actions / Route Handlers to hard-fail with a typed
 * `ActionError` when the caller isn't allowed.
 *
 * RBAC (stage 0.7): the full permission matrix lives in `./permissions.ts`
 * (`resolvePermissions` / `EffectivePermissions`). This module fetches the underlying data
 * (profile, staff role) via the correct Supabase client and exposes the `requireX` guards
 * that Server Actions / Route Handlers call to hard-fail.
 */
import 'server-only';

import type { User } from '@supabase/supabase-js';

import { ActionError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/validation/roles';

import { type EffectivePermissions, resolvePermissions } from './permissions';

/** Minimal profile fields needed for permission checks. */
export interface ProfileContext {
  id: string;
  username: string;
  account_type: 'member' | 'mindsetter';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_deadline: string | null;
  is_blocked: boolean;
  /** Hardened 14-day flag: set once the verification window has lapsed unverified. */
  access_restricted: boolean;
  /**
   * Release-1 F4 "photo required" rule — added alongside `photo_requirement_waived` below so
   * `resolvePermissions` can gate `canBook`/`canSendInvite` on having a photo (or a waiver). Only
   * this guard's own minimal select carries it; the public profile page queries stay untouched
   * (deliberately minimal, per that file's own comment).
   */
  avatar_url: string | null;
  /** Staff-only escape hatch (public figures who won't upload a photo) — see the migration
   * `20260920101855_profiles_photo_requirement_waiver.sql`. Never written from the client. */
  photo_requirement_waived: boolean;
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
    .select(
      'id, username, account_type, verification_status, verification_deadline, is_blocked, access_restricted, avatar_url, photo_requirement_waived',
    )
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: (profile as ProfileContext | null) ?? null };
}

/**
 * The caller's staff role (`admin` | `moderator`), or `null` when they aren't staff.
 * RLS (`staff_roles_read_own_or_staff`) lets a user read their OWN row via the anon/server
 * client, so this is safe to call without the service-role client.
 */
export async function getStaffRole(userId?: string): Promise<StaffRole | null> {
  const supabase = await createClient();
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    uid = user.id;
  }

  const { data } = await supabase
    .from('staff_roles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();

  return (data?.role as StaffRole | undefined) ?? null;
}

/** The caller's fully-resolved permission set, or `null` when unauthenticated/no profile. */
export async function getEffectivePermissions(): Promise<EffectivePermissions | null> {
  const ctx = await getSessionContext();
  if (!ctx?.profile) return null;
  const staffRole = await getStaffRole(ctx.user.id);
  return resolvePermissions(ctx.profile, staffRole);
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

/**
 * Require a verified member (may book 1:1 / create events / send Invites).
 *
 * STRICT MATRIX (resolved per CLAUDE.md / spec §3.2): allowed ONLY when
 * `verification_status === 'verified'` AND `!access_restricted` AND `!is_blocked`. There is
 * NO allowance for `unverified` users still inside the 14-day window — the matrix marks
 * unverified as ❌ unconditionally. (`is_blocked` is already enforced by
 * `requireSessionContext`, checked again here for a self-contained guard.)
 *
 * NOTE (Release-1 F4, 2026-09-20): this one guard is documented (see `docs/RBAC.md`) as the
 * gate for booking / event-creation / invite-sending ALIKE — it does NOT distinguish between
 * them. `resolvePermissions` (`./permissions.ts`) now DOES distinguish: `canBook` and
 * `canSendInvite` additionally require a photo (`avatar_url` or `photo_requirement_waived`),
 * while `canCreateEvent` does not. No booking/invite Server Action exists yet to consume
 * either guard (both CTAs are still `NotYetAvailable` placeholders), so nothing is wired
 * incorrectly today — but whoever builds those actions must NOT gate booking/invite on this
 * function alone; call `resolvePermissions(...).canBook` / `.canSendInvite` (or a future
 * `requireCanBook`/`requireCanSendInvite` guard built the same way) instead, and keep using
 * this function as-is for event creation.
 */
export async function requireVerifiedMember(): Promise<
  SessionContext & { profile: ProfileContext }
> {
  const ctx = await requireSessionContext();
  const { profile } = ctx;
  const allowed =
    profile.verification_status === 'verified' && !profile.access_restricted && !profile.is_blocked;
  if (!allowed) {
    throw new ActionError(
      'forbidden',
      'This action requires a verified account. Please complete verification.',
    );
  }
  return ctx;
}

/**
 * Require a verified Mindsetter (may open their own 1:1 session types / has a public profile).
 * Strict matrix: `account_type === 'mindsetter'` AND verified (see `requireVerifiedMember`).
 */
export async function requireMindsetter(): Promise<SessionContext & { profile: ProfileContext }> {
  const ctx = await requireVerifiedMember();
  if (ctx.profile.account_type !== 'mindsetter') {
    throw new ActionError('forbidden', 'This action is only available to Mindsetters.');
  }
  return ctx;
}

/**
 * Require a staff member (`staff_roles` row). Pass `minRole: 'admin'` to require the
 * `admin` role specifically (moderator < admin); omit it to allow either staff role.
 */
export async function requireStaff(
  minRole?: StaffRole,
): Promise<SessionContext & { profile: ProfileContext; staffRole: StaffRole }> {
  const ctx = await requireSessionContext();
  const staffRole = await getStaffRole(ctx.user.id);
  if (!staffRole) {
    throw new ActionError('forbidden', 'This action requires staff access.');
  }
  if (minRole === 'admin' && staffRole !== 'admin') {
    throw new ActionError('forbidden', 'This action requires admin access.');
  }
  return { ...ctx, staffRole };
}
