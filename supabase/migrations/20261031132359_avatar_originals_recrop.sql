-- =============================================================================
-- Release 2 (edits 3.0) — Facebook-style re-crop of the profile photo
-- =============================================================================
-- Product request: clicking "Edit photo" must reopen the crop dialog with the
-- ORIGINAL photo and the previous frame position/zoom, so the member can
-- re-frame without re-uploading (or pick "Upload new photo"). Until now only
-- the cropped result was stored (`avatars/{uid}/avatar.{ext}`, <=1280 px) and
-- the original was discarded, so re-framing was impossible.
--
-- This migration adds exactly the storage + data the feature needs, nothing
-- else (no new table — the data is 1:1 with the profile and owner-written,
-- same as `avatar_url`):
--
--   1. Storage bucket `avatar-originals` — PRIVATE (public = false), 10 MB,
--      image MIME types identical to the `avatars` bucket. Object path
--      convention is the project-wide `{auth.uid()}/{filename}`; owner-only
--      select/insert/update/delete policies. Deliberately NO public/anon read
--      (unlike `avatars`, which 20260707150500 flipped to public): the original
--      is the uncropped photo — it can contain parts of the frame the member
--      chose to cut away (background, other people, location clues), so it
--      must never be world-readable. The app reads it through a short-lived
--      signed URL minted server-side for the owner, which is why the owner
--      SELECT policy exists (Storage's createSignedUrl needs it; this is the
--      same lesson as `reel-life` in 20260718172922 / `promo-video`).
--      The `avatars` bucket has no staff policies, so none are added here
--      either — originals are owner-only (the service role can still manage
--      them for support / account cleanup).
--
--   2. `profiles.avatar_original_path text` — path of the original INSIDE the
--      `avatar-originals` bucket (NOT a URL; the bucket is private, so a stored
--      URL would be useless). Null = no original on record (legacy avatars
--      uploaded before this migration, or the member has no photo).
--
--   3. `profiles.avatar_crop jsonb` — the frame the member chose, as
--      `{"x":..,"y":..,"width":..,"height":..}` in PERCENT (0..100) of the
--      ORIGINAL image's natural size. This is exactly react-easy-crop's
--      `croppedArea` (percent) and the shape it accepts back as
--      `initialCroppedAreaPercentages`, which restores position AND zoom, so
--      nothing else needs persisting. Null = no frame on record.
--
-- RLS: `profiles` already has RLS enabled. Writes go through the existing
-- `profiles_update_own` (owner) / `profiles_update_staff` (staff) policies,
-- which are column-agnostic, so the owner can already write the two new
-- columns and nobody else can — no policy change is needed and no BEFORE
-- UPDATE guard is needed (these are NOT protected columns like
-- verification_status; an owner editing their own photo framing is the whole
-- point). Reads go through `profiles_read`: the path and crop are therefore
-- visible to whoever can already see the profile row. That is harmless — the
-- path (`{uid}/original.jpg`) only repeats the uid already visible in the
-- public `avatar_url`, and without the owner's session or the service role
-- the object behind it cannot be read (private bucket, owner-only SELECT).
-- DB-level CHECK constraints (below) keep the two columns well-formed even if a
-- future writer other than the form bypasses Zod.
--
-- Idempotent: safe to re-run via `supabase db push` on hosted Supabase. Never
-- edit this file after it has been applied — add a new migration instead.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Storage: avatar-originals bucket (private) + owner-only policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatar-originals',
  'avatar-originals',
  false,
  10485760, -- 10 MB: the uncropped original (the cropped `avatars` copy stays 5 MB)
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif'] -- same set as `avatars`
)
on conflict (id) do nothing;

-- Object path convention enforced by RLS, identical to avatars/covers/reel-life:
-- the first folder segment must equal the caller's uid.
-- `storage.objects` already has RLS enabled by default on Supabase. Every
-- policy names `to authenticated`, so anon gets nothing on this bucket (no
-- select, no list, no write).

