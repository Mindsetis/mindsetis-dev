'use server';

/**
 * Server Action behind the profile-photo editor's "Edit photo" button (Release 2 re-crop).
 *
 * Called on demand — when the member actually opens the editor — and NOT preloaded by the page
 * loaders, for two reasons: the signed URL of the private original is deliberately short-lived
 * (a URL minted at page render would be dead by the time someone clicks Edit minutes later), and
 * the same shared `AvatarUpload` serves both the registration step 3/4 and the cabinet Hero
 * editor, so one read-your-own-row action keeps both in sync without threading two more columns
 * through every loader.
 *
 * It only ever reads the CALLER's own row and Storage folder (session client, RLS-scoped) and
 * returns data the caller could already read themselves; nothing is written.
 */
import { z } from 'zod';

import { createAction } from '@/lib/api';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import {
  AVATAR_ORIGINAL_FILENAME,
  AVATAR_ORIGINALS_BUCKET,
  type AvatarCrop,
  parseStoredAvatarCrop,
} from '@/lib/validation/avatar-crop';

/** Long enough for the browser to start the download straight after the click. */
const ORIGINAL_URL_TTL_SECONDS = 120;

/** Clock-skew allowance between Storage's `updated_at` and our own `?v=` timestamp. */
const ORIGINAL_NEWER_THAN_SAVE_SLACK_MS = 5_000;

/**
 * The browser uploads a new original BEFORE the profile Server Action runs, so a failed save
 * (taken username, network) leaves `{uid}/original` holding a photo the profile never adopted —
 * the saved avatar and frame still belong to the previous one. Every successful save stamps
 * `avatar_url` with `?v=<now>` after that upload, so an original modified later than the stamp
 * is such a leftover: open the editor on the current avatar instead (the legacy path, whose first
 * Save re-uploads that avatar as the original and puts everything back in step).
 */
async function originalIsNewerThanSavedAvatar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  currentUrl: string | null,
): Promise<boolean> {
  const savedAt = currentUrl ? Number(new URL(currentUrl).searchParams.get('v')) : NaN;
  if (!Number.isFinite(savedAt) || savedAt <= 0) return false;

  const { data: objects } = await supabase.storage
    .from(AVATAR_ORIGINALS_BUCKET)
    .list(userId, { limit: 20, search: AVATAR_ORIGINAL_FILENAME });
  const original = objects?.find((object) => object.name === AVATAR_ORIGINAL_FILENAME);
  const modifiedAt = Date.parse(original?.updated_at ?? original?.created_at ?? '');
  return Number.isFinite(modifiedAt) && modifiedAt > savedAt + ORIGINAL_NEWER_THAN_SAVE_SLACK_MS;
}

export type AvatarEditSourceData = {
  /** Signed URL of the stored original + the frame chosen on it; `null` when none is on record. */
  original: { url: string; crop: AvatarCrop | null } | null;
  /**
   * The profile row names an original but a signed URL could not be minted for it (object gone /
   * Storage hiccup). The editor then falls back to the current avatar and tells the member.
   */
  originalUnavailable: boolean;
  /** The saved (cropped) `avatar_url` — the editor's source for legacy photos and for the fallback. */
  currentUrl: string | null;
};

export const getAvatarEditSource = createAction(
  z.object({}),
  async (): Promise<AvatarEditSourceData> => {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, avatar_original_path, avatar_crop')
      .eq('id', user.id)
      .maybeSingle();

    const currentUrl = profile?.avatar_url ?? null;
    const originalPath = profile?.avatar_original_path ?? null;
    if (!originalPath || (await originalIsNewerThanSavedAvatar(supabase, user.id, currentUrl))) {
      return { original: null, originalUnavailable: false, currentUrl };
    }

    const { data: signed, error } = await supabase.storage
      .from(AVATAR_ORIGINALS_BUCKET)
      .createSignedUrl(originalPath, ORIGINAL_URL_TTL_SECONDS);
    if (error || !signed?.signedUrl) {
      console.error('[avatar] could not sign original URL:', error);
      return { original: null, originalUnavailable: true, currentUrl };
    }

    return {
      original: { url: signed.signedUrl, crop: parseStoredAvatarCrop(profile?.avatar_crop) },
      originalUnavailable: false,
      currentUrl,
    };
  },
);
