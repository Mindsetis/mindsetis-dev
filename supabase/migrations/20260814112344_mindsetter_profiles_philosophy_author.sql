-- =============================================================================
-- Stage 1.9 fix-up — philosophy_author column + is_public UPDATE-guard bugfix
-- =============================================================================
-- 1. Product wants to store the AUTHOR of the `philosophy` quote alongside it
--    (a Mindsetter may quote someone else). New nullable column, no default —
--    an empty author is a normal state meaning the quote is the Mindsetter's
--    own words. Zod enforces max length client-side, same pattern as the
--    existing `philosophy` column (no DB-level length check either).
--
-- RLS note (re-verified against 20260701100100_profiles.sql / the same
-- reasoning already documented in 20260718185944_mindsetter_video_blog.sql and
-- 20260718172922_mindsetter_onboarding_review_fixes.sql for prior column
-- additions on this table, and confirmed live against the hosted project
-- (pg_policy) before writing this migration):
--   `mindsetter_profiles_insert_own` (with check auth.uid() = id) and
--   `mindsetter_profiles_update_own` (using/with check auth.uid() = id) are
--   plain row-level, column-agnostic clauses — no column list, no column-level
--   GRANTs restrict them either. They already cover this new column: the
--   owner can write it, everyone else is still governed by
--   `mindsetter_profiles_read` (is_public_mindsetter(id) OR owner OR staff).
--   No policy change needed.
--
-- 2. [Bug found while auditing the above] `guard_mindsetter_profiles_is_public`
--    (BEFORE INSERT OR UPDATE trigger, defined in 20260701100100_profiles.sql)
--    reads:
--
--        if new.is_public then
--          raise exception 'Only staff may set mindsetter_profiles.is_public = true';
--        end if;
--
--    with NO comparison to `old.is_public`. Confirmed via
--    `pg_get_functiondef('public.guard_mindsetter_profiles_is_public()'::regprocedure)`
--    against the hosted project — the deployed function body matches the
--    migration file exactly; no later migration touched it (grepped every
--    migration for the function/trigger name).
--
--    Effect: once staff sets `is_public = true` (publish after verification),
--    EVERY subsequent UPDATE by the owner — even one that never touches
--    `is_public`, e.g. editing `philosophy`/`philosophy_author`/any other
--    section — re-evaluates this BEFORE UPDATE trigger. `new.is_public` is
--    still `true` (carried over unchanged), so the trigger raises on every
--    single owner UPDATE post-publication. A verified/published Mindsetter
--    would be permanently locked out of editing their own profile row. INSERT
--    is unaffected (`old` doesn't exist there; a fresh row can't already be
--    published, and staff/service-role bypass regardless).
--
--    Fix: only raise when `is_public` is ACTUALLY being changed (INSERT: keep
--    exactly as-is — reject any non-staff attempt to insert with is_public =
--    true; UPDATE: reject only when `new.is_public is distinct from
--    old.is_public`, i.e. someone is actually trying to flip the flag).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. philosophy_author column
-- -----------------------------------------------------------------------------
alter table mindsetter_profiles
  add column if not exists philosophy_author text;

comment on column mindsetter_profiles.philosophy_author is
  'Optional name of the person quoted in `philosophy` (the Mindsetter''s motto/quote). Empty/null means the quote is the Mindsetter''s own words, not attributed to someone else.';

-- -----------------------------------------------------------------------------
-- 2. Fix guard_mindsetter_profiles_is_public: only block ACTUAL is_public
--    changes by non-staff, not every UPDATE of an already-published row.
-- -----------------------------------------------------------------------------
create or replace function public.guard_mindsetter_profiles_is_public()
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
    if new.is_public then
      raise exception 'Only staff may set mindsetter_profiles.is_public = true';
    end if;
    return new;
  end if;

  -- UPDATE: only guard actual changes to is_public. A non-staff owner editing
  -- any other column of an already-published (is_public = true) row must not
  -- be blocked — new.is_public carrying over unchanged is not an attempt to
  -- change it.
  if new.is_public is distinct from old.is_public then
    raise exception 'Only staff may set mindsetter_profiles.is_public = true';
  end if;

  return new;
end;
$$;

comment on function public.guard_mindsetter_profiles_is_public() is
  'BEFORE INSERT/UPDATE guard on mindsetter_profiles: blocks non-staff callers from publishing (is_public = true) on INSERT, and from CHANGING is_public on UPDATE (new.is_public is distinct from old.is_public) — editing any other column of an already-published row is unaffected. Staff and the service role bypass entirely.';
