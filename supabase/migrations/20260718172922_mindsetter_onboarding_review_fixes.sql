-- =============================================================================
-- Stage 1.9 — Extended Mindsetter onboarding: review-loop follow-up fixes
-- =============================================================================
-- Follow-up to 20260718160224_mindsetter_onboarding_schema_alignment.sql,
-- addressing 3 findings from the stage-1.9 review loop (code-reviewer /
-- security-auditor / qa). Does NOT edit the already-applied migration.
--
-- 1. [QA — confirmed live] `reel-life` Storage bucket has insert/update/delete
--    policies but no SELECT policy, so `createSignedUrl` fails even for the
--    object's own owner. Add an owner-scoped select policy, matching the
--    exact `to authenticated` / `storage.foldername(name))[1] = auth.uid()`
--    convention of the bucket's other policies.
--
-- 2. [security-auditor] `session_settings_read_public` (from
--    20260701100200_sessions.sql) only checked `profiles.is_blocked = false`,
--    which would publicly expose session config written as a draft during
--    onboarding — before the Mindsetter is verified/published. The
--    onboarding flow writes `session_settings` rows via server
--    action/service role while the profile is still `unverified`/
--    `account_type = 'mindsetter'` pending review, and `mindsetter_profiles.is_public`
--    is false until staff verification. Public SELECT must not leak that
--    draft config. Fix: gate the PUBLIC branch on the mindsetter actually
--    being verified (`account_type = 'mindsetter'` and
--    `verification_status = 'verified'`), in addition to not blocked. The
--    OWNER must still be able to SELECT their own draft row (needed to
--    prefill the onboarding wizard on return visits, and to see their own
--    unpublished settings) — added as a separate `auth.uid() = mindsetter_id`
--    branch — and staff can always read (`is_staff`). This does not touch
--    `session_settings_insert_own` / `session_settings_update_own` (the write
--    path is unchanged).
--
-- 3. [code-reviewer — High] The Mindsetter onboarding wizard was reusing
--    `profiles.onboarding_step`, which the Member registration wizard also
--    writes (values 2/3 for its own steps) — a cross-flow collision. Add a
--    dedicated `mindsetter_profiles.onboarding_step` column for the
--    Mindsetter track so the two wizards never stomp on each other's
--    progress. `mindsetter_profiles`'s existing owner insert/update policies
--    (`mindsetter_profiles_insert_own` / `mindsetter_profiles_update_own`,
--    both plain `auth.uid() = id` `using`/`with check` clauses) are
--    column-agnostic, so they already cover this new column — no RLS change
--    needed here. (App code switchover to this column is a separate change;
--    this migration only adds the column.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. reel-life bucket: owner-scoped SELECT policy (fixes createSignedUrl 403)
-- -----------------------------------------------------------------------------
drop policy if exists "reel_life_select_own" on storage.objects;
create policy "reel_life_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reel-life'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- 2. session_settings: gate public read on verified+mindsetter, keep owner read
-- -----------------------------------------------------------------------------
drop policy if exists "session_settings_read_public" on session_settings;
create policy "session_settings_read_public" on session_settings
  for select using (
    (
      exists (
        select 1 from profiles p
        where p.id = mindsetter_id
          and p.is_blocked = false
          and p.account_type = 'mindsetter'
          and p.verification_status = 'verified'
      )
    )
    or auth.uid() = mindsetter_id
    or is_staff(auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 3. mindsetter_profiles: dedicated onboarding progress column
-- -----------------------------------------------------------------------------
alter table mindsetter_profiles
  add column if not exists onboarding_step int default 0;

comment on column mindsetter_profiles.onboarding_step is
  'Extended Mindsetter onboarding wizard step, separate from profiles.onboarding_step (used by the Member registration wizard) to avoid cross-flow collisions.';
