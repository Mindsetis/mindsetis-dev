-- =============================================================================
-- Storage hardening (security audit of the 2026-10-31 batch): two findings
-- =============================================================================
-- Follows `20261031132359_avatar_originals_recrop.sql` (already applied to the
-- hosted project, therefore never edited — everything below is a new migration).
--
-- Finding 1 (Medium, pre-existing) — `avatars_public_read` lets ANONYMOUS callers
-- enumerate the bucket
-- -----------------------------------------------------------------------------
-- `20260707150500_fix_profile_interests_race_and_avatar_public_read.sql` added
-- `avatars_public_read` (SELECT, no `to` clause = {public}, `bucket_id = 'avatars'`)
-- as a "belt-and-suspenders" policy next to flipping the bucket to `public = true`.
-- It was never needed for rendering: `GET /storage/v1/object/public/avatars/...`
-- is served by Storage for any `public = true` bucket WITHOUT consulting
-- `storage.objects` RLS. What the policy DOES grant is
-- `POST /storage/v1/object/list/avatars` to anon, i.e. a full listing of every
-- `{uid}/` folder — and with it the photos of Members whose profile pages require
-- a session and of Mindsetters whose profile is not yet public (the object URL is
-- guessable from the uid, and a Member's photo is meant to be visible only to
-- signed-in users).
--
-- Fix: drop the public SELECT and replace it with an OWNER-ONLY SELECT
-- `to authenticated` on the caller's own folder. The owner SELECT is kept (not
-- merely dropped) because the app uploads with `upload(path, file, { upsert: true })`
-- (`member-profile/actions.ts`, `dashboard/profile/actions.ts`): Storage turns that
-- into `INSERT ... ON CONFLICT DO UPDATE`, and Postgres needs SELECT visibility of
-- the existing row for the conflict branch. Same lesson as `reel-life` /
-- `promo-video` / `avatar-originals`.
-- The bucket stays `public = true`: viewers keep getting `getPublicUrl()` links.
--
-- Other buckets reviewed (live `storage.buckets` / `pg_policies` + a grep of every
-- `storage.from(...)` call in the app):
--   - `covers`, `reel-life`, `promo-video`, `avatar-originals` are `public = false`
--     and have NO public-read policy (owner-only SELECT at most) — not affected.
--   - `brand-assets` is `public = true` with `brand_assets_public_read`, but holds
--     only platform-owned email logos (no user content, no uid folders); its
--     migration documents the public policy as deliberate. Left unchanged.
--   - No non-owner code path lists, signs or downloads from `avatars`: the app only
--     does the owner's `upload(upsert)` and `getPublicUrl()`. (The other-viewer
--     signing in `mindsetters/[username]/page.tsx` goes through the service role
--     on `reel-life` / `promo-video`, unaffected.)
--
-- Finding 2 (Low, hardening) — `avatar-originals` accepts ANY filename in `{uid}/`
-- -----------------------------------------------------------------------------
-- The design writes exactly one object per member: `{uid}/original`
-- (`avatarOriginalPath()` in `lib/validation/avatar-crop.ts`). The INSERT/UPDATE
-- policies from `20261031132359` only pinned the first folder segment, so a member
-- could park thousands of <=10 MB files in their folder (storage quota abuse).
-- Fix: pin the whole object name — `name = auth.uid() || '/original'` — on all four
-- policies (INSERT, UPDATE using + with check, SELECT, DELETE). SELECT/DELETE are
-- tightened too so the rule is uniform; the bucket holds no objects at this point on
-- the hosted project, so nothing is stranded. The service role (RLS bypass) can still
-- clean up anything for support / account deletion.
-- The mirror rule at the data level, CHECK `profiles_avatar_original_path_valid`, is
-- narrowed from "`{id}/` + any single segment" to exactly `{id}/original`. No row has
-- `avatar_original_path` set on the hosted project (verified before writing this), and
-- the app only ever writes `avatarOriginalPath(userId)`, so adding the constraint
-- cannot fail on existing data.
--
-- Idempotent: safe to re-run via `npm run db:push` on hosted Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. avatars: no anonymous listing; owner-only SELECT (needed for upsert)
-- -----------------------------------------------------------------------------
drop policy if exists "avatars_public_read" on storage.objects;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- The write policies (`avatars_insert_own_folder` / `avatars_update_own` /
-- `avatars_delete_own`, 20260701090100) are intentionally left as they are; and the
-- bucket's `public = true` flag is untouched, so `/object/public/avatars/...` URLs
-- keep resolving for everyone.

-- -----------------------------------------------------------------------------
-- 2. avatar-originals: the only object is exactly `{uid}/original`
-- -----------------------------------------------------------------------------
drop policy if exists "avatar_originals_select_own" on storage.objects;
create policy "avatar_originals_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatar-originals'
    and name = (select auth.uid())::text || '/original'
  );

drop policy if exists "avatar_originals_insert_own_folder" on storage.objects;
create policy "avatar_originals_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatar-originals'
    and name = (select auth.uid())::text || '/original'
  );

drop policy if exists "avatar_originals_update_own" on storage.objects;
create policy "avatar_originals_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatar-originals'
    and name = (select auth.uid())::text || '/original'
  )
  with check (
    bucket_id = 'avatar-originals'
    and name = (select auth.uid())::text || '/original'
  );

drop policy if exists "avatar_originals_delete_own" on storage.objects;
create policy "avatar_originals_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatar-originals'
    and name = (select auth.uid())::text || '/original'
  );

-- -----------------------------------------------------------------------------
-- 3. profiles.avatar_original_path: exactly `{id}/original`
-- -----------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_avatar_original_path_valid;
alter table public.profiles
  add constraint profiles_avatar_original_path_valid
    check (
      avatar_original_path is null
      or avatar_original_path = id::text || '/original'
    );

comment on column public.profiles.avatar_original_path is
  'Path of the uncropped original photo inside the PRIVATE avatar-originals bucket, always exactly {profile id}/original (not a URL — read it via a server-minted signed URL). Null = no original on record (legacy avatar or no photo). Owner-written through profiles_update_own; constrained by profiles_avatar_original_path_valid.';
