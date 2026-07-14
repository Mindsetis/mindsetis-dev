-- =============================================================================
-- Add profiles.company / role / industry (Step 3/4 "What do you build?")
-- =============================================================================
-- Figma's registration wizard Step 3/4 collects Company, Role/Position, and
-- Industry — plain-text fields on the base Member profile (not Mindsetter-
-- specific, so they live on `profiles` alongside `company`/`job_title` added
-- in 20260701100100_profiles.sql, not on `mindsetter_profiles`).
--
-- `profiles.company` already exists (20260701100100_profiles.sql) and is
-- reused as-is for Step 3/4's "Company" field — not duplicated here.
-- `role` and `industry` are new. "Role/Position" is deliberately named `role`
-- (not `job_title`, which already exists and is unused by this wizard step;
-- `job_title` predates the Figma-driven Step 3/4 spec and is left untouched
-- to avoid breaking any existing reference to it).
--
-- Nullable at the DB level on purpose, same precedent as `last_name`
-- (20260707132206_profiles_last_name.sql): "required" is an app-level
-- (Zod / Server Action) rule enforced on the Step 3/4 form, not a DB
-- constraint — a NOT NULL here would break the insert path for
-- already-registered users and for any insert that doesn't (yet) supply
-- these fields.
--
-- RLS: no new policy needed. `profiles` already has RLS enabled with
-- `profiles_read` (own row, or is_blocked = false, or staff) and
-- `profiles_update_own` (`using`/`with check` on `auth.uid() = id`, no
-- column restriction) from 20260701100100_profiles.sql — both are
-- column-agnostic and already cover `company`/`role`/`industry` for the
-- owning user. The `guard_profiles_protected_columns` trigger only inspects
-- `verification_status` / `account_type` / `is_blocked`, so it does not
-- touch these columns either. Verified: a plain column addition needs no
-- RLS changes here, same reasoning as the `last_name` migration.
-- =============================================================================

alter table profiles
  add column if not exists role text,
  add column if not exists industry text;
