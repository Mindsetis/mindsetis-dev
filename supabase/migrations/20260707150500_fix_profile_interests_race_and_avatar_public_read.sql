-- =============================================================================
-- Fix-up migration: three review findings on 20260707141211_profile_step2_interests.sql
-- and 20260701090100_storage_buckets.sql / 20260701100100_profiles.sql
-- =============================================================================
-- `20260707141211_profile_step2_interests.sql` has already been applied to the
-- hosted project, so per project convention it is never edited in place — all
-- three fixes below land as a new migration instead.
--
-- Finding 1 (code-reviewer + security-auditor, converged) — non-atomic
-- client-side delete-then-insert for `profile_interests`, plus a TOCTOU race
-- on the 10-interest cap under concurrent submissions for the same profile:
-- `enforce_profile_interests_limit()` is an AFTER INSERT FOR EACH STATEMENT
-- trigger doing a plain `count(*)`, which under READ COMMITTED cannot see
-- another still-uncommitted concurrent transaction's inserts for the same
-- profile_id — two concurrent "save my interests" submissions could each
-- independently observe <=10 and jointly leave the profile with >10 rows.
-- Fix: `public.replace_profile_interests(uuid, uuid[])` below takes
-- `select ... for update` on the profile row first, serializing concurrent
-- calls for the same profile (the second caller blocks until the first
-- transaction commits/rolls back), then does the whole
-- delete-existing-then-insert-new as one function call = one statement = one
-- transaction from the client's perspective, so a failure partway through
-- rolls back the entire replace instead of silently leaving the caller with
-- zero interests (the old two-round-trip `.delete()` then `.insert()` shape).
-- The existing `enforce_profile_interests_limit()` trigger is left completely
-- unchanged — it still fires, and now benefits from the row lock above for
-- correctness under concurrency.
--
-- Finding 2 (security-auditor) — a ~10-year signed URL stored in
-- `profiles.avatar_url` is a non-revocable bearer token, which is worse than
-- just making the (already effectively public, since `profiles_read` has no
-- role/owner restriction) avatar photo genuinely public. Fix: flip the
-- `avatars` bucket to `public = true` (so `getPublicUrl()` — a stable,
-- non-expiring, revocable-by-object-deletion URL — works) and add an
-- explicit public-SELECT RLS policy on `storage.objects` scoped to that
-- bucket, so the end state is policy-backed, not just a bucket-flag toggle.
-- Existing owner-only write policies (`avatars_insert_own_folder` /
-- `avatars_update_own` / `avatars_delete_own` from
-- 20260701090100_storage_buckets.sql) are untouched: only SELECT changes.
--
-- Finding 3 (Low, security-auditor) — four policies from the interests
-- migration have no explicit `to authenticated` role clause (relying on
-- `auth.uid()` being null for anon, confirmed currently safe but a
-- defense-in-depth gap). Tightened in place via `alter policy ... to
-- authenticated` rather than drop/recreate.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. replace_profile_interests(uuid, uuid[]) — atomic, race-safe replace-all
-- -----------------------------------------------------------------------------
-- `security invoker` (the plpgsql default — spelled out explicitly here so
-- this is not accidentally "fixed" to `security definer` later): the
-- delete/insert below run under the CALLING role's own privileges, so the
-- existing `profile_interests_insert` / `profile_interests_delete` RLS
-- policies still apply to the actual writes. This function is therefore not
-- a privilege-escalation path — it fails closed on its own (the explicit
-- auth.uid() check below) *and* is still bound by RLS underneath, belt and
-- suspenders rather than either alone.
create or replace function public.replace_profile_interests(
  p_profile_id uuid,
  p_interest_ids uuid[]
)
returns void
language plpgsql
security invoker
as $$
begin
  -- Lock the profile row first. This is the actual fix for the concurrency
  -- race: it serializes any concurrent calls of this function for the same
  -- profile_id (the second caller's `for update` blocks until the first
  -- transaction commits or rolls back), so the AFTER-statement count(*) in
  -- enforce_profile_interests_limit() below can no longer be fooled by a
  -- sibling transaction's not-yet-committed inserts for the same profile.
  perform 1 from public.profiles where id = p_profile_id for update;

  if not found then
    raise exception 'Profile % not found', p_profile_id
      using errcode = 'P0002';
  end if;

  -- Defense-in-depth authorization check. RLS on profile_interests (below)
  -- would independently reject an unauthorized caller's delete/insert since
  -- this function is security invoker, not definer — but fail closed here
  -- too, with a clearer error, rather than relying solely on RLS silently
  -- affecting 0 rows.
  if not (auth.uid() = p_profile_id or public.is_staff(auth.uid())) then
    raise exception 'Not authorized to modify interests for profile %', p_profile_id
      using errcode = '42501';
  end if;

  -- Replace-all: delete then insert within this single function call, i.e. a
  -- single statement/transaction from the client's perspective — unlike the
  -- old two-round-trip client code, a failure partway through rolls back the
  -- whole thing instead of leaving the caller's interests cleared with
  -- nothing re-inserted. `distinct` guards against a caller passing duplicate
  -- ids in p_interest_ids (which would otherwise violate the
  -- profile_interests primary key on the insert below).
  delete from public.profile_interests
  where profile_id = p_profile_id;

  if p_interest_ids is not null and array_length(p_interest_ids, 1) > 0 then
    insert into public.profile_interests (profile_id, interest_id)
    select distinct p_profile_id, iid
    from unnest(p_interest_ids) as iid;
  end if;

  -- enforce_profile_interests_limit() (unchanged, from
  -- 20260707141211_profile_step2_interests.sql) still fires on the insert
  -- above and still raises if this would leave >10 rows for the profile; the
  -- row lock taken above just makes that check race-safe under concurrency.
