-- =============================================================================
-- session_settings — multi-duration + per-day weekly schedule (Sessions Setup redesign)
-- =============================================================================
-- The new "Sessions Setup" screen design needs two shapes the original schema
-- (spec §3.3 / 20260701100200_sessions.sql, extended by
-- 20260718160224_mindsetter_onboarding_schema_alignment.sql) can't represent:
--
--   A. Multiple durations enabled at once (30/45/60/90 min toggles), the
--      booker then picks one of the enabled ones — was a single
--      `duration_min int`.
--   B. Per-day weekly availability with multiple time ranges per day (e.g.
--      Wed 09:00-12:30 and 14:00-18:00, Sat/Sun off) — was one
--      `available_days text[]` + one `available_from`/`available_to` pair
--      shared across the whole week.
--
-- Pre-migration check (2026-08-13, hosted project lslkbqoedrpnuwtqlvio, via
-- `supabase db query --linked`): `session_settings` has exactly 1 row
-- (mindsetter_id 69afd911-ed05-43ff-9b96-b02343da62e0), so the backfills below
-- are low-risk. Also verified: no views, no `pg_proc` function bodies, no
-- pg_cron jobs, and none of the three `session_settings` RLS policies
-- (`session_settings_read_public` / `_insert_own` / `_update_own`) reference
-- `duration_min`, `available_days`, `available_from`, or `available_to` — all
-- three only touch `mindsetter_id`. RLS is therefore left exactly as-is.
--
-- `availability_slots` (concrete dated slots, unused so far) is a separate
-- entity and is NOT touched here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. durations int[] — replaces the single duration_min
-- -----------------------------------------------------------------------------
alter table session_settings
  add column durations int[];

-- Backfill: wrap the existing single value; rows that somehow never had one
-- fall back to the same {30} the old `duration_min default 30` implied.
update session_settings
set durations = case
  when duration_min is not null then array[duration_min]
  else array[30]
end;

alter table session_settings
  alter column durations set default '{30}',
  alter column durations set not null;

alter table session_settings
  add constraint session_settings_durations_check
  check (
    array_length(durations, 1) > 0
    and durations <@ array[30, 45, 60, 90]
  );

comment on column session_settings.durations is
  'Set of session-length pills the Mindsetter has enabled (subset of {30,45,60,90} minutes, at least one). The booker picks one of these per booking. Replaces the old single `duration_min` column.';

alter table session_settings
  drop column duration_min;

-- -----------------------------------------------------------------------------
-- B. weekly_availability jsonb — replaces available_days/available_from/available_to
-- -----------------------------------------------------------------------------
-- Structural validator only (object, weekday-slug keys, array-shaped values).
-- Deliberately does NOT validate the "HH:mm" time-string format or range
-- overlap inside each {from,to} entry — that lives in the app-level Zod
-- schema (`sessionStepSchema` / `WEEKDAYS` in lib/validation/mindsetter.ts),
-- which is far cheaper to evolve than a CHECK constraint.
create or replace function public.is_valid_weekly_availability(data jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  day    text;
  ranges jsonb;
begin
  if data is null or jsonb_typeof(data) <> 'object' then
    return false;
  end if;

  for day, ranges in select * from jsonb_each(data) loop
    if day <> all (array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) then
      return false;
    end if;
    if jsonb_typeof(ranges) <> 'array' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

comment on function public.is_valid_weekly_availability(jsonb) is
  'Structural check for session_settings.weekly_availability: must be a JSON object whose keys are weekday slugs (mon,tue,wed,thu,fri,sat,sun — same slugs as WEEKDAYS in lib/validation/mindsetter.ts) and whose values are JSON arrays. Does not validate the shape/format of the array elements ({from,to} HH:mm strings) — that is left to the app-level Zod schema.';

alter table session_settings
  add column weekly_availability jsonb not null default '{}'::jsonb;

alter table session_settings
  add constraint session_settings_weekly_availability_check
  check (is_valid_weekly_availability(weekly_availability));

-- Backfill: one range per previously-enabled day, taken from the old
-- shared available_from/available_to pair. Days with no from/to on record
-- are skipped (left out of the object, i.e. unavailable) rather than
-- guessed at.
update session_settings
set weekly_availability = coalesce(
  (
    select jsonb_object_agg(
      day,
      jsonb_build_array(
        jsonb_build_object(
          'from', to_char(available_from, 'HH24:MI'),
          'to', to_char(available_to, 'HH24:MI')
        )
      )
    )
    from unnest(available_days) as day
  ),
  '{}'::jsonb
)
where available_days is not null
  and array_length(available_days, 1) > 0
  and available_from is not null
  and available_to is not null;

comment on column session_settings.weekly_availability is
  'Recurring weekly schedule. JSON object keyed by weekday slug (mon,tue,wed,thu,fri,sat,sun — same slugs as WEEKDAYS in lib/validation/mindsetter.ts); each value is an array of {"from":"HH:MM","to":"HH:MM"} local-time ranges (local to `timezone`), e.g. {"wed":[{"from":"09:00","to":"12:30"},{"from":"14:00","to":"18:00"}]}. A day that is absent or maps to an empty array is unavailable that day. Replaces the old available_days/available_from/available_to (one range per day max, shared across the week). Distinct from availability_slots, which holds concrete booked/bookable timestamp slots.';

alter table session_settings
  drop column available_days,
  drop column available_from,
  drop column available_to;
