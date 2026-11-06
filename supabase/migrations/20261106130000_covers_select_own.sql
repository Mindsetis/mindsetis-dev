-- =============================================================================
-- Release 4 П7 — `covers` bucket: owner-scoped SELECT policy
-- =============================================================================
-- The promo video's optional custom thumbnail ("Promo Video Thumbnail", client edit 06.11.2026)
-- is stored in the existing PRIVATE `covers` bucket under `<auth.uid()>/...` — the bucket Stage
-- 0.2 created for cover images and nothing had used yet (images only, 10 MB cap, owner-folder
-- insert/update/delete policies already in place).
--
-- What it never got is a SELECT policy, so its owner can't do the two things the thumbnail field
-- needs through their own session: `createSignedUrl` (to preview the image they just uploaded —
-- the same 403 `reel_life_select_own` fixed for Reel Life in 20260718172922) and `remove` (Storage
-- needs SELECT as well as DELETE to delete). Same shape as `reel_life_select_own` /
-- `promo_video_select_own`: the caller's own folder only, never anyone else's. Visitors of a
-- public profile still never read the bucket directly — the profile page mints their signed URLs
-- server-side, exactly as it does for Reel Life.
--
-- Idempotent. Do not edit after it has been applied — add a new migration instead.
-- =============================================================================

drop policy if exists "covers_select_own" on storage.objects;
create policy "covers_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
