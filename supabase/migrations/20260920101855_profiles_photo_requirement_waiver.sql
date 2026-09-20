-- =============================================================================
-- Release 1 / F4 — profiles: admin waiver for the "photo required" rule
-- =============================================================================
-- Product rule (spec F4): a profile without a photo can still be created and
-- its public [username] page still works, but by default such a profile is
-- excluded from the catalog/search and cannot send invites or book sessions.
-- Staff need an escape hatch for public figures who don't want to upload a
-- photo: an explicit per-profile waiver that lifts those restrictions even
-- though avatar_url is still null.
--
--   * photo_requirement_waived  boolean  — true = staff has waived the photo
--                                           requirement for this profile;
--                                           catalog/search + invite/booking
--                                           checks must treat this profile as
--                                           if it had a photo. Default false.
--
-- No catalog or invite/booking gating exists in the app yet (this migration
-- is data-model-only, per the F4 task scope). Future call sites that need to
-- update (listed in the handoff report, not touched here):
--   * catalog/search query — include profiles where
--     avatar_url is not null OR photo_requirement_waived = true.
--   * invite-sending / session-booking eligibility checks — same OR.
--   * account/admin UI — a staff-only toggle + a "waived" reminder badge in
--     the owner's own dashboard.
--
-- RLS: `profiles` already has RLS enabled with policies from
-- 20260701100100_profiles.sql (as amended by 20260715194801 /
-- 20260720184218 / 20260920093000) — `profiles_read` (own row, authenticated
-- general read, public-mindsetter anon read, or staff) and
-- `profiles_update_own` / `profiles_update_staff` (owner or staff,
-- column-agnostic). Those policies already cover the new column for both
-- read and write — no policy changes needed. What protects
-- `photo_requirement_waived` from self-service escalation is a new BEFORE
-- INSERT/UPDATE trigger (below), the same pattern
-- `guard_profiles_protected_columns` (20260701100100_profiles.sql) and
-- `guard_profiles_industry_custom_status` (20260920093000_profiles_multi_industry.sql)
-- already use: RLS says "you may update your own row", the trigger says
-- "but not this column".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. New column
-- -----------------------------------------------------------------------------
alter table profiles
  add column photo_requirement_waived boolean not null default false;

comment on column profiles.photo_requirement_waived is
  'Staff-only waiver of the "photo required for catalog/search/invites/booking" rule (spec F4), for profiles that intentionally have no avatar_url. Mutation is DB-guarded by the guard_profiles_photo_requirement_waived trigger, not just RLS. Default false: normal photo-required behavior.';

-- -----------------------------------------------------------------------------
-- 2. Guard trigger — staff/service-role only. Mirrors
--    guard_profiles_protected_columns / guard_profiles_industry_custom_status
--    exactly: on INSERT a non-staff self-insert is silently coerced to the
--    safe default (false) rather than rejected outright (profiles_insert_own
--    lets a user insert their own row); on UPDATE any change to this column
--    by a non-staff, non-service-role caller is rejected, regardless of
--    which other columns are being updated in the same statement (no
--    "piggybacking" the flag onto an unrelated profile edit).
-- -----------------------------------------------------------------------------
create or replace function public.guard_profiles_photo_requirement_waived()
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
    -- Never trust client input for this on self-insert: coerce to the safe
    -- default rather than rejecting the insert outright.
    new.photo_requirement_waived := false;
    return new;
  end if;

  -- UPDATE
  if new.photo_requirement_waived is distinct from old.photo_requirement_waived then
    raise exception 'Only staff may change profiles.photo_requirement_waived';
  end if;

  return new;
end;
$$;

comment on function public.guard_profiles_photo_requirement_waived() is
  'BEFORE INSERT/UPDATE guard on profiles: non-staff/non-service-role callers may never set photo_requirement_waived (forced to false on INSERT, rejected on UPDATE regardless of which other columns change in the same statement). Staff (is_staff(auth.uid())) and the service role bypass entirely.';

create trigger guard_profiles_photo_requirement_waived
  before insert or update on profiles
  for each row execute function public.guard_profiles_photo_requirement_waived();
