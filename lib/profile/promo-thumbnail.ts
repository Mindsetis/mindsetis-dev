import type { SupabaseClient } from '@supabase/supabase-js';

import { PROMO_THUMBNAIL_PATH } from '@/lib/validation/mindsetter';

/** Preview lifetime — one editing session; every page load mints a fresh one. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type PromoThumbnailPreview = { path: string; url: string };

/**
 * Signed preview URL for the owner's saved promo thumbnail, for the promo form's prefill. Uses the
 * caller's own session client (the `covers_select_own` policy, migration `20261106130000`), so it
 * can only ever sign an object in the caller's own folder. Returns `null` when none is saved, the
 * stored path is malformed / foreign, or signing fails (e.g. the migration isn't applied yet) —
 * the form then simply starts without a preview.
 */
export async function getPromoThumbnailPreview(
  supabase: SupabaseClient,
  userId: string,
  promoVideo: unknown,
): Promise<PromoThumbnailPreview | null> {
  const raw =
    promoVideo && typeof promoVideo === 'object'
      ? (promoVideo as { thumbnailPath?: unknown }).thumbnailPath
      : null;
  if (typeof raw !== 'string') return null;
  const path = raw.trim();
  if (!path.startsWith(`${userId}/`) || !PROMO_THUMBNAIL_PATH.test(path)) return null;

  const { data, error } = await supabase.storage
    .from('covers')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error('[promo-thumbnail] signed URL failed:', error);
    return null;
  }
  return { path, url: data.signedUrl };
}
