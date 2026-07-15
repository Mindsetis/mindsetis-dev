-- =============================================================================
-- Fix-up: profiles_read must require authentication on the general-read branch
-- =============================================================================
-- Stage 1.6 ("Member Profile" view — `/dashboard/profile` self view and
-- `/profile/[username]` other-member view) is a deliberate product decision
-- that profile data is visible to REGISTERED/authenticated members only, not
-- to anonymous visitors. That restriction was implemented at the Next.js
-- layer only: `middleware.ts` `PROTECTED_PREFIXES` now includes `/profile`,
-- plus a redundant `getSessionContext()` check inside the page itself.
--
-- security-auditor's re-check of that stage found the app-layer gating
-- insufficient on its own: the underlying `profiles_read` policy from
-- 20260701100100_profiles.sql,
--
--   using (is_blocked = false or auth.uid() = id or is_staff(auth.uid()));
--
-- has no `auth.uid() is not null` check on the general (non-owner, non-staff)
-- branch. Since the anon key is public by design (shipped in the client
-- bundle as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), anyone can call the
-- Supabase REST API directly —
--   GET /rest/v1/profiles?select=*&username=eq.<target>&is_blocked=eq.false
-- — and read any non-blocked member's full profile with zero session,
-- completely bypassing `middleware.ts` and the page-level check (neither is
-- anywhere near that request's path).
--
-- This was a known, PRIOR, deliberate state: 20260707150500 (Finding 2)
-- explicitly documents "profiles_read has no role/owner restriction beyond
-- is_blocked, so it's already effectively readable by any visitor" as
-- accepted — but that was true *before* stage 1.6's product requirement to
-- restrict profile viewing to registered members, and was never revisited
-- once that requirement landed.
--
-- The app codebase was audited for legitimate anonymous consumers of
-- `profiles` reads (every `.from('profiles')` call site: `profile/[username]`,
-- `dashboard/profile`, `member-profile` + its actions, `build-profile` + its
-- actions, `lib/auth/guards.ts`): every one already requires a signed-in
-- session via `getSessionContext()`/`requireUser()`, or uses the service-role
-- client (which bypasses RLS regardless, e.g. the password-reset
-- `access_restricted` update in `(auth)/actions.ts`). There is no
-- pre-signup username-availability check or any other legitimate anonymous
-- read of `profiles` in the current app, so tightening here is safe.
--
-- Fix: require `auth.uid() is not null` on the general branch. Owner and
-- staff access are untouched (a caller can always read their own row, and
-- staff can always read any row, signed in or not — is_staff() itself
-- returns false for a null auth.uid() anyway, so staff access already implies
-- authentication).
--
-- `20260701100100_profiles.sql` has already been applied to the hosted
-- project, so per project convention it is never edited in place — this
-- lands as a new migration (drop + recreate, matching this project's
-- policy-replacement house style, e.g. 20260707150500 / 20260707152000).
-- =============================================================================

drop policy if exists "profiles_read" on profiles;

create policy "profiles_read" on profiles
  for select
  using (
    (is_blocked = false and auth.uid() is not null)
    or auth.uid() = id
    or is_staff(auth.uid())
  );

comment on policy "profiles_read" on profiles is
  'General-read branch requires an authenticated caller (stage 1.6: profile viewing is registered-members-only, not anonymous-public — see migration header for the security-auditor finding this closes). Owner (auth.uid() = id) and staff (is_staff()) branches are unaffected.';
