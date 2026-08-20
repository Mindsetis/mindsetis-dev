-- =============================================================================
-- Reel Life: lower the per-photo upload limit from 10 MB to 5 MB
-- =============================================================================
-- Product decision from the demo review (2026-08-05): Reel Life photos are
-- capped at 5 MB each, matching the `avatars` bucket, instead of the 10 MB the
-- original design copy specified. Members are pointed at an image-optimisation
-- step instead of being allowed to upload phone-camera originals.
--
-- This is the ONLY real enforcement point. The client-side check in
-- `lib/validation/mindsetter.ts` (`MAX_REEL_LIFE_PHOTO_SIZE_BYTES`) is a
-- courtesy that produces a readable error before the network round-trip — it is
-- trivially bypassed, so the bucket's own `file_size_limit` is what actually
-- stops an oversized object being written. Both are changed in the same pass;
-- if they ever drift, the bucket wins and the user sees a raw Storage error
-- instead of our message.
--
-- `update`, not `insert ... on conflict`: the bucket already exists from
-- 20260718160224_mindsetter_onboarding_schema_alignment.sql, whose insert is
-- `on conflict (id) do nothing` and would therefore silently change nothing.
--
-- The `covers` bucket is deliberately left at 10 MB — this decision was about
-- the Reel Life step only, and a cover image is one large hero photo rather
-- than one of up to twenty tiles.
--
-- Existing objects are unaffected: `file_size_limit` is enforced on upload, so
-- anything already stored above 5 MB stays valid and readable.
-- =============================================================================

update storage.buckets
set file_size_limit = 5242880 -- 5 MB
where id = 'reel-life';
