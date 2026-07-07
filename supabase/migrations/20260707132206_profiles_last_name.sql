-- =============================================================================
-- Add profiles.last_name (Second name field on sign-up)
-- =============================================================================
-- The sign-up form is gaining a required "Second name" text field alongside the
-- existing "First name". `profiles.full_name` (see 20260701100100_profiles.sql)
-- stays as-is; this migration adds a sibling `last_name` column and teaches
-- handle_new_user() (see 20260701100400_handle_new_user.sql) to populate it
-- from auth signup metadata the same way full_name is handled.
--
-- Nullable at the DB level on purpose: "required" is an app-level (Zod /
-- Server Action) rule enforced on the sign-up form, not a DB constraint —
-- a NOT NULL here would break the insert path for any already-registered
-- user reference and for signups that don't (yet) supply the field. RLS is
-- already enabled on profiles (20260701100100_profiles.sql) and covers this
-- column via the existing table-level policies; no new policy is needed for
-- a plain column addition.
-- =============================================================================

alter table profiles
  add column if not exists last_name text;

-- -----------------------------------------------------------------------------
-- handle_new_user() — also read raw_user_meta_data->>'last_name'
-- -----------------------------------------------------------------------------
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
    last_name,
    content_locale,
    verification_deadline
  )
  values (
    new.id,
    candidate,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'content_locale', 'en'),
    now() + interval '14 days'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT trigger on auth.users: auto-provisions a public.profiles row with a guaranteed-unique username, 14-day verification_deadline, full_name/last_name from signup metadata, and column defaults (member/unverified/not-blocked) from profiles itself. security definer so it can insert regardless of the caller''s RLS context; on conflict (id) do nothing keeps it idempotent.';
