-- =============================================================================
-- Stage 0.7 — Roles & permissions (RBAC): the strict spec permission matrix
-- =============================================================================
-- Implements spec §3.2 / §4 exactly (the "Permission matrix" in CLAUDE.md):
-- only a VERIFIED user may book 1:1 / create events / send Invites, and only
-- a verified Mindsetter may open own 1:1 sessions. Unverified members NEVER
-- have these rights — not even inside the 14-day grace window; the 14-day
-- deadline only ever *hardens* an already-absent right into an explicit,
-- auditable flag once it expires. It is a permission flag, never a data
-- deletion (spec §3.2 / CLAUDE.md "14-day verification rule").
--
-- This migration:
--   1. Adds `profiles.access_restricted` (the hardened 14-day flag).
--   2. Extends `guard_profiles_protected_columns()` so `access_restricted`
--      joins verification_status/account_type/is_blocked as staff-/
--      service-role-only (plus one narrow, auditable cron bypass, itself
--      structurally scoped to an UPDATE touching access_restricted alone —
--      see the long comment on `expire_unverified_access()` below).
--   3. Adds `is_verified_member(uuid)` / `is_mindsetter(uuid)` helpers,
--      mirroring `is_staff(uuid)`'s style (sql, stable, security definer,
--      pinned search_path).
--   4. Tightens the `events` / `session_settings` / `availability_slots`
--      write policies that Stage 0.4 explicitly deferred to this stage.
--   5. Schedules the daily pg_cron sweep that sets the flag once
--      `verification_deadline` has passed for still-unverified profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles.access_restricted — hardened 14-day permission flag
-- -----------------------------------------------------------------------------
alter table profiles
  add column if not exists access_restricted boolean not null default false;

comment on column profiles.access_restricted is
  'Hardened 14-day verification flag (spec §3.2). Set true only by the daily pg_cron sweep (via expire_unverified_access()) once an unverified profile''s verification_deadline has passed. NEVER deletes data; it is consulted by is_verified_member()/is_mindsetter() and by server-side permission checks to deny booking/event-creation/invites. Staff-/service-role-only mutation, enforced by guard_profiles_protected_columns().';

-- Supports the daily cron sweep, which filters exactly this predicate
-- (still-unverified, deadline passed, not yet flagged).
create index if not exists profiles_unverified_expiry_sweep_idx
  on profiles (verification_deadline)
  where verification_status = 'unverified' and access_restricted = false;

-- -----------------------------------------------------------------------------
-- 2. Extend guard_profiles_protected_columns(): access_restricted joins the
--    staff-/service-role-only protected columns.
-- -----------------------------------------------------------------------------
-- The cron-bypass branch (`current_setting('mindsetis.bypass_reason', true)`)
-- is explained in full on expire_unverified_access() below — in short: it is
-- a transaction-local flag that only that one hardcoded, non-client-callable
-- function ever sets, so it cannot be forged by a client request. Unlike the
-- is_staff/service_role branches (legitimate full bypass: staff/service role
-- manage every protected column), the GUC branch is intentionally scoped to
-- an UPDATE that changes ONLY access_restricted and leaves
-- verification_status/account_type/is_blocked untouched. This is
-- defense-in-depth: even if some future migration reused the same GUC name
-- for a different purpose, the bypass stays structurally incapable of
-- touching the other protected columns.
create or replace function public.guard_profiles_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_staff(auth.uid())
     or auth.role() = 'service_role'
  then
    return new;
  end if;

  -- Narrow, structurally-scoped cron bypass: only an UPDATE that leaves
  -- verification_status/account_type/is_blocked unchanged (i.e. it can only
  -- ever be touching access_restricted) may pass via the GUC. `tg_op =
  -- 'UPDATE'` is checked first so `old.*` is never referenced on INSERT
  -- (where OLD is not assigned).
  if current_setting('mindsetis.bypass_reason', true) = 'expire_unverified_access'
     and tg_op = 'UPDATE'
     and new.verification_status = old.verification_status
     and new.account_type = old.account_type
     and new.is_blocked = old.is_blocked
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Never trust client input for these on self-insert: coerce to safe
    -- defaults rather than rejecting the insert outright.
    new.verification_status := 'unverified';
    new.account_type := 'member';
    new.is_blocked := false;
    new.access_restricted := false;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Only staff may change profiles.verification_status';
  end if;

  if new.account_type is distinct from old.account_type then
    raise exception 'Only staff may change profiles.account_type';
  end if;

  if new.is_blocked is distinct from old.is_blocked then
    raise exception 'Only staff may change profiles.is_blocked';
  end if;

  if new.access_restricted is distinct from old.access_restricted then
    raise exception 'Only staff may change profiles.access_restricted';
  end if;

  return new;
