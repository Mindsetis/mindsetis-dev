# RBAC & permissions (stage 0.7)

How Mindsetis resolves "what is this caller allowed to do?" Source of truth is spec §3.2 +
the permission matrix in `CLAUDE.md`; this doc is the concrete "how" (SQL helpers, server
guards, middleware). Complements `docs/API_CONVENTIONS.md` (auth guards were stubbed there
in stage 0.5, finalized here).

## The strict matrix

| Action                                   | Member (unverified) | Verified Member | Mindsetter         | Staff |
| ---------------------------------------- | ------------------- | --------------- | ------------------ | ----- |
| Browse platform/catalog                  | ✅                  | ✅              | ✅                 | ✅    |
| Public profile                           | —                   | —               | ✅ (once verified) | —     |
| Book 1:1                                 | ❌                  | ✅              | ✅                 | —     |
| Create events                            | ❌                  | ✅              | ✅                 | —     |
| Send Invite                              | ❌                  | ✅              | ✅                 | —     |
| Open own 1:1 sessions                    | ❌                  | ❌              | ✅ (once verified) | —     |
| Change verification status / staff roles | ❌                  | ❌              | ❌                 | ✅    |

**As implemented, this is intentionally strict** (`lib/auth/permissions.ts:8-13`,
`lib/auth/guards.ts:131-138`): a right is granted **only** when
`verification_status === 'verified' && !is_blocked && !access_restricted`. There is **no**
"unverified but still inside the 14-day window" allowance — unverified accounts are ❌ across
the board, unconditionally, from day one. The 14-day deadline never _grants_ anything; it only
_hardens_ an already-absent right into an explicit, auditable flag once the window lapses (see
below). Mindsetter-only rights (`canOpenOwnSessions`, `hasPublicProfile`) additionally require
`account_type === 'mindsetter'` **and** verified — an unverified Mindsetter has neither yet.

## 14-day rule → `access_restricted`

- On signup, `verification_deadline = now() + interval '14 days'` (stage 0.6,
  `handle_new_user` trigger).
- `profiles.access_restricted boolean not null default false` — the hardened flag
  (`supabase/migrations/20260701100500_rbac.sql:31-41`).
- Daily `pg_cron` job **`expire-unverified-access`** (`0 3 * * *` UTC) runs
  `public.expire_unverified_access()`, which sets `access_restricted = true` for profiles
  where `verification_status = 'unverified' AND verification_deadline < now() AND
access_restricted = false` (migration `:287-303`, `:310-320`).
- **Permission flag, never a delete** — the row and all its data are untouched; only future
  access checks (`is_verified_member`, `resolvePermissions`) start returning `false` because
  `access_restricted` is now `true`. This matches the spec §3.2 / CLAUDE.md "14-day
  verification rule" verbatim.
- A profile can also lose "verified" standing at any time via `is_blocked` (staff action),
  independent of the 14-day sweep.

## SQL helpers

`security definer`, `stable`, pinned `search_path = public` — safe to call from inside RLS
policies (mirrors the pre-existing `is_staff(uuid)`):

| Helper                         | True iff                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `is_verified_member(uid uuid)` | `verification_status = 'verified' AND is_blocked = false AND access_restricted = false` |
| `is_mindsetter(uid uuid)`      | above **AND** `account_type = 'mindsetter'`                                             |
| `is_staff(uid uuid)`           | has a `staff_roles` row (pre-existing, stage 0.4)                                       |

Used directly in RLS `with check` / `using` clauses tightened in this stage
(`supabase/migrations/20260701100500_rbac.sql:174-233`):

- `events_insert_own` / `events_update_own` — `auth.uid() = organizer_id AND
is_verified_member(auth.uid())`.
- `session_settings_insert_own` / `_update_own` — `auth.uid() = mindsetter_id AND
is_mindsetter(auth.uid())`.
- `availability_slots_insert_own` / `_update_own` / `_delete_own` — same, mindsetter-owned.

All `*_read*` / `*_read_public*` SELECT policies from stage 0.4 are untouched: browsing
always stays available, even to unverified or `access_restricted` users.

`profiles.verification_status`, `account_type`, `is_blocked`, and now `access_restricted` are
all staff-/service-role-only columns, enforced by the `guard_profiles_protected_columns()`
BEFORE INSERT/UPDATE trigger (extended in this stage; see the migration's inline comments for
the narrow, non-forgeable cron bypass that lets `expire_unverified_access()` alone flip
`access_restricted` from outside any request context).

## Server guards (`lib/auth/guards.ts`, `lib/auth/permissions.ts`)

| Function                    | Behavior                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `getCurrentUser()`          | Signed-in `User` or `null` (re-validates via `getUser()`).                                     |
| `getSessionContext()`       | `{ user, profile }` or `null` — optional auth for rendering.                                   |
| `getStaffRole(userId?)`     | `'admin' \| 'moderator' \| null` for the caller (or a given uid).                              |
| `getEffectivePermissions()` | Full `EffectivePermissions` for the current caller, or `null` if unauthenticated/no profile.   |
| `requireUser()`             | Throws `unauthenticated` if not signed in.                                                     |
| `requireConfirmedUser()`    | `requireUser()` + throws `forbidden` if email isn't confirmed.                                 |
| `requireSessionContext()`   | Signed-in + has a profile + not `is_blocked`; throws otherwise.                                |
| `requireVerifiedMember()`   | Strict matrix gate: `verification_status === 'verified' && !access_restricted && !is_blocked`. |
| `requireMindsetter()`       | `requireVerifiedMember()` + `account_type === 'mindsetter'`.                                   |
| `requireStaff(minRole?)`    | Has a `staff_roles` row; pass `'admin'` to require admin specifically (moderator < admin).     |