end;
$$;

comment on function public.replace_profile_interests(uuid, uuid[]) is
  'Atomically replaces a profile''s profile_interests selection (delete-all then insert-all in one function call/transaction). security invoker: runs under the caller''s own RLS (profile_interests_insert/_delete still apply), so this is not a privilege-escalation path. Locks the profiles row first (select ... for update) to serialize concurrent calls for the same profile_id, closing the TOCTOU race on the max-10 trigger under concurrent submissions. Caller must be the profile owner or staff.';

-- Every Supabase project has a project-level `alter default privileges ...
-- grant execute on functions to anon, authenticated, service_role` template
-- that materializes DIRECT execute grants on any newly created function —
-- `revoke ... from public` alone does NOT remove those (see the documented
-- lesson in 20260701100600_lockdown_expire_unverified_fn.sql). Revoke from
-- `public` and `anon` by name, then grant to `authenticated` explicitly.
revoke execute on function public.replace_profile_interests(uuid, uuid[])
  from public, anon;

grant execute on function public.replace_profile_interests(uuid, uuid[])
  to authenticated;

-- -----------------------------------------------------------------------------
-- 2. avatars bucket — genuinely public read instead of a ~10-year signed URL
-- -----------------------------------------------------------------------------
-- `profiles_read` (20260701100100_profiles.sql) has no role/owner
-- restriction beyond is_blocked, so avatar photos are already effectively
-- readable by any visitor browsing a non-blocked profile. Flip the bucket to
-- public so the app can use `getPublicUrl()` (a stable, non-expiring URL that
-- is revoked simply by deleting/replacing the object) instead of minting a
-- ~10-year signed URL (a non-revocable bearer token). Write access is
-- unaffected: `avatars_insert_own_folder` / `avatars_update_own` /
-- `avatars_delete_own` (20260701090100_storage_buckets.sql) still restrict
-- writes to the caller's own `{auth.uid()}/...` folder.
update storage.buckets set public = true where id = 'avatars';

-- Belt-and-suspenders alongside the bucket flag: an explicit public-SELECT
-- RLS policy on storage.objects scoped to this bucket, matching this
-- project's existing per-bucket policy-naming style
-- (avatars_insert_own_folder / avatars_update_own / avatars_delete_own).
-- No `to` clause -> applies to every role (anon included), which is the
-- intent: avatar photos are public-facing.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- -----------------------------------------------------------------------------
-- 3. Tighten role clauses on the four interests-related policies (Low)
-- -----------------------------------------------------------------------------
-- These policies from 20260707141211_profile_step2_interests.sql had no
-- explicit `to authenticated`, relying on auth.uid() being null for anon
-- (confirmed currently safe, but a defense-in-depth gap per security-auditor).
-- `alter policy ... to authenticated` tightens the applicable-role list in
-- place without dropping/recreating the policy or touching its
-- using/with check expressions.
alter policy "interests_write_staff" on interests to authenticated;
alter policy "profile_interests_read" on profile_interests to authenticated;
alter policy "profile_interests_insert" on profile_interests to authenticated;
alter policy "profile_interests_delete" on profile_interests to authenticated;
