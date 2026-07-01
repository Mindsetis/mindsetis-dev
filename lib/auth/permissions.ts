/**
 * Effective-permissions resolver — the strict §3.2 permission matrix, expressed as a pure
 * function so it can be unit-tested and reused by both server guards and (if ever needed)
 * client-side read-only UI hints. No Supabase import here on purpose: callers fetch the
 * profile/staff-role rows (via the correct Supabase client for their context) and pass the
 * plain data in.
 *
 * STRICT MATRIX (resolved per CLAUDE.md / spec §3.2): only a
 * `verification_status === 'verified'` account — that is also not blocked and not
 * `access_restricted` (the hardened 14-day flag) — gets book / create-event / send-invite.
 * There is NO "unverified but still within the 14-day window" allowance; unverified users
 * are ❌ across the board, unconditionally.
 */
import type { StaffRole } from '@/lib/validation/roles';

import type { ProfileContext } from './guards';

/** The fully-resolved set of things the current caller may do, given their profile + staff role. */
export interface EffectivePermissions {
  /** Always true — even blocked/restricted users may view the platform (read-only). */
  canBrowse: boolean;
  canBook: boolean;
  canCreateEvent: boolean;
  canSendInvite: boolean;
  /** Mindsetter-only: may open their own 1:1 session types. */
  canOpenOwnSessions: boolean;
  /** Mindsetter-only, and only once verified: public profile page is live. */
  hasPublicProfile: boolean;
  isStaff: boolean;
  staffRole: StaffRole | null;
}

/**
 * Pure resolver: profile + staff role in, effective permissions out.
 *
 * `is_blocked` / `access_restricted` gating for booking-type actions is intentionally
 * folded in here (rather than left to callers) so every consumer of `EffectivePermissions`
 * gets the same answer. Blocking a *session* (unauthenticated / hard-blocked) entirely is
 * still handled separately by `requireSessionContext`.
 */
export function resolvePermissions(
  profile: ProfileContext,
  staffRole: StaffRole | null,
): EffectivePermissions {
  const isVerified =
    profile.verification_status === 'verified' && !profile.is_blocked && !profile.access_restricted;

  const isMindsetter = profile.account_type === 'mindsetter';

  return {
    canBrowse: true,
    canBook: isVerified,
    canCreateEvent: isVerified,
    canSendInvite: isVerified,
    canOpenOwnSessions: isMindsetter && isVerified,
    hasPublicProfile: isMindsetter && isVerified,
    isStaff: staffRole !== null,
    staffRole,
  };
}
