-- =============================================================================
-- Publish every existing Mindsetter page (owner's decision, 06.11.2026)
-- =============================================================================
-- The spec publishes a Mindsetter page (`mindsetter_profiles.is_public`) only after staff
-- verification, but there is no back office yet to verify or publish anyone, so every page stayed
-- visible to its owner only. Interim rule until the admin panel exists: a page goes live the
-- moment its owner becomes a Mindsetter — the app now does that at promotion
-- (`promoteIfCoreWizardDone`, switch `MINDSETTER_AUTO_PUBLISH`). This migration applies the same
-- rule ONCE to everyone who became a Mindsetter before it shipped.
--
-- Scope: `account_type = 'mindsetter'` and not blocked; already-public rows are left alone.
-- `verification_status` is NOT touched — pages show no "Verified" badge until staff verify, and
-- nothing the permission matrix ties to verification is unlocked. Staff can still unpublish any
-- page afterwards.
--
-- `is_public` is guarded by `guard_mindsetter_profiles_is_public` (only staff / service_role may
-- change it), and a migration runs as neither, so the guard is switched off for this one UPDATE and
-- back on right after, inside the same transaction.
--
-- Runs once per environment (test, dev, and prod when it gets this release). Do not edit after it
-- has been applied — add a new migration instead.
-- =============================================================================

alter table public.mindsetter_profiles disable trigger guard_mindsetter_profiles_is_public;

update public.mindsetter_profiles as mp
set is_public = true
from public.profiles as p
where p.id = mp.id
  and p.account_type = 'mindsetter'
  and p.is_blocked = false
  and mp.is_public = false;

alter table public.mindsetter_profiles enable trigger guard_mindsetter_profiles_is_public;
