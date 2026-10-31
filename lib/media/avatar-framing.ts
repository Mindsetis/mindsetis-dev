/**
 * Client-side hand-over between the profile-photo editor (`AvatarCropDialog`) and the profile
 * forms that finally submit it (Release 2 re-crop).
 *
 * WHY A REGISTRY KEYED BY THE FILE. The editor's output is the cropped avatar `File` — that is
 * the React Hook Form field value and what the Zod schema validates. The re-crop additionally
 * needs the frame (`crop`) and, when it changed, the uncropped `original` to upload. Binding them
 * to the exact `File` object (a `WeakMap`, so nothing leaks) means the extra data can never
 * disagree with the file it belongs to — picking another photo, resetting the form or discarding
 * the file simply drops its framing with it — and the forms need no second piece of state.
 *
 * Nothing here is persisted: the original is uploaded, and the frame sent, only when the form is
 * actually saved ({@link appendAvatarToFormData}). Cancelling the dialog, or leaving the form
 * unsaved, changes nothing on the server.
 *
 * Browser-only (uses the browser Supabase client) — import from client components only.
 */
import { createClient } from '@/lib/supabase/browser';
import {
  AVATAR_ORIGINALS_BUCKET,
  type AvatarCrop,
  avatarOriginalPath,
} from '@/lib/validation/avatar-crop';

export type AvatarFraming = {
  /** The frame chosen on the original, in percent of it. */
  crop: AvatarCrop;
  /**
   * The uncropped picture that must be (re)written to `avatar-originals/{uid}/original` when the
   * form is saved: a freshly picked photo (downscaled), or — for a legacy photo that has no
   * original on record yet — the current avatar file promoted to be its own original.
   * `null` = the stored original is already right and stays untouched (a pure re-frame).
   */
  original: File | null;
};

const framingByFile = new WeakMap<File, AvatarFraming>();

export function setAvatarFraming(file: File, framing: AvatarFraming): void {
  framingByFile.set(file, framing);
}

export function getAvatarFraming(file: File): AvatarFraming | undefined {
  return framingByFile.get(file);
}

/**
 * Uploads the original straight from the browser to the member's own folder (owner-only RLS on
 * `avatar-originals`). It does NOT go through the Server Action: an original of up to a few MB
 * would blow past the 6 MB action body limit together with the other fields (and Vercel's own
 * ~4.5 MB request cap). The server later checks the object exists and rebuilds the path itself —
 * the path is never taken from the client.
 */
async function uploadAvatarOriginal(original: File): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.storage
      .from(AVATAR_ORIGINALS_BUCKET)
      .upload(avatarOriginalPath(user.id), original, {
        contentType: original.type,
        upsert: true,
      });
    if (error) {
      console.error('[avatar] original upload failed', error);
      return false;
    }
    return true;
  } catch (cause) {
    console.error('[avatar] original upload failed', cause);
    return false;
  }
}

/**
 * Puts the photo part of a profile form onto the `FormData` for its Server Action, and — when the
 * photo was edited with the re-crop editor — uploads the original FIRST (the action checks it is
 * there before it accepts the frame). Replaces the forms' old one-liner
 * `if (values.avatar) formData.append('avatar', values.avatar)`.
 *
 * Returns `false` when the original could not be uploaded; the caller shows its own translated
 * message and does not call the action (nothing was changed server-side).
 *
 * No `avatar` (nothing new picked) → nothing is appended and the server keeps what is on record.
 * A file without framing (not produced by the editor) is appended alone; the server then drops
 * any stored frame, since it no longer describes the new picture.
 *
 * Ordering note: the original is written before the action runs, so if the action itself then
 * fails (e.g. nickname taken) and the member walks away, the stored original and the stored frame
 * are briefly out of step — the next "Edit photo" shows the new picture with the old frame, which
 * the member can simply re-adjust. Retrying the save re-uploads the same bytes (idempotent).
 */
export async function appendAvatarToFormData(
  formData: FormData,
  avatar: File | undefined,
): Promise<boolean> {
  if (!avatar) return true;

  const framing = framingByFile.get(avatar);
  if (framing?.original && !(await uploadAvatarOriginal(framing.original))) return false;

  formData.append('avatar', avatar);
  if (framing) formData.append('avatarCrop', JSON.stringify(framing.crop));
  return true;
}
