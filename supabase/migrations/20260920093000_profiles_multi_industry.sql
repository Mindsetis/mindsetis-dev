-- =============================================================================
-- Release 1 / E1 — profiles: multiple industries + free-text "Other" industry
-- =============================================================================
-- Replaces the single `profiles.industry text` column (added in
-- 20260714101121_profiles_step3_build_fields.sql, populated from the fixed
-- catalog in lib/constants/industries.ts) with:
--
--   * industries               text[]  — up to 3 catalog slugs (technology,
--                                         finance, ... same values as
--                                         INDUSTRY_VALUES). Enforced in the DB,
--                                         not just the app: <=3 items, no empty
--                                         strings/nulls, no duplicates.
--   * industry_custom           text   — free text the user types for
--                                         "Other" (null if not used). Capped
--                                         at 60 chars, blank-after-trim not
--                                         allowed.
--   * industry_custom_status    text   — 'pending' | 'approved' | 'rejected',
--                                         default 'pending'. Staff-only to
--                                         change (mirrors verification_status/
--                                         account_type/is_blocked from
--                                         20260701100100_profiles.sql).
--
-- IMPORTANT product rule (enforced by app code, not by this migration — no
-- catalog/search-filter screen exists yet per the Release-1 E1 task): a
-- user-submitted industry_custom value must NEVER be surfaced in catalog
-- search/filter results until industry_custom_status = 'approved'. This
-- migration only guarantees the status can't be forged/self-approved; the
-- future catalog/filter query is responsible for the `= 'approved'` check.
--
-- This project has no production users yet (pre-launch), so the old
-- `industry` column is dropped in this same migration rather than kept
-- alongside `industries` as a second source of truth. Verified via pg_depend/
-- pg_indexes/pg_constraint/pg_proc source scans on the hosted project
-- (documented in the handoff report) that nothing — no view, function, index,
-- or check constraint — depends on `profiles.industry`; only application code
-- reads it (tracked separately, not touched by this migration).
--
-- RLS: `profiles` already has RLS enabled with policies from
-- 20260701100100_profiles.sql (as amended by 20260715194801 /
-- 20260720184218) — `profiles_read` (own row, authenticated general read,
-- public-mindsetter anon read, or staff) and `profiles_update_own` /
-- `profiles_update_staff` (owner or staff, column-agnostic). Those policies
-- already cover the three new columns for both read and write, same as they
-- already cover `company`/`role`/`industry` today — no policy changes needed.
-- What protects `industry_custom_status` from self-approval is a new BEFORE
-- INSERT/UPDATE trigger (below), the same pattern
-- `guard_profiles_protected_columns` already uses for
-- verification_status/account_type/is_blocked: RLS says "you may update your
-- own row", the trigger says "but not this column, and not by silently
-- swapping the text under an already-approved status".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper: industries_valid(text[]) — used by the CHECK constraint below.
--    A CHECK expression itself cannot contain a subquery, but it CAN call an
--    immutable function whose body contains one (unnest() needs a FROM/set
--    context) — same "push the subquery into a helper function" approach as
--    is_staff()/is_public_mindsetter() push RLS logic out of policy bodies.
-- -----------------------------------------------------------------------------
create or replace function public.industries_valid(arr text[])
returns boolean
language sql
immutable
as $$
  select
    arr is not null
    and cardinality(arr) <= 3
    -- no null / empty / whitespace-only elements
    and not exists (
      select 1 from unnest(arr) v where v is null or btrim(v) = ''
    )
    -- no duplicates within the array
    and cardinality(arr) = (select count(distinct v) from unnest(arr) v);
$$;

comment on function public.industries_valid(text[]) is
  'CHECK-constraint helper for profiles.industries: array is non-null, has at most 3 elements, no null/blank elements, no duplicate elements. Called from profiles_industries_valid so the CHECK expression itself stays subquery-free.';

-- -----------------------------------------------------------------------------
-- 1. New columns
-- -----------------------------------------------------------------------------
alter table profiles
  add column industries text[] not null default '{}',
  add column industry_custom text,
  add column industry_custom_status text not null default 'pending';

-- -----------------------------------------------------------------------------
-- 2. Backfill: existing single `industry` -> one-element `industries` array.
--    Empty string / null `industry` backfills to '{}' (not array['']), so the
--    new industries_valid() check (added AFTER this backfill) is satisfied by
--    every existing row.
-- -----------------------------------------------------------------------------
update profiles
set industries = case
  when industry is not null and btrim(industry) <> '' then array[industry]
  else '{}'::text[]
