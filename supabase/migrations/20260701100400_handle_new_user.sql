-- =============================================================================
-- Stage 0.6 — Auto-provision profiles on signup (auth.users -> public.profiles)
-- =============================================================================
-- Every auth.users row (email+password or, later, OAuth) must have exactly one
-- corresponding public.profiles row so the rest of the schema (which treats
-- profiles as the 1:1 identity anchor) has something to reference immediately
-- after signup, before any onboarding form is submitted.
--
-- This migration adds a AFTER INSERT trigger on auth.users that inserts a
-- minimal profiles row:
--
--   * username           — taken from raw_user_meta_data->>'username' if the
--                           signup call supplied one, otherwise derived from
--                           the email local-part. Uniqueness is NEVER assumed:
--                           the function probes public.profiles for a
--                           collision and appends a short random numeric
--                           suffix, retrying a bounded number of times, before
--                           falling back to a uuid-derived name that is
--                           globally unique by construction. A username
--                           collision must never fail the signup.
--   * full_name          — copied from raw_user_meta_data->>'full_name' if
--                           present; nullable, filled in later via onboarding.
--   * content_locale      — coalesced to 'en' (i18n default, spec/CLAUDE.md).
--   * verification_deadline — now() + interval '14 days'. This is the 14-day
--                           verification rule (spec §3.2 / CLAUDE.md): a
--                           permission flag checked later by pg_cron + server
--                           logic, never a data-deletion mechanism. It must be
--                           stamped at the moment the account is created, so
--                           it is set here rather than left to onboarding.
--   * account_type / verification_status / is_blocked are intentionally left
--     unset so the profiles table's own defaults apply
--     ('member' / 'unverified' / false). This function is security definer,
--     which satisfies the service_role bypass branch of
--     guard_profiles_protected_columns() (see 20260701100100_profiles.sql),
--     so the guard trigger is a no-op here — defaults come from the column
--     definitions, not from the guard's INSERT-coercion branch.
--
-- `on conflict (id) do nothing` makes the insert idempotent: if a profiles row
-- already exists for this id (e.g. a retried webhook, a manual backfill, or a
-- future re-run of signup-adjacent logic), the trigger silently no-ops instead
-- of raising a duplicate-key error that would abort the auth.users insert.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate     text;
  attempt       int := 0;
  max_attempts  constant int := 5;
begin
  -- 1. Derive a base username: explicit signup metadata wins, otherwise the
  --    email local-part, lowercased and stripped of anything non [a-z0-9_].
  base_username := lower(coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  ));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');

  -- Guaranteed-non-empty fallback if metadata/email yielded nothing usable.
  if base_username is null or base_username = '' then
    base_username := 'user_' || replace(new.id::text, '-', '');
  end if;

  candidate := base_username;

  -- 2. Probe for a collision and retry with a short random numeric suffix.
  --    Bounded loop: never blocks signup indefinitely on bad luck.
  while exists (select 1 from public.profiles p where p.username = candidate)
        and attempt < max_attempts loop
    attempt := attempt + 1;
    candidate := base_username || '_' || floor(random() * 1000000)::bigint::text;
  end loop;

  -- 3. Final safety net: if every probabilistic attempt still collided
  --    (astronomically unlikely), fall back to a uuid-derived username,
  --    which is unique by construction since new.id is a primary key.
  if exists (select 1 from public.profiles p where p.username = candidate) then
    candidate := 'user_' || replace(new.id::text, '-', '');
  end if;

  insert into public.profiles (
    id,
    username,
    full_name,
    content_locale,
    verification_deadline
  )
  values (
    new.id,
    candidate,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'content_locale', 'en'),
    now() + interval '14 days'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT trigger on auth.users: auto-provisions a public.profiles row with a guaranteed-unique username, 14-day verification_deadline, and column defaults (member/unverified/not-blocked) from profiles itself. security definer so it can insert regardless of the caller''s RLS context; on conflict (id) do nothing keeps it idempotent.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