end;
$$;

comment on function public.guard_profiles_protected_columns() is
  'BEFORE INSERT/UPDATE guard on profiles: on INSERT forces safe defaults (unverified/member/not-blocked/not-restricted) for non-staff callers; on UPDATE blocks non-staff callers from changing verification_status, account_type, is_blocked, or access_restricted. Staff and the service role bypass entirely. The narrow, non-forgeable expire_unverified_access() cron path also bypasses, but ONLY for an UPDATE that changes access_restricted alone (verification_status/account_type/is_blocked must be unchanged) — see that function''s comment for why the GUC itself cannot be forged, and this column-scoping is the additional structural limit on what the bypass can touch.';

-- (Trigger `guard_profiles_protected_columns` already exists from Stage 0.4
-- and points at this function by name; `create or replace function` above
-- is sufficient — no need to re-create the trigger itself.)

-- -----------------------------------------------------------------------------
-- 3. Permission-matrix helpers, mirroring is_staff(uuid)'s style.
-- -----------------------------------------------------------------------------

-- is_verified_member(uid): "Verified Member" tier of the permission matrix —
-- book 1:1 / create events / send Invites. A verified Mindsetter also
-- satisfies this (verification_status='verified' regardless of account_type).
create or replace function public.is_verified_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.verification_status = 'verified'
      and p.is_blocked = false
      and p.access_restricted = false
  );
$$;

comment on function public.is_verified_member(uuid) is
  'True iff uid has a profiles row with verification_status=''verified'', is_blocked=false, and access_restricted=false. Grants the "Verified Member+" tier of the spec §3.2 permission matrix: book 1:1, create events, send Invites. security definer + pinned search_path so it is safe to use inside RLS policies, mirroring is_staff(uuid).';

-- is_mindsetter(uid): "Mindsetter" tier of the permission matrix — open own
-- 1:1 sessions (session_settings / availability_slots). Requires
-- account_type=''mindsetter'' AND verified (a mindsetter who has not yet
-- been verified does not yet have this right).
create or replace function public.is_mindsetter(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.account_type = 'mindsetter'
      and p.verification_status = 'verified'
      and p.is_blocked = false
      and p.access_restricted = false
  );
$$;

comment on function public.is_mindsetter(uuid) is
  'True iff uid has a profiles row with account_type=''mindsetter'', verification_status=''verified'', is_blocked=false, and access_restricted=false. Grants the "open own 1:1 sessions" row of the spec §3.2 permission matrix (session_settings / availability_slots). security definer + pinned search_path so it is safe to use inside RLS policies, mirroring is_staff(uuid).';

-- -----------------------------------------------------------------------------
-- 4. Tighten the write policies Stage 0.4 explicitly deferred to this stage.
-- -----------------------------------------------------------------------------

-- events: only a Verified Member (or verified Mindsetter) may create events.
drop policy if exists "events_insert_own" on events;

create policy "events_insert_own" on events
  for insert
  with check (auth.uid() = organizer_id and is_verified_member(auth.uid()));

-- events: re-gate editing own events to the same Verified Member+ standing.
-- Deliberate tightening vs. Stage 0.4: a user who later loses verified
-- standing (e.g. flagged access_restricted by the 14-day sweep, or blocked)
-- must not retain the ability to edit their existing events' content, per
-- the strict permission matrix (only verified members manage event content).
-- Event `status` transitions remain staff-only via the untouched
-- `guard_events_status` trigger; `events_read`/`events_update_staff` are
-- left as-is, so browsing and staff moderation are unaffected.
drop policy if exists "events_update_own" on events;

create policy "events_update_own" on events
  for update
  using (auth.uid() = organizer_id and is_verified_member(auth.uid()))
  with check (auth.uid() = organizer_id and is_verified_member(auth.uid()));

-- session_settings: only a verified Mindsetter opens/edits own 1:1 config.
drop policy if exists "session_settings_insert_own" on session_settings;
drop policy if exists "session_settings_update_own" on session_settings;

create policy "session_settings_insert_own" on session_settings
  for insert
  with check (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()));

create policy "session_settings_update_own" on session_settings
  for update
  using (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()))
  with check (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()));

-- availability_slots: only a verified Mindsetter manages own bookable slots.
drop policy if exists "availability_slots_insert_own" on availability_slots;
drop policy if exists "availability_slots_update_own" on availability_slots;
drop policy if exists "availability_slots_delete_own" on availability_slots;

create policy "availability_slots_insert_own" on availability_slots
  for insert
  with check (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()));

create policy "availability_slots_update_own" on availability_slots
  for update
  using (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()))
  with check (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()));

