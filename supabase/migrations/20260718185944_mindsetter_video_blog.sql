-- =============================================================================
-- Stage 1.9 — Mindsetter onboarding: Video blog block (un-deferred from Phase 2)
-- =============================================================================
-- The "Video blog" optional block was previously excluded as Phase 2 scope, but
-- per Figma / product owner it is now part of the MVP extended Mindsetter
-- onboarding (spec §5.2). This migration only adds one column to
-- `mindsetter_profiles` — same shape/pattern as the existing `promo_video`
-- column (converted to jsonb in 20260718160224_mindsetter_onboarding_schema_alignment.sql):
-- a jsonb object holding { youtube, vimeo } URLs (direct upload deferred past MVP,
-- MVP stores URLs only).
--
-- RLS note (re-verified against 20260701100100_profiles.sql, same reasoning as
-- the `reel_life` column addition in 20260718160224_...):
--   `mindsetter_profiles_insert_own` (auth.uid() = id) and
--   `mindsetter_profiles_update_own` (auth.uid() = id) are column-agnostic
--   `using`/`with check` clauses — they apply to every column on the row,
--   including this new one. `mindsetter_profiles_read` (is_public/own/staff)
--   likewise applies row-wide. No policy change needed.
-- =============================================================================

alter table mindsetter_profiles
  add column if not exists video_blog jsonb default '{}'::jsonb;

comment on column mindsetter_profiles.video_blog is
  '{youtube, vimeo} URLs for the optional "Video blog" block. Direct video upload deferred past MVP.';