end
where industry is distinct from null;

-- -----------------------------------------------------------------------------
-- 3. Constraints (DB-level, not just app-level Zod)
-- -----------------------------------------------------------------------------
alter table profiles
  add constraint profiles_industries_valid
    check (public.industries_valid(industries));

alter table profiles
  add constraint profiles_industry_custom_length
    check (
      industry_custom is null
      or (btrim(industry_custom) <> '' and char_length(industry_custom) <= 60)
    );

alter table profiles
  add constraint profiles_industry_custom_status_check
    check (industry_custom_status in ('pending', 'approved', 'rejected'));

comment on column profiles.industries is
  'Up to 3 industry catalog slugs (values from lib/constants/industries.ts INDUSTRY_VALUES), e.g. {technology,finance}. DB-enforced: <=3 items, no blanks, no duplicates (profiles_industries_valid).';
comment on column profiles.industry_custom is
  'Free-text "Other" industry the user typed, when the catalog does not fit. Null if unused. Max 60 chars, not blank-after-trim (profiles_industry_custom_length).';
comment on column profiles.industry_custom_status is
  'pending | approved | rejected — staff-only moderation status for industry_custom. Only an approved value may ever be surfaced in future catalog/search filters. Mutation is DB-guarded by the guard_profiles_industry_custom_status trigger, not just RLS.';

-- -----------------------------------------------------------------------------
-- 4. Drop the old single-value column (superseded by `industries`, see header)
-- -----------------------------------------------------------------------------
alter table profiles drop column industry;

-- -----------------------------------------------------------------------------
-- 5. Guard trigger — industry_custom_status is staff-only to change, and
--    editing industry_custom's *text* silently resets an already-decided
--    status back to 'pending' (an approved custom value must not be swapped
--    for different text while staying "approved").
--
--    Bypass rule mirrors guard_profiles_protected_columns from
--    20260701100100_profiles.sql exactly:
--      * is_staff(auth.uid()) — an admin/moderator acting through their own
--        authenticated session (e.g. a back-office Server Action using the
--        per-user server client) is trusted outright.
--      * auth.role() = 'service_role' — Postgres session role carried by the
--        JWT `role` claim on requests made with SUPABASE_SERVICE_ROLE_KEY
--        (lib/supabase/service.ts, used only by Edge Functions / trusted
--        Server Actions per CLAUDE.md). auth.role() reads that claim
--        directly, so it is unaffected by which columns the caller touches
--        and does not depend on staff_roles at all — this is how trusted
--        server-side jobs (e.g. a future moderation Edge Function) can flip
--        industry_custom_status without being staff-in-staff_roles
--        themselves.
--    Both branches return NEW unchanged (no coercion) — staff and the
--    service role are trusted to set any valid status/text combination.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profiles_industry_custom_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_staff(auth.uid()) or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Never trust client input for this on self-insert (profiles_insert_own
    -- lets a user insert their own row): coerce to the safe default rather
    -- than rejecting the insert outright, same style as
    -- guard_profiles_protected_columns' INSERT branch.
    new.industry_custom_status := 'pending';
    return new;
  end if;

  -- UPDATE
  if new.industry_custom_status is distinct from old.industry_custom_status then
    raise exception 'Only staff may change profiles.industry_custom_status';
  end if;

  if new.industry_custom is distinct from old.industry_custom then
    -- A non-staff caller changed the free-text value itself: whatever the
    -- status was, it no longer applies to the new text. Reset instead of
    -- rejecting, so the normal "edit my profile" flow keeps working.
    new.industry_custom_status := 'pending';
  end if;

  return new;
end;
$$;

comment on function public.guard_profiles_industry_custom_status() is
  'BEFORE INSERT/UPDATE guard on profiles: non-staff/non-service-role callers may never set industry_custom_status directly (forced to ''pending'' on INSERT, rejected on UPDATE), and editing industry_custom''s text resets industry_custom_status back to ''pending''. Staff (is_staff(auth.uid())) and the service role bypass entirely.';

create trigger guard_profiles_industry_custom_status
  before insert or update on profiles
  for each row execute function public.guard_profiles_industry_custom_status();