create policy "availability_slots_delete_own" on availability_slots
  for delete
  using (auth.uid() = mindsetter_id and is_mindsetter(auth.uid()));

-- NOTE: all *_read*/*_read_public* SELECT policies from Stage 0.4 are left
-- untouched — browsing/viewing always stays available per the permission
-- matrix, even to unverified or access_restricted users.

-- -----------------------------------------------------------------------------
-- 5. Daily pg_cron sweep: harden the 14-day rule as a flag, never a delete.
-- -----------------------------------------------------------------------------
-- Why this needs a dedicated function instead of a bare `update` in
-- cron.schedule(), and why the guard-trigger bypass above is safe:
--
--   * pg_cron jobs execute outside any Supabase/PostgREST request context:
--     there is no JWT, so auth.uid() is null and auth.role() is not
--     'service_role'. A plain `update profiles set access_restricted = true
--     where ...` run from cron would therefore be REJECTED by
--     guard_profiles_protected_columns() exactly like any other anonymous
--     write — which is correct default behavior, but we need one legitimate,
--     narrowly-scoped exception for this specific sweep.
--   * We deliberately did NOT reach for
--     `set session_replication_role = replica` — that disables ALL triggers
--     (and FK checks) database-wide for the session, which would also
--     silently skip set_updated_at and any future guard added to profiles.
--     Far too broad a hammer for one column on one table.
--   * Instead, `expire_unverified_access()` sets a transaction-local custom
--     GUC (`mindsetis.bypass_reason`) immediately before running its own
--     hardcoded UPDATE. guard_profiles_protected_columns() checks for that
--     exact value. This is safe and cannot be reached by a client because:
--       1. `set_config(..., is_local => true)` scopes the GUC to the current
--          transaction only; it does not persist across statements/requests
--          and is unset automatically when the transaction ends.
--       2. `execute` on this function is REVOKEd from PUBLIC (and therefore
--          from the `anon`/`authenticated` roles) below — a client cannot
--          call it directly via PostgREST/RPC to forge the flag, and no
--          other function we expose ever sets this GUC.
--       3. Even in the hypothetical where a client could set the identically
--          named GUC on their own connection, Supabase/PostgREST executes
--          exactly one statement per request/transaction, so there is no way
--          for a client to chain "set the GUC" followed by "run my own
--          UPDATE on profiles" inside the same transaction the way this
--          function does internally in one atomic function body.
--       4. The UPDATE below is hardcoded and non-parameterized from the
--          caller's side: it can only ever flip access_restricted
--          false -> true, and only for rows that are already unverified with
--          an already-passed verification_deadline. It is not a
--          general-purpose guard bypass, so even a hypothetical GUC leak
--          could not be used to touch verification_status, account_type, or
--          is_blocked — and this is now also enforced structurally inside
--          guard_profiles_protected_columns() itself: the GUC branch there
--          only passes for an UPDATE that leaves verification_status,
--          account_type, and is_blocked unchanged, so even a hypothetically
--          reused GUC name could never widen the bypass beyond
--          access_restricted.
--   * The function is `security definer` (owned by the migration role) so it
--     can perform the UPDATE regardless of the (nonexistent) caller identity
--     under pg_cron, and `set search_path = public` pins it against
--     search-path hijacking, matching every other security definer function
--     in this schema.
create or replace function public.expire_unverified_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('mindsetis.bypass_reason', 'expire_unverified_access', true);

  update public.profiles
  set access_restricted = true
  where verification_status = 'unverified'
    and verification_deadline is not null
    and verification_deadline < now()
    and access_restricted = false;
end;
$$;

comment on function public.expire_unverified_access() is
  'Daily pg_cron target (job "expire-unverified-access"): hardens the spec §3.2 14-day rule into profiles.access_restricted for still-unverified profiles whose verification_deadline has passed. NEVER deletes data — flips a permission flag only. security definer + a transaction-local mindsetis.bypass_reason GUC let it pass guard_profiles_protected_columns() without opening that guard to clients (see the long comment above this function for why the bypass cannot be forged). EXECUTE is revoked from PUBLIC/anon/authenticated so only the role that owns the pg_cron job can invoke it.';

revoke all on function public.expire_unverified_access() from public;

-- Idempotent (re-)scheduling: drop any existing job with this name before
-- scheduling, so re-running this migration (e.g. `supabase db push` retries)
-- never creates duplicate cron jobs.
select cron.unschedule(jobid) from cron.job where jobname = 'expire-unverified-access';

-- Daily at 03:00 UTC — matches spec §2.3 "checks daily" for the 14-day rule.
select cron.schedule(
  'expire-unverified-access',
  '0 3 * * *',
  $$ select public.expire_unverified_access(); $$
);
