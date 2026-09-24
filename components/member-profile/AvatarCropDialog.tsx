'use client';

import imageCompression, { type Options as CompressionOptions } from 'browser-image-compression';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cropImageToFile } from '@/lib/media/crop-image';

/**
 * Client-side compression applied to the already-cropped (square) avatar, right before it's
 * handed to the form as the field's `File` value.
 *
 * - `maxWidthOrHeight: 1280` — the photo isn't only a small circular avatar: the public profile
 *   page (`MemberProfileView`) renders the SAME `avatar_url` as a hero image up to `608px` CSS-wide
 *   (`lg:max-w-[608px]`), which is ~1216px on a 2x/retina screen. 1280 covers that with a little
 *   headroom while still being far below the bucket's 5 MB cap once compressed.
 * - `maxSizeMB: 1` — well under `MAX_AVATAR_SIZE_BYTES` (5 MB, matches the `avatars` bucket), so a
 *   compression pass that slightly overshoots its target still clears the server's hard limit.
 * - `initialQuality: 0.85` — a high starting quality; the library only steps it down further if
 *   `maxSizeMB` isn't met on the first pass, which a 1280×1280 photo rarely needs.
 * - `useWebWorker: false` — the library's worker path does NOT bundle its own code: it posts to a
 *   blob-URL worker that calls `self.importScripts()` on a **public jsdelivr CDN URL** by default
 *   (see `libURL` in its typings) unless the caller self-hosts that same bundle. That's an
 *   external network dependency this app doesn't otherwise have in a client bundle, and it would
 *   silently break compression the moment that CDN is unreachable or blocked by a future CSP. A
 *   single already-cropped, already-square image compresses fast enough on the main thread
 *   (bounded by the `isProcessing` spinner below) that the worker's benefit isn't worth that risk.
 * - `fileType` intentionally omitted — defaults to the source file's own MIME type, which is
 *   already restricted to `ACCEPTED_AVATAR_MIME_TYPES` by the pick step, so the output never
 *   drifts to a format the Zod schema (or the bucket) wasn't told to expect.
 */
export const AVATAR_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidthOrHeight: 1280,
  maxSizeMB: 1,
  initialQuality: 0.85,
  useWebWorker: false,
};

type AvatarCropDialogProps = {
  /** The just-picked raw file to crop, or `null` when the dialog should be closed. */
  file: File | null;
  /** Cancel — the caller must NOT treat this as a new value; the previous state (no file, or the
   *  already-saved photo) stays exactly as it was. */
  onCancel: () => void;
  /** Confirm — receives the final cropped + compressed `File`, ready to become the form's value. */
  onConfirm: (file: File) => void;
};

/**
 * 1:1 crop step between "a file was picked" and "the form has a value" (Release-1 F1/F2).
 *
 * Built on the shared `Dialog` (not a bespoke overlay) so it gets the UI Kit's existing
 * focus-trap, `Esc`-to-close and `DialogTitle`/`DialogDescription` a11y wiring for free. Closing
 * it any way other than "Use photo" — the ✕, `Esc`, an overlay click, or the Cancel button — all
 * funnel through `onOpenChange`/`onCancel` and never touch the form value.
 *
 * This outer component owns nothing but the `Dialog` itself: all the crop/zoom/error STATE lives
 * in `AvatarCropStage` below, which is only ever rendered while `file` is set. That means every
 * new pick mounts a brand-new `AvatarCropStage` — a fresh `useState` slate — instead of an effect
 * resetting old state on top of it, which is both simpler and keeps every `setState` call out of
 * an effect body (`react-hooks/set-state-in-effect`).
 */
