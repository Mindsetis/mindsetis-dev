-- =============================================================================
-- Stage 1.10 fix-up — anonymous read access for PUBLISHED Mindsetter profiles
-- =============================================================================
-- Stage 1.10 ("Public Mindsetter Profile page", `/mindsetters/[username]`) must be
-- viewable by ANONYMOUS/unauthenticated visitors once a Mindsetter is verified and
-- published (spec §5.4: "публікується після верифікації, is_public=true"). QA
-- confirmed live against the hosted DB that the page 404s for every anonymous
-- visitor, even for a fully verified / is_public=true / non-blocked Mindsetter.
-- Root cause is an RLS cascade across three policies:
--
--   1. `profiles_read` (tightened by 20260715194801 for stage 1.6, "profile
--      viewing is registered-members-only") has NO public/anon branch at all —
--      for an anonymous request `auth.uid()` is null, so the general branch
--      `(is_blocked = false and auth.uid() is not null)` never matches, and
--      NO `profiles` row is ever returned to anon regardless of account_type /
--      verification_status / mindsetter_profiles.is_public. The public
--      Mindsetter page's server-side loader reads `profiles` via the anon/cookie
--      client -> gets null -> 404s.
--
--   2. `session_settings_read_public` (from 20260701100200_sessions.sql, tightened
--      by 20260718172922 for stage 1.9) uses
--        exists (select 1 from profiles p where p.id = mindsetter_id and ...)
--      — that subquery is a normal query against `profiles` and is therefore
--      ALSO filtered by `profiles`' own RLS (`profiles_read`), so it inherits
--      exactly the same "nothing for anon" bug transitively. It also only
--      checked `is_blocked`, not `mindsetter_profiles.is_public` — a Medium
--      security finding: it leaked session pricing/config for unpublished /
--      unverified mindsetters to anonymous REST callers.
--
--   3. `mindsetter_profiles_read` (from 20260701100100_profiles.sql) is
--      `using (is_public = true or auth.uid() = id or is_staff(auth.uid()))` —
--      it does not check `profiles.is_blocked`, so a blocked mindsetter with a
--      stale `is_public = true` row would remain anon-readable (Low finding).
--
-- Fix: a single new `security definer` helper, `is_public_mindsetter(uuid)`,
-- following the exact precedent of `is_staff(uuid)` from 20260701100000_helpers.sql
-- (same schema, `stable`, `security definer`, pinned `search_path`, no explicit
-- grant — relies on this hosted project's default "grant execute on functions to
-- anon, authenticated, service_role" template, same as `is_staff`). Because it is
-- `security definer`, it reads `profiles` + `mindsetter_profiles` with the
-- function owner's rights, bypassing RLS entirely — so it can be safely
-- referenced FROM the RLS policies of both tables (and from `session_settings`)
-- without any of the recursion / "policy depends on another table's RLS which
-- depends on the first table's RLS" trap that caused this bug in the first place.
--
-- It encodes the full "is this a publicly-visible Mindsetter profile" rule from
-- spec §5.4: account_type = 'mindsetter' AND verification_status = 'verified' AND
-- profiles.is_blocked = false AND mindsetter_profiles.is_public = true.
--
-- All three policies are dropped and recreated adding an
-- `or is_public_mindsetter(id)` (or equivalent) branch, WITHOUT removing any
-- existing branch — regular Member profile reads (`/members/[username]`) stay
-- exactly as auth-gated as 20260715194801 left them: a non-mindsetter, or a
-- mindsetter that is unverified/unpublished/blocked, is still NOT anon-readable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper: is_public_mindsetter(uuid) — true iff `profile_id` is a verified,
--    published, non-blocked Mindsetter (i.e. legitimately publicly visible).
-- -----------------------------------------------------------------------------
create or replace function public.is_public_mindsetter(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.mindsetter_profiles mp on mp.id = p.id
    where p.id = profile_id
      and p.account_type = 'mindsetter'
      and p.verification_status = 'verified'
      and p.is_blocked = false
      and mp.is_public = true
  );
$$;

comment on function public.is_public_mindsetter(uuid) is
  'Returns true iff profile_id is a verified, published (mindsetter_profiles.is_public = true), non-blocked Mindsetter — the "publicly visible" rule from spec §5.4. security definer + pinned search_path so it can be referenced from profiles_read / mindsetter_profiles_read / session_settings_read_public without those policies recursing into each other''s RLS (same precedent as is_staff(uuid)).';

-- -----------------------------------------------------------------------------
-- 1. profiles_read — add the public-Mindsetter branch, keep every existing one
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_read" on profiles;

create policy "profiles_read" on profiles
  for select
  using (
    (is_blocked = false and auth.uid() is not null)
    or auth.uid() = id
    or is_staff(auth.uid())
    or is_public_mindsetter(id)
  );

comment on policy "profiles_read" on profiles is
  'General (registered-member) branch requires auth per stage 1.6; owner and staff branches unchanged; new is_public_mindsetter(id) branch additionally allows ANONYMOUS reads of verified/published/non-blocked Mindsetter rows only (stage 1.10, spec §5.4 public Mindsetter page). Regular Member profiles remain auth-gated.';

-- -----------------------------------------------------------------------------
-- 2. mindsetter_profiles_read — require is_blocked = false (and verified) on
--    the public branch, via the non-recursive helper. Owner/staff unchanged.
-- -----------------------------------------------------------------------------
drop policy if exists "mindsetter_profiles_read" on mindsetter_profiles;

create policy "mindsetter_profiles_read" on mindsetter_profiles
  for select
  using (
    is_public_mindsetter(id)
    or auth.uid() = id
    or is_staff(auth.uid())
  );

comment on policy "mindsetter_profiles_read" on mindsetter_profiles is
  'Public branch now routes through is_public_mindsetter(id) (verified + published + not blocked), closing the gap where a blocked mindsetter with a stale is_public=true row stayed anon-readable. Owner (auth.uid() = id) and staff branches unchanged.';

-- -----------------------------------------------------------------------------
-- 3. session_settings_read_public — non-recursive, also require publication
-- -----------------------------------------------------------------------------
drop policy if exists "session_settings_read_public" on session_settings;

create policy "session_settings_read_public" on session_settings
  for select
  using (
    is_public_mindsetter(mindsetter_id)
    or auth.uid() = mindsetter_id
    or is_staff(auth.uid())
  );

comment on policy "session_settings_read_public" on session_settings is
  'Public branch now uses is_public_mindsetter(mindsetter_id) instead of an inline exists(select ... from profiles ...) subquery — that subquery was itself subject to profiles'' own RLS, so it silently returned nothing for anon after 20260715194801 tightened profiles_read (the same root cause bug as profiles_read/mindsetter_profiles_read). It also now additionally requires the mindsetter to be PUBLISHED (mindsetter_profiles.is_public = true), not just verified+not-blocked, closing a Medium finding where draft/unpublished session config was exposed. Owner (auth.uid() = mindsetter_id) and staff branches unchanged.';
