/**
 * Server-side half of the profile-photo re-crop (Release 2, "Правки 3.0"): decides what the two
 * new `profiles` columns (`avatar_original_path`, `avatar_crop`) must become when a profile form
 * is saved, and checks the one thing the browser cannot be trusted about — that the uncropped
 * original really is in the private `avatar-originals` bucket.
 *
 * Shared by BOTH places that save a photo — the registration step 3/4 action
 * (`app/[locale]/(app)/member-profile/actions.ts`) and the cabinet Hero action
 * (`app/[locale]/(app)/dashboard/profile/actions.ts`) — so the rules cannot drift apart.
 *
 * Trust model. The original is uploaded by the browser straight into the member's own folder
 * (RLS: owner-only insert/update on `{auth.uid()}/…`) because it can exceed what a Server Action
 * may carry (`serverActions.bodySizeLimit` is 6 MB and Vercel caps request bodies at ~4.5 MB).
 * The client therefore sends only the FRAME (`avatarCrop`, Zod-validated by the action schema).
 * The PATH is never taken from the request: it is rebuilt here from the authenticated user id
 * ({@link avatarOriginalPath}), which is also the only value the DB CHECK
 * (`profiles_avatar_original_path_valid`) would let a profile point at.
 */
import 'server-only';

import { ActionError } from '@/lib/api/errors';
import type { createClient } from '@/lib/supabase/server';
import {
  AVATAR_ORIGINAL_FILENAME,
  AVATAR_ORIGINALS_BUCKET,
  type AvatarCrop,
  avatarOriginalPath,
} from '@/lib/validation/avatar-crop';
import { vmsg } from '@/lib/validation/messages';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** The two columns to merge into the `profiles` update that stores the new `avatar_url`. */
export type AvatarFramingColumns = {
  avatar_original_path: string | null;
  avatar_crop: AvatarCrop | null;
};

type ResolveArgs = {
  supabase: ServerSupabase;
  userId: string;
  /** A new cropped avatar `File` arrived in this submission. */
  hasNewAvatar: boolean;
  /** The validated frame that came with it (`avatarCropActionFields`), if any. */
  crop: AvatarCrop | undefined;
};

// Encoded (`vmsg`) so the form's banner shows it in the visitor's language.
const SAVE_ERROR = vmsg('avatarSaveFailed');

/**
 * Returns the columns to write, or `null` when this submission does not touch the photo at all
 * (no new avatar → both columns stay exactly as they are, including a stored original + frame).
 *
 * Call it BEFORE the cropped avatar is uploaded, so a failed check cannot leave a replaced
 * `avatars/{uid}/avatar.*` object behind an unchanged profile row.
 *
 *  - new avatar + frame  → the original must exist at the fixed path; both columns are set
 *    together (the DB requires `avatar_crop` ⇒ `avatar_original_path`). Covers three client cases
 *    with ONE rule: a new upload, a re-frame of the stored original (nothing uploaded this time),
 *    and a legacy photo whose current file was just promoted to be its own original.
 *  - new avatar, no frame → an older client / hand-made request. The previously stored original
 *    (if any) belongs to a photo that is being replaced, so the frame is dropped and the orphaned
 *    object is removed (best-effort) rather than left to be re-opened with the wrong picture.
 *  - frame without a new avatar → rejected; a frame only means something next to the avatar cut
 *    from it.
 */
export async function resolveAvatarFraming({
  supabase,
  userId,
  hasNewAvatar,
  crop,
}: ResolveArgs): Promise<AvatarFramingColumns | null> {
  if (!hasNewAvatar) {
    if (crop) {
      throw new ActionError('validation_error', 'Please add a profile photo.', {
        avatar: ['Profile photo is required.'],
      });
    }
    return null;
  }

  const path = avatarOriginalPath(userId);

  if (!crop) {
    // Best-effort: failing to delete a private orphan must not block saving the profile.
    const { error } = await supabase.storage.from(AVATAR_ORIGINALS_BUCKET).remove([path]);
    if (error) console.error('[avatar] could not remove stale original:', error);
    return { avatar_original_path: null, avatar_crop: null };
  }

  const { data: objects, error: listError } = await supabase.storage
    .from(AVATAR_ORIGINALS_BUCKET)
    .list(userId, { limit: 20, search: AVATAR_ORIGINAL_FILENAME });
  if (listError) {
    console.error('[avatar] original lookup failed:', listError);
    throw new ActionError('internal_error', SAVE_ERROR);
  }
  if (!objects?.some((object) => object.name === AVATAR_ORIGINAL_FILENAME)) {
    // The browser claimed an original but nothing is there: the direct upload didn't land.
    throw new ActionError('validation_error', SAVE_ERROR);
  }

  return { avatar_original_path: path, avatar_crop: crop };
}

/**
 * `avatars/{uid}/avatar.{ext}` is rewritten in place (`upsert`), so its public URL never changes
 * and Storage serves it with `max-age=3600` — a re-framed photo would keep showing the old crop
 * from the browser cache for up to an hour. A throw-away query string makes every save a new URL.
 * The column is only ever used as an `<img src>` / "has a photo" flag, so this is safe.
 */
export function withAvatarCacheBuster(publicUrl: string): string {
  return `${publicUrl}?v=${Date.now()}`;
}
