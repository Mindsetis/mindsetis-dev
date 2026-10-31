/**
 * Resolves WHICH picture the profile-photo editor opens with (Release 2 re-crop). Browser-only.
 *
 * Every path ends in the same shape, {@link AvatarEditSource}: the `image` shown in the cropper,
 * the `crop` frame to restore on it (or `null` = centred full view), and the `original` that must
 * be uploaded when the form is saved (or `null` = the stored original stays as it is).
 *
 *   new upload       a freshly picked file, downscaled to <=2560px; becomes the new original.
 *   pending edit     the member already edited in this session but hasn't saved the form: reopen on
 *                    the same unsaved original (kept in memory) with the frame they chose.
 *   stored original  the private original, fetched via a server-minted signed URL, with the saved
 *                    frame — re-framing it leaves the original untouched (`original: null`).
 *   legacy           photos saved before this feature have no original. The CURRENT avatar is the
 *                    source (zoom-in only); on the first save it is promoted to be the original and
 *                    the frame is stored relative to it, so later edits can zoom back out to the old
 *                    square instead of shrinking each time.
 *   fallback         the original is on record but can't be read → behaves like legacy, plus a
 *                    notice. Saving then replaces the unreadable original with the current avatar.
 */
import imageCompression, { type Options as CompressionOptions } from 'browser-image-compression';

import { getAvatarEditSource } from '@/app/[locale]/(app)/member-profile/avatar-actions';
import { getAvatarFraming } from '@/lib/media/avatar-framing';
import type { AvatarCrop } from '@/lib/validation/avatar-crop';
import { ACCEPTED_AVATAR_MIME_TYPES } from '@/lib/validation/member-profile';

/**
 * Compression applied to the ORIGINAL right after it is picked (the cropped avatar has its own,
 * tighter pass in `AvatarCropDialog`).
 *
 * - `maxWidthOrHeight: 2560` — enough headroom to zoom into a face and still cut a sharp 1280px
 *   avatar, without storing a 6000px camera dump.
 * - `maxSizeMB: 4` — keeps the direct browser upload far below the `avatar-originals` bucket's
 *   10 MB cap and quick on mobile data; the library steps quality/size down only if a 2560px photo
 *   somehow exceeds it.
 * - `initialQuality: 0.9`, `useWebWorker: false` — same reasoning as `AVATAR_COMPRESSION_OPTIONS`
 *   (the worker path loads its code from a public CDN).
 */
export const AVATAR_ORIGINAL_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidthOrHeight: 2560,
  maxSizeMB: 4,
  initialQuality: 0.9,
  useWebWorker: false,
};

export type AvatarEditSource = {
  image: File;
  crop: AvatarCrop | null;
  original: File | null;
  /** Set when the stored original was expected but could not be used (see "fallback" above). */
  notice: 'originalUnavailable' | null;
};

/** A freshly picked photo → downscaled original, shown with the default centred frame. */
export async function prepareNewAvatarSource(picked: File): Promise<AvatarEditSource> {
  // Typed `Blob`, not `File`: the library's types claim `File`, but it resolves a plain Blob (see
  // the note in `AvatarCropDialog`), so re-wrap into a real `File`.
  const compressed: Blob = await imageCompression(picked, AVATAR_ORIGINAL_COMPRESSION_OPTIONS);
  const original = new File([compressed], picked.name, {
    type: compressed.type || picked.type,
    lastModified: Date.now(),
  });
  return { image: original, crop: null, original, notice: null };
}

function resolveImageType(blobType: string, url: string): string | null {
  const accepted = ACCEPTED_AVATAR_MIME_TYPES as readonly string[];
  if (accepted.includes(blobType)) return blobType;
  // Storage normally reports the right type; fall back to the extension for a generic one.
  const pathname = new URL(url, window.location.href).pathname.toLowerCase();
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

/**
 * Downloads an image into a `File`. Fetching the bytes (rather than pointing the cropper at the
 * remote URL) means the canvas never touches a cross-origin image, and the very same `File` can
 * double as the legacy original that is uploaded on save. Both Storage endpoints answer with
 * `access-control-allow-origin: *`. `no-cache`: the public avatar URL is rewritten in place, so a
 * stale browser-cached copy must not become somebody's "original".
 */
async function fetchImageFile(url: string, name: string): Promise<File> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Image request failed: HTTP ${response.status}`);
  const blob = await response.blob();
  const type = resolveImageType(blob.type, url);
  if (!type) throw new Error(`Unsupported image type: ${blob.type || 'unknown'}`);
  return new File([blob], name, { type, lastModified: Date.now() });
}

function fileNameFromUrl(url: string): string {
  try {
    const last = new URL(url, window.location.href).pathname.split('/').pop();
    return last ? decodeURIComponent(last) : 'avatar.jpg';
  } catch {
    return 'avatar.jpg';
  }
}

/**
 * "Edit photo" on an existing photo. `pending` is the unsaved cropped `File` currently held by the
 * form, if any. Throws when no usable picture can be found at all (the dialog shows its load
 * error and still offers "Upload new photo").
 */
export async function loadExistingAvatarSource(pending: File | null): Promise<AvatarEditSource> {
  const framing = pending ? getAvatarFraming(pending) : undefined;

  // Unsaved edit whose original lives only in memory (new upload / promoted legacy photo).
  if (framing?.original) {
    return {
      image: framing.original,
      crop: framing.crop,
      original: framing.original,
      notice: null,
    };
  }

  const result = await getAvatarEditSource({});
  if (!result.ok) throw new Error(result.error.message);
  const { original, originalUnavailable, currentUrl } = result.data;

  let notice: AvatarEditSource['notice'] = originalUnavailable ? 'originalUnavailable' : null;

  if (original) {
    try {
      const image = await fetchImageFile(original.url, 'original');
      // An unsaved re-frame (`framing` without `original`) is newer than the stored frame.
      return { image, crop: framing?.crop ?? original.crop, original: null, notice: null };
    } catch (cause) {
      console.error('[avatar] could not load the stored original, using the current photo', cause);
      notice = 'originalUnavailable';
    }
  }

  if (!currentUrl) throw new Error('No photo to edit');
  const image = await fetchImageFile(currentUrl, fileNameFromUrl(currentUrl));
  return { image, crop: null, original: image, notice };
}
