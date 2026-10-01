-- =============================================================================
-- email_has_confirmed_account(text) — service-role-only "confirmed account?"
-- oracle, for submitAmbassadorApplication's guest-impersonation guard
-- =============================================================================
-- security-auditor finding on the ambassador application flow (see
-- 20260929171847_ambassador_applications.sql / 20260929173519_...): a guest
-- (no session) can submit the popup with ANY email, including one that
-- belongs to an already-registered, confirmed account — nothing stopped
-- someone from filing an application "as" a real member/mindsetter they
-- don't control. The Server Action `submitAmbassadorApplication` (server-only,
-- via lib/supabase/service.ts) is being changed to call this RPC first and,
-- when it returns true, refuse the guest submission ("log in to apply")
-- instead of inserting a guest-attributed row.
--
-- This does NOT introduce a new email-enumeration surface: the signup form
-- already answers "An account with this email already exists" for the same
-- question, and the Server Action layers per-email + per-IP rate limits on
-- top (see lib/validation/ambassador-application.ts / actions.ts). What this
-- function must NOT do is become a SECOND, cheaper oracle that anon/
-- authenticated clients can hit directly over PostgREST RPC — so EXECUTE is
-- revoked from public/anon/authenticated below and kept only for
-- service_role, matching the lockdown pattern in
-- 20260701100600_lockdown_expire_unverified_fn.sql.
--
-- security definer + `set search_path = ''` (not just `= public`) because the
-- function body reads `auth.users`, a schema outside `public` — every
-- identifier is therefore fully qualified (public.*, auth.*) so an empty
-- search_path can never cause an "undefined table" error, and a
-- caller-controlled search_path can never hijack name resolution. `stable`:
-- read-only, safe for the planner to cache/inline within one statement.
-- =============================================================================

create or replace function public.email_has_confirmed_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.email_confirmed_at is not null
  );
$$;

comment on function public.email_has_confirmed_account(text) is
  'Returns true iff auth.users has a row with lower(email) = lower(trim(p_email)) AND email_confirmed_at is not null. security definer + empty search_path (fully-qualified auth.users/public.* names) so it can read auth.users regardless of caller RLS. SERVICE-ROLE-ONLY: EXECUTE is revoked from public/anon/authenticated below and granted only to service_role — this is an account-existence oracle and must never be reachable by anon/authenticated PostgREST RPC. Consumed by submitAmbassadorApplication (lib/supabase/service.ts) to refuse a guest ambassador application submitted under an email that already has a confirmed account ("log in to apply") — mirrors the existing signup-form "account already exists" disclosure, so this does not open a new enumeration surface, and is additionally covered by the action''s per-email/per-IP rate limits.';

-- Same lesson as 20260701100600_lockdown_expire_unverified_fn.sql: a bare
-- `revoke ... from public` is NOT sufficient on a Supabase project, because
-- the project-level `alter default privileges` template already granted
-- EXECUTE directly to anon/authenticated at CREATE FUNCTION time — those are
-- separate ACL entries and must be revoked from each role by name. service_role
-- is intentionally left alone: that is exactly how
-- submitAmbassadorApplication's service-role client is meant to call this
-- (`.rpc('email_has_confirmed_account', { p_email })`).
revoke execute on function public.email_has_confirmed_account(text)
  from public, anon, authenticated;

grant execute on function public.email_has_confirmed_account(text)
  to service_role;