export function AvatarCropDialog({ file, onCancel, onConfirm }: AvatarCropDialogProps) {
  return (
    <Dialog
      open={Boolean(file)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        {file ? <AvatarCropStage file={file} onCancel={onCancel} onConfirm={onConfirm} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type AvatarCropStageProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

function AvatarCropStage({ file, onCancel, onConfirm }: AvatarCropStageProps) {
  const t = useTranslations('auth.memberProfile.photo.crop');

  // `imageSrc` is a DATA URL (`FileReader.readAsDataURL`), not an object URL — deliberately.
  // React StrictMode mounts every component twice in dev (mount → cleanup → mount), and an
  // object URL created once via a lazy `useState` initializer is created exactly once: the
  // FIRST mount's cleanup would `revokeObjectURL` it, and the SECOND mount reuses that same
  // already-initialized state rather than creating a fresh one — leaving the `<img>` pointing at
  // a dead `blob:` URL (`ERR_FILE_NOT_FOUND`), caught live 2026-09-20. A data URL has no matching
  // "release" call for an early cleanup to invalidate, so there is nothing to go stale.
  // Read progress/result lands in state from the `FileReader`'s own `onload`/`onerror`
  // callbacks — an external system reporting back — not synchronously in the effect body, so
  // this doesn't trip `react-hooks/set-state-in-effect` either.
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Sourced from the Cropper's own `onMediaLoaded` — a data URL existing only means the FILE was
  // read, not that the browser successfully decoded it as an image. The confirm button gates on
  // THIS, not on `imageSrc`, so a corrupt-but-readable file can never be confirmed as a blank
  // square (live-tested regression, 2026-09-20).
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (cancelled) return;
      if (typeof reader.result === 'string') setImageSrc(reader.result);
      else setLoadError(true);
    };
    reader.onerror = () => {
      if (!cancelled) setLoadError(true);
    };
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [file]);

  const canConfirm = mediaLoaded && Boolean(croppedAreaPixels) && !loadError;

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !canConfirm) return;

    setIsProcessing(true);
    setError(null);
    try {
      const cropped = await cropImageToFile(imageSrc, croppedAreaPixels, file);
      // Typed as `Blob`, not `File`, on purpose: the library's own types claim `Promise<File>`,
      // which is what made this bug invisible to the compiler in the first place. Widening it here
      // is the honest shape AND what keeps the `instanceof` check below from being narrowed away as
      // unreachable.
      const compressed: Blob = await imageCompression(cropped, AVATAR_COMPRESSION_OPTIONS);
      // `browser-image-compression` TYPES its result as `File`, but its bundle never calls
      // `new File(...)` anywhere (checked: zero occurrences in `dist/browser-image-compression.mjs`)
      // — what it actually resolves is a plain `Blob`. The schema guards the avatar field with
      // `z.instanceof(File)`, so handing that straight to the form failed validation with
      // "Profile photo is required." the instant a crop was confirmed, and the form refused to
      // submit at all (live-caught 2026-09-20). Re-wrapping restores a real `File` — and the
      // `instanceof` check keeps this correct if the library ever starts returning one.
      const finalFile =
        compressed instanceof File
          ? compressed
          : new File([compressed], cropped.name, {
              type: compressed.type || cropped.type,
              lastModified: Date.now(),
            });
      onConfirm(finalFile);
    } catch (cause) {
      // Cropping/compression failing must not silently hand a broken (or the original,
      // un-cropped) file to the form — surface it and let the member retry or cancel instead.
      // Logged as well as shown: the visible message is deliberately generic, so without this
      // there would be nothing to look at when someone reports "it just says try again".
      console.error('[AvatarCropDialog] crop/compress failed', cause);
      setError(t('error'));
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>

      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
        {loadError ? (
          <p
            role="alert"
            className="flex h-full items-center justify-center px-6 text-center text-tiny text-destructive"
          >
            {t('loadError')}
          </p>
        ) : imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
            onMediaLoaded={() => setMediaLoaded(true)}
            // `<img>`/`<video>` props pass straight through to the element react-easy-crop
            // renders — the one way to catch "browser couldn't decode this as an image" (a
            // readable-but-corrupt file) here, since react-easy-crop has no `onError` prop of
            // its own.
            mediaProps={{ onError: () => setLoadError(true) }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="avatar-crop-zoom" className="text-tiny text-muted-foreground">
          {t('zoom')}
        </label>
        <input
          id="avatar-crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          disabled={!mediaLoaded}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label={t('zoom')}
          className="w-full accent-primary disabled:opacity-50"
        />
      </div>

      {error ? (
        <p role="alert" className="text-tiny text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          {t('cancel')}
        </Button>
        <Button
          type="button"
          variant="primaryOutline"
          loading={isProcessing}
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          {t('confirm')}
        </Button>
      </DialogFooter>
    </>
  );
}
