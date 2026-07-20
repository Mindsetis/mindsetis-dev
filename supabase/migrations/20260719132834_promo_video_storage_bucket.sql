-- =============================================================================
-- Stage 1.9 — Mindsetter onboarding: Promo video direct upload (decision D4)
-- =============================================================================
-- The "Promo video" optional block previously only accepted YouTube/Vimeo URLs
-- (stored in `mindsetter_profiles.promo_video`, jsonb `{youtube, vimeo}` —
-- see 20260718160224_mindsetter_onboarding_schema_alignment.sql). Per product
-- owner decision D4, this step now also supports direct video upload. This
-- migration only adds a Storage bucket + owner-scoped policies; no table/column
-- change is needed — the app will start writing an additional `videoPath` key
-- into the same `promo_video` jsonb blob (still no DB constraint on its shape).
--
-- Pattern mirrors the `reel-life` bucket exactly (private bucket, signed URLs
-- minted server-side, owner-scoped `{auth.uid()}/...` folder convention), this
-- time for video files, and includes the SELECT policy from the start — the
-- `reel-life` bucket initially shipped without one (missing `createSignedUrl`
-- support for the owner), caught by a security review and fixed in
-- 20260718172922_mindsetter_onboarding_review_fixes.sql. Not repeating that
-- bug here: all four (insert/select/update/delete) owner-scoped policies are
-- added together.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage: promo-video bucket
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promo-video',
  'promo-video',
  false,
  209715200, -- 200 MB, matches the onboarding doc's "Max 200MB" copy
  array['video/mp4', 'video/quicktime'] -- MP4 and MOV
)
on conflict (id) do nothing;

drop policy if exists "promo_video_insert_own_folder" on storage.objects;
create policy "promo_video_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'promo-video'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "promo_video_select_own" on storage.objects;
create policy "promo_video_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'promo-video'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "promo_video_update_own" on storage.objects;
create policy "promo_video_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'promo-video'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'promo-video'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "promo_video_delete_own" on storage.objects;
create policy "promo_video_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'promo-video'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
