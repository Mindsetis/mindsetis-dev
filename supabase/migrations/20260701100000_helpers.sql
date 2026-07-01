-- =============================================================================
-- Stage 0.4 — Core data model: shared helper functions
-- =============================================================================
-- Two reusable building blocks for every table created from this point on
-- (see CLAUDE.md "DB table conventions" and spec §4):
--
--   * set_updated_at()  — generic BEFORE UPDATE trigger function that stamps
--                          NEW.updated_at = now(). Attached per-table by the
--                          migrations that create each table.
--   * is_staff(uuid)     — SQL helper used inside RLS policies to grant staff
--                          (admin/moderator, per `staff_roles`) access without
--                          duplicating the subquery in every policy.
--
-- is_staff() is `security definer` + a pinned `search_path` so that:
--   1. it can read `staff_roles` even though that table's own SELECT policy
--      calls is_staff() again — security definer runs as the function owner
--      (which bypasses RLS, avoiding infinite recursion between the policy
--      and the helper it depends on);
--   2. it cannot be hijacked by a caller-controlled search_path (function
--      search_path pinning is a standard Postgres/Supabase security definer
--      hardening step).
-- `stable` lets the planner cache/inline results within a single statement.
-- =============================================================================

-- is_staff() below forward-references the `staff_roles` table, which is only
-- created in the next migration (20260701100100_profiles.sql). Postgres
-- validates function bodies against existing catalog objects at CREATE
-- FUNCTION time by default (check_function_bodies = on); disable that check
-- just around is_staff() the same way pg_dump does for forward-referencing
-- functions, then RESET it below so the relaxation does not leak to any later
-- migration applied in the same push session. This does not affect the
-- function's runtime behavior.
-- (Plain SET, not SET LOCAL: `supabase db push` runs each migration file in
-- autocommit, so SET LOCAL would warn "can only be used in transaction blocks"
-- and be a no-op; the trailing RESET is what scopes it.)
set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- set_updated_at(): generic "touch updated_at" trigger function
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Generic BEFORE UPDATE trigger: stamps NEW.updated_at = now(). Attach to every table with an updated_at column.';

-- -----------------------------------------------------------------------------
-- is_staff(uuid): true if the given user id has a row in staff_roles
-- (admin or moderator). Used throughout RLS policies for staff-wide access.
-- -----------------------------------------------------------------------------
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = uid
  );
$$;

comment on function public.is_staff(uuid) is
  'Returns true if uid has an admin/moderator row in staff_roles. security definer + pinned search_path so it can be safely used inside RLS policies (incl. staff_roles'' own policies) without recursion.';

-- Restore body validation for the remainder of the push session (see note above).
reset check_function_bodies;
