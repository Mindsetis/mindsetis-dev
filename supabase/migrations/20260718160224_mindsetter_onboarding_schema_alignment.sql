-- =============================================================================
-- Stage 1.9 — Extended Mindsetter onboarding: schema alignment
-- =============================================================================
-- Prep migration for the extended Mindsetter onboarding flow (spec §5.2,
-- docs/mindsetter-extended-onboarding.md section A). `mindsetter_profiles`
-- and `session_settings` already exist (20260701100100_profiles.sql /
-- 20260701100200_sessions.sql) but some column types/shapes predate the
-- Figma-driven design and are missing fields the onboarding needs. This
-- migration only ALTERs existing tables/adds columns/adds a Storage bucket —
-- it does not touch RLS policies (see note below) or the staff-only guard
-- triggers (`guard_profiles_protected_columns`, `guard_mindsetter_profiles_is_public`),
-- which remain exactly as-is.
--
-- Pre-migration data check (2026-07-18, via hosted PostgREST HEAD + `count=exact`,
-- service-role key, project ref pqaffuvhghlbenqigwks): both `mindsetter_profiles`
-- and `session_settings` have 0 rows — the Mindsetter onboarding UI was never
-- built, so nothing has ever written to either table. The `text[]`/`text` -> `jsonb`
-- conversions below therefore use simple `using '[]'::jsonb` / `using '{}'::jsonb`
-- casts rather than attempting to preserve old-shaped data (there is none to
-- preserve). If this migration is ever re-derived after real rows exist, that
-- assumption must be re-verified first.
--
-- RLS note (verified against 20260701100100_profiles.sql / 20260701100200_sessions.sql):
--   * mindsetter_profiles: `mindsetter_profiles_read` (is_public/own/staff),
--     `mindsetter_profiles_insert_own` (auth.uid() = id),
--     `mindsetter_profiles_update_own` (auth.uid() = id),
--     `mindsetter_profiles_update_staff` (is_staff(...)) are all column-agnostic
--     `using`/`with check` clauses — they apply to every column on the row,
--     including the ones altered/added here. No policy change needed.
--   * session_settings: `session_settings_read_public` (via profiles.is_blocked),
--     `session_settings_insert_own` / `session_settings_update_own`
--     (auth.uid() = mindsetter_id) are likewise column-agnostic. No policy
--     change needed.
--   Neither table's guard triggers (is_public / account_type / etc.) reference
--   any of the columns touched here, so those triggers are unaffected.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mindsetter_profiles — type conversions + new reel_life column
-- -----------------------------------------------------------------------------

-- roles: text[] -> jsonb. New app-level shape (no DB constraint):
--   [{ title, description, links: [{ url, og_title }] }]
alter table mindsetter_profiles
  alter column roles drop default;

alter table mindsetter_profiles
  alter column roles type jsonb using '[]'::jsonb;

alter table mindsetter_profiles
  alter column roles set default '[]'::jsonb;

-- help_with: text[] -> jsonb. Shape: [{ title, description }]
alter table mindsetter_profiles
  alter column help_with drop default;

alter table mindsetter_profiles
  alter column help_with type jsonb using '[]'::jsonb;

alter table mindsetter_profiles
  alter column help_with set default '[]'::jsonb;

-- my_way: text -> jsonb. Shape: [{ project, description, year_from, year_to }]
alter table mindsetter_profiles
  alter column my_way type jsonb using '[]'::jsonb;

alter table mindsetter_profiles
  alter column my_way set default '[]'::jsonb;

-- promo_video: text -> jsonb. Shape: { youtube, vimeo } (direct upload deferred
-- to a later stage; MVP stores URLs only).
alter table mindsetter_profiles
  alter column promo_video type jsonb using '{}'::jsonb;

alter table mindsetter_profiles
  alter column promo_video set default '{}'::jsonb;

-- reel_life: new column. Array of Storage object paths (bucket `reel-life`)
-- for the Reel Life photo section. Order is the array order (drag-to-reorder
-- in the UI rewrites the whole array); no separate order index column.
alter table mindsetter_profiles
  add column if not exists reel_life jsonb default '[]'::jsonb;

comment on column mindsetter_profiles.roles is
  'Array of {title, description, links:[{url, og_title}]} — app-level shape, no DB constraint.';
comment on column mindsetter_profiles.help_with is
  'Array of {title, description}. Card titles double as the topic-option source for session_settings.topics.';
comment on column mindsetter_profiles.my_way is
  'Array of {project, description, year_from, year_to}.';
comment on column mindsetter_profiles.promo_video is
  '{youtube, vimeo} URLs. Direct video upload deferred past MVP.';
comment on column mindsetter_profiles.reel_life is
  'Array of Storage object paths in the reel-life bucket (min 3 to activate the section per design), in display order.';

-- -----------------------------------------------------------------------------
-- session_settings — new columns for "Accept bookings" + weekly schedule
-- -----------------------------------------------------------------------------
alter table session_settings
  add column if not exists accepts_bookings boolean not null default true,
  add column if not exists timezone text,
  add column if not exists available_days text[] not null default '{}',
  add column if not exists available_from time,
  add column if not exists available_to time;

comment on column session_settings.accepts_bookings is
  '"Accept bookings" toggle. false hides the booking widget / weekly schedule fields on the public profile.';
comment on column session_settings.timezone is
  'IANA timezone string (e.g. "Europe/Kyiv"), auto-detected client-side, editable by the Mindsetter.';
comment on column session_settings.available_days is
  'Recurring weekly-schedule days, e.g. {mon,tue,wed}. Distinct from availability_slots, which holds concrete booked/bookable timestamp slots.';
comment on column session_settings.available_from is
  'Recurring weekly-schedule start time (local to `timezone`).';
comment on column session_settings.available_to is
  'Recurring weekly-schedule end time (local to `timezone`).';

-- -----------------------------------------------------------------------------
-- Storage: reel-life bucket, mirroring the avatars/covers pattern
-- (20260701090100_storage_buckets.sql) — private bucket, signed URLs minted
-- server-side, owner-scoped `{auth.uid()}/...` folder convention for
-- insert/update/delete. No public-read policy (same precedent as covers):
-- Reel Life photos are only ever exposed via a signed URL once the public
-- Mindsetter profile page exists (still gated by mindsetter_profiles.is_public,
-- section B of the onboarding doc) — not via a bucket-wide public read policy.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reel-life',
  'reel-life',
  false,
  10485760, -- 10 MB, matches the "Max 10MB per photo" copy in the design
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists "reel_life_insert_own_folder" on storage.objects;
create policy "reel_life_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reel-life'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "reel_life_update_own" on storage.objects;
create policy "reel_life_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reel-life'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'reel-life'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "reel_life_delete_own" on storage.objects;
create policy "reel_life_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reel-life'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
