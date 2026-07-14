-- =============================================================================
-- Fix-up: replace_profile_interests() authorization check was unreachable
-- =============================================================================
-- security-auditor's live verification of 20260707150500 found that the
-- explicit `auth.uid() = p_profile_id or is_staff(auth.uid())` check inside
-- `replace_profile_interests()` was dead code: it ran *after* the
-- `select ... for update` lock on `profiles`, but that lock is itself gated by
-- the table's UPDATE policies (`profiles_update_own` / `profiles_update_staff`)
-- since Postgres applies UPDATE policies to `SELECT ... FOR UPDATE`. So a
-- caller who isn't the owner/staff never finds a lockable row and hits the
-- earlier `if not found` branch (P0002 "Profile not found") before the
-- explicit authorization check is ever reached — the write was still
-- correctly blocked, but via the wrong error code/branch, contradicting the
-- function's own comments and making 42501 an unreachable dead path for any
-- client that branches on it.
--
-- Fix: do the explicit authorization check FIRST, against a plain (lock-free)
-- select — `profiles_read` has no owner/role restriction (avatar/profile data
-- is already effectively public), so a plain select finds the row regardless
-- of caller, letting the auth.uid()/is_staff() check run and correctly raise
-- 42501 for a real, existing, unauthorized target profile. THEN take the
-- row lock (for the concurrency fix from 20260707150500) once the caller is
-- known to be authorized.
-- =============================================================================

create or replace function public.replace_profile_interests(
  p_profile_id uuid,
  p_interest_ids uuid[]
)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Profile % not found', p_profile_id
      using errcode = 'P0002';
  end if;

  -- Authorization check now runs against a lock-free lookup above, so it is
  -- reachable: an existing-but-unauthorized target profile correctly raises
  -- 42501 here, instead of the lock below silently filtering it out first.
  if not (auth.uid() = p_profile_id or public.is_staff(auth.uid())) then
    raise exception 'Not authorized to modify interests for profile %', p_profile_id
      using errcode = '42501';
  end if;

  -- Lock the profile row now that the caller is known to be authorized. This
  -- serializes concurrent calls of this function for the same profile_id
  -- (the second caller's `for update` blocks until the first transaction
  -- commits/rolls back), closing the TOCTOU race on the max-10 trigger under
  -- concurrent submissions (unchanged reasoning from 20260707150500).
  perform 1 from public.profiles where id = p_profile_id for update;

  delete from public.profile_interests
  where profile_id = p_profile_id;

  if p_interest_ids is not null and array_length(p_interest_ids, 1) > 0 then
    insert into public.profile_interests (profile_id, interest_id)
    select distinct p_profile_id, iid
    from unnest(p_interest_ids) as iid;
  end if;
end;
$$;

comment on function public.replace_profile_interests(uuid, uuid[]) is
  'Atomically replaces a profile''s profile_interests selection (delete-all then insert-all in one function call/transaction). security invoker: runs under the caller''s own RLS (profile_interests_insert/_delete still apply), so this is not a privilege-escalation path. Checks auth.uid() = p_profile_id or is_staff() against a lock-free lookup FIRST (reachable 42501 for an unauthorized-but-existing profile), THEN locks the profiles row (select ... for update) to serialize concurrent calls for the same profile_id, closing the TOCTOU race on the max-10 trigger under concurrent submissions. Caller must be the profile owner or staff.';

-- Grants are unaffected by CREATE OR REPLACE (Postgres preserves existing
-- ACLs across a function replacement with the same signature), but restated
-- here for clarity/idempotency in case this migration is ever replayed against
-- a database that somehow lacks them.
revoke execute on function public.replace_profile_interests(uuid, uuid[])
  from public, anon;

grant execute on function public.replace_profile_interests(uuid, uuid[])
  to authenticated;