`resolvePermissions(profile, staffRole)` (`lib/auth/permissions.ts:41-60`) is the pure
resolver behind `getEffectivePermissions()` — no Supabase import, so it's unit-testable and
reusable for read-only client-side UI hints if ever needed. Returns:

```ts
interface EffectivePermissions {
  canBrowse: boolean; // always true
  canBook: boolean;
  canCreateEvent: boolean;
  canSendInvite: boolean;
  canOpenOwnSessions: boolean; // mindsetter-only
  hasPublicProfile: boolean; // mindsetter-only
  isStaff: boolean;
  staffRole: StaffRole | null;
}
```

### Usage in a Server Action

```ts
'use server';
import { requireVerifiedMember, requireMindsetter, requireStaff } from '@/lib/auth/guards';

// Gate a booking/event/invite action:
const { user, profile } = await requireVerifiedMember(); // throws ActionError('forbidden', …)

// Gate opening own 1:1 session types:
const { profile } = await requireMindsetter();

// Gate an admin action; omit minRole to allow admin OR moderator:
const { staffRole } = await requireStaff('admin');
```

See `docs/API_CONVENTIONS.md` for the full `createAction` / `ActionResult` contract these
guards plug into.

## Role/status enums (`lib/validation/roles.ts`)

Single source of truth for the literal unions shared by `profiles` / `staff_roles`, so forms,
Server Actions, and guards all agree:

- `accountTypeSchema` → `'member' | 'mindsetter'`
- `verificationStatusSchema` → `'unverified' | 'pending' | 'verified' | 'rejected'`
- `staffRoleSchema` → `'admin' | 'moderator'`

## Staff roles

`staff_roles` (stage 0.4) stores `admin` / `moderator`, **separate from `account_type`** —
being staff is orthogonal to being a Member or Mindsetter. Rows are service-role-write-only
(no client INSERT/UPDATE policy); `staff_roles_read_own_or_staff` RLS lets a signed-in user
read their _own_ row (so `getStaffRole()` works via the anon/server client without needing
`lib/supabase/service.ts`), while staff can read all rows.

## `/admin` middleware gate — defense-in-depth only

`middleware.ts` redirects unauthenticated visitors away from `/admin/**` to `/login`, and
non-staff signed-in visitors back to `/`, by checking for a `staff_roles` row
(`middleware.ts:29-62, 107-122`). This exists only to stop non-staff visitors from ever
rendering the back-office shell — **it is not the enforcement boundary**. The real
enforcement is `requireStaff()` at the page/Server Action level (`lib/auth/guards.ts`),
backed by RLS: middleware can't safely branch on `minRole` ('admin' vs 'moderator') per
route, so every staff page/action must still call `requireStaff()` (with `minRole` where
appropriate) itself.

## Security lesson: `SECURITY DEFINER` + `ALTER DEFAULT PRIVILEGES` trap

`supabase/migrations/20260701100500_rbac.sql` created `expire_unverified_access()` as
`security definer` and ran `revoke all on function ... from public;`, believing that closed
it to clients. QA found it was still directly callable via PostgREST RPC by `anon`/
`authenticated` (a direct RPC POST returned HTTP 204). Root cause, fixed in
`supabase/migrations/20260701100600_lockdown_expire_unverified_fn.sql`:

> Every Supabase project ships a project-level `alter default privileges ... grant execute on
functions to anon, authenticated, service_role;` template. The instant a function is
> `create`d, Postgres materializes a **direct EXECUTE grant to `anon`/`authenticated`** on
> that function object — a distinct ACL entry, not implied by (and not touched by) `revoke
... from public`. `revoke ... from public` only revokes the pseudo-role PUBLIC's privilege
> ("everyone with no explicit grant"); it does **not** touch grants that default-privileges
> separately materialized for named roles.

**Rule for every future migration:** any `security definer` function that must NOT be
client-callable via PostgREST RPC (cron-only / service-only functions — anything that
performs a privileged write and isn't meant to be invoked by a client) needs:

```sql
revoke execute on function <fn> from public, anon, authenticated;
```

naming `anon`/`authenticated` explicitly — `revoke ... from public` alone is **not**
sufficient on a Supabase project. (REVOKE of an already-absent privilege is a documented
Postgres no-op, so this is always safe to re-run.) Conversely, `security definer` helpers
that RLS policies evaluate as the _current_ caller — `is_verified_member`, `is_mindsetter`,
`is_staff` — must **keep** EXECUTE granted to `anon`/`authenticated`, or every policy
referencing them stops evaluating and the guarded table becomes inaccessible. Those helpers
are harmless to expose directly (read-only, no side effects); only functions that _write_
need the explicit revoke.

## Related

- `docs/API_CONVENTIONS.md` — `ActionResult`, `createAction`, error codes, rate limiting.
- `CLAUDE.md` → "Permission matrix", "14-day verification rule", "Security rules" — the
  policy-level source this doc implements.
- `docs/mindsetis-mvp-tz.md` §3.2 — the spec matrix itself (wins on any conflict).