-- select: owner only. Needed for createSignedUrl / download of the owner's own
-- original, and for `upsert` (INSERT ... ON CONFLICT DO UPDATE also needs to
-- see the existing row). No other role, no public branch.
drop policy if exists "avatar_originals_select_own" on storage.objects;
create policy "avatar_originals_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatar-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatar_originals_insert_own_folder" on storage.objects;
create policy "avatar_originals_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatar-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatar_originals_update_own" on storage.objects;
create policy "avatar_originals_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatar-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatar-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatar_originals_delete_own" on storage.objects;
create policy "avatar_originals_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatar-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- -----------------------------------------------------------------------------
-- 2. Helper: avatar_crop_valid(jsonb) — shape check for profiles.avatar_crop
-- -----------------------------------------------------------------------------
-- A CHECK expression gets no guaranteed left-to-right short-circuit between
-- `and` operands, and `(c->>'x')::numeric` would raise on a non-numeric value
-- if it ran before the type check — so the whole rule lives in one `case`
-- (ordered evaluation) inside an immutable helper, the same "push the logic
-- into a helper" approach as industries_valid() / is_staff().
-- Rule: null is fine; otherwise an object with EXACTLY the keys x, y, width,
-- height (no extras — the column must not become a junk drawer that every
-- authenticated user can read), all JSON numbers; x,y in 0..100; width,height
-- in (0..100]; and the rectangle stays inside the image
-- (x+width <= 100, y+height <= 100) with a 0.01 tolerance because
-- react-easy-crop reports floats (e.g. 100.00000000000001) — the client should
-- still clamp/round before saving.
create or replace function public.avatar_crop_valid(c jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when c is null then true
    when jsonb_typeof(c) <> 'object' then false
    when (select count(*) from jsonb_object_keys(c)) <> 4 then false
    when not (c ?& array['x', 'y', 'width', 'height']) then false
    when jsonb_typeof(c -> 'x') <> 'number'
      or jsonb_typeof(c -> 'y') <> 'number'
      or jsonb_typeof(c -> 'width') <> 'number'
      or jsonb_typeof(c -> 'height') <> 'number' then false
    else
      (c ->> 'x')::numeric between 0 and 100
      and (c ->> 'y')::numeric between 0 and 100
      and (c ->> 'width')::numeric > 0 and (c ->> 'width')::numeric <= 100
      and (c ->> 'height')::numeric > 0 and (c ->> 'height')::numeric <= 100
      and (c ->> 'x')::numeric + (c ->> 'width')::numeric <= 100.01
      and (c ->> 'y')::numeric + (c ->> 'height')::numeric <= 100.01
  end;
$$;

comment on function public.avatar_crop_valid(jsonb) is
  'CHECK-constraint helper for profiles.avatar_crop: null, or an object with exactly the numeric keys x, y, width, height in PERCENT of the original image (x,y in 0..100; width,height in (0..100]; rectangle inside the image within 0.01 tolerance). Matches react-easy-crop croppedArea / initialCroppedAreaPercentages.';

-- -----------------------------------------------------------------------------
-- 3. profiles: the two new columns + constraints
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_original_path text,
  add column if not exists avatar_crop jsonb;

comment on column public.profiles.avatar_original_path is
  'Path of the uncropped original photo inside the PRIVATE avatar-originals bucket, shape {profile id}/{filename} (not a URL — read it via a server-minted signed URL). Null = no original on record (legacy avatar or no photo). Owner-written through profiles_update_own; constrained by profiles_avatar_original_path_valid.';
comment on column public.profiles.avatar_crop is
  'Frame the member chose on the original, {x,y,width,height} in PERCENT (0..100) of the original''s natural size — react-easy-crop croppedArea / initialCroppedAreaPercentages, restores position and zoom. Null = none on record. Shape enforced by profiles_avatar_crop_valid (avatar_crop_valid()).';

-- The path must be exactly `{this profile's id}/{one filename}`: a profile can
-- never point its record at another user's folder (or a nested/traversal path),
-- mirroring the storage RLS folder rule at the data level.
alter table public.profiles
  drop constraint if exists profiles_avatar_original_path_valid;
alter table public.profiles
  add constraint profiles_avatar_original_path_valid
    check (
      avatar_original_path is null
      or (
        avatar_original_path ~ ('^' || id::text || '/[^/]+$')
        and strpos(avatar_original_path, '..') = 0
        and char_length(avatar_original_path) <= 255
      )
    );

alter table public.profiles
  drop constraint if exists profiles_avatar_crop_valid;
alter table public.profiles
  add constraint profiles_avatar_crop_valid
    check (public.avatar_crop_valid(avatar_crop));

-- A frame is only meaningful relative to a stored original. The reverse (an
-- original with no frame yet) is allowed: the editor then opens with the
-- default centred square.
alter table public.profiles
  drop constraint if exists profiles_avatar_crop_requires_original;
alter table public.profiles
  add constraint profiles_avatar_crop_requires_original
    check (avatar_crop is null or avatar_original_path is not null);
