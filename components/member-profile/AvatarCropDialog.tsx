'use client';

import imageCompression, { type Options as CompressionOptions } from 'browser-image-compression';
import { Loader2, Upload, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type CSSProperties, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';

import {
  type AvatarEditSource,
  loadExistingAvatarSource,
  prepareNewAvatarSource,
} from '@/components/member-profile/avatar-edit-source';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cropImageToFile } from '@/lib/media/crop-image';
import { type AvatarCrop, normalizeAvatarCrop } from '@/lib/validation/avatar-crop';
import { ACCEPTED_AVATAR_MIME_TYPES } from '@/lib/validation/member-profile';

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

/** What the editor was opened for. */
export type AvatarEditRequest =
  /** A just-picked raw file (first upload, or a replacement): downscale it, then frame it. */
  | { kind: 'new'; file: File }
  /** "Edit photo" on a photo that already exists. `pending` = the form's unsaved cropped file. */
  | { kind: 'existing'; pending: File | null };

/** What "Save" hands back. */
export type AvatarEditResult = {
  /** The new cropped (square, compressed) avatar — becomes the form field's value. */
  file: File;
  /** The frame, in percent of the original (react-easy-crop `croppedArea`). */
  crop: AvatarCrop;
  /** The picture to upload as the stored original on form save, or `null` to leave it untouched. */
  original: File | null;
};

type AvatarCropDialogProps = {
  /** What to edit, or `null` when the dialog should be closed. */
  request: AvatarEditRequest | null;
  /** Cancel — the caller must NOT treat this as a new value; the previous state (no file, or the
   *  already-saved photo) stays exactly as it was. */
  onCancel: () => void;
  /** Confirm — receives the cropped + compressed avatar `File` plus its framing. */
  onConfirm: (result: AvatarEditResult) => void;
};

/**
 * "Edit profile picture" — the Facebook-style editor (Release 2, "Правки 3.0"). It reopens on the
 * ORIGINAL photo with the frame and zoom the member chose last time, so they can re-frame without
 * re-uploading, or press "Upload new photo" to swap the picture. The frame itself is a plain square
 * (the stored file is square); a live ROUND preview under it shows how the face will land in the
 * round avatar. Where the picture comes from for each case is documented in
 * `avatar-edit-source.ts`.
 *
 * Built on the shared `Dialog` (not a bespoke overlay) so it gets the UI Kit's existing
 * focus-trap, `Esc`-to-close and `DialogTitle`/`DialogDescription` a11y wiring for free. Closing
 * it any way other than "Save" — the ✕, `Esc`, an overlay click, or the Cancel button — all
 * funnel through `onOpenChange`/`onCancel` and never touch the form value.
 *
 * This outer component owns nothing but the `Dialog` itself: all the crop/zoom/error STATE lives
 * in `AvatarCropStage` below, which is only ever rendered while `request` is set. That means every
 * new open (and every "Upload new photo" pick) mounts a brand-new `AvatarCropStage` — a fresh
 * `useState` slate — instead of an effect resetting old state on top of it.
 */
export function AvatarCropDialog({ request, onCancel, onConfirm }: AvatarCropDialogProps) {
  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      {/* `max-h` + scroll: with the extra "Upload new photo" row the content is ~600px tall, which
          would run off a short phone screen (the dialog is vertically centred, so BOTH ends — the
          title and the buttons — would become unreachable). */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto">
        {request ? (
          <AvatarEditSession request={request} onCancel={onCancel} onConfirm={onConfirm} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type SessionProps = {
  request: AvatarEditRequest;
  onCancel: () => void;
  onConfirm: (result: AvatarEditResult) => void;
};

/**
 * One open of the dialog. Holds the CURRENT request: it starts as what the caller asked for and is
 * replaced by a `new` request when the member presses "Upload new photo" inside the dialog. The
 * `key` bumps with it, so the stage underneath remounts with clean crop/zoom state.
 */
function AvatarEditSession({ request, onCancel, onConfirm }: SessionProps) {
  const [current, setCurrent] = useState<AvatarEditRequest>(request);
  const [generation, setGeneration] = useState(0);

  return (
    <AvatarCropStage
      key={generation}
      request={current}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onPickNew={(file) => {
        setCurrent({ kind: 'new', file });
        setGeneration((value) => value + 1);
      }}
    />
  );
}

type LoadedSource = AvatarEditSource & {
  /** DATA URL of `image` — see the note on `readAsDataUrl`. */
  imageSrc: string;
};

/**
 * `FileReader` → DATA URL, not an object URL — deliberately. React StrictMode mounts every
 * component twice in dev (mount → cleanup → mount), and an object URL created once and revoked in
 * the first cleanup is left dangling for the second mount (`ERR_FILE_NOT_FOUND`, caught live
 * 2026-09-20). A data URL has no matching "release" call for an early cleanup to invalidate.
 */
function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Unexpected FileReader result'));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

function isSameArea(a: Area | null, b: Area): boolean {
  return a !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * Positions the WHOLE image inside a square, round-clipped box so that exactly the frame `area`
 * (react-easy-crop's `croppedArea`: x/y/width/height in percent of the original) fills the box.
 *
 * All four numbers are relative to the image's own size, so one rectangle works for any aspect
 * ratio — a 1600x1000 photo has a frame of e.g. 62.5% x 100%, not a square in percent:
 *   - `width: 10000 / area.width %`   the box shows `area.width`% of the image's width, so the full
 *                                     image is 100 / (area.width / 100) times the box's width;
 *   - `height: 10000 / area.height %` likewise for the height (a different factor — that is what
 *                                     keeps a non-square image undistorted);
 *   - `translate(-x%, -y%)`           `translate` percentages are of the ELEMENT's own size, i.e. of
 *                                     the full image, which is exactly the unit `area.x`/`area.y`
 *                                     are in.
 * Returns `null` for a degenerate area (the caller then keeps showing the placeholder).
 */
function getRoundPreviewImageStyle(area: Area): CSSProperties | null {
  const { x, y, width, height } = area;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return {
    width: `${10000 / width}%`,
    height: `${10000 / height}%`,
    transform: `translate(${-x}%, ${-y}%)`,
  };
}

type RoundPreviewProps = {
  /** The same data URL the cropper shows, or `null` while there is no usable picture. */
  src: string | null;
  /** The current frame in percent, or `null` until the cropper has reported one. */
  area: Area | null;
  /** Accessible name of the preview. */
  label: string;
};

/**
 * Live round preview of the avatar. It is NOT a re-encoded canvas: it draws the very same image
 * source the cropper uses, positioned from the current frame in percent (see
 * {@link getRoundPreviewImageStyle}), so it follows every drag/zoom step at no cost. A neutral
 * silhouette placeholder stands in until the preview image has loaded — and stays if it fails.
 */
function AvatarRoundPreview({ src, area, label }: RoundPreviewProps) {
  const [status, setStatus] = useState<'pending' | 'loaded' | 'failed'>('pending');
  const imageStyle = area ? getRoundPreviewImageStyle(area) : null;
  const showImage = Boolean(src) && imageStyle !== null && status !== 'failed';

  return (
    <div
      role="img"
      aria-label={label}
      // `border` is drawn inside the 56px box, so the image maps onto the 54px padding box that
      // `overflow-hidden` clips to — the percentages above are relative to exactly that box.
      className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border bg-white/10"
    >
      {status !== 'loaded' ? (
        <User
          className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
      {showImage ? (
        // Plain <img> with a data URL, matching the cropper's own element and the other avatar
        // surfaces; `next/image` has nothing to optimise here. `max-w-none` is required: Tailwind's
        // preflight sets `img { max-width: 100% }`, which would clamp the >100% width below.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src ?? undefined}
          alt=""
          draggable={false}
          style={imageStyle ?? undefined}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
          className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
        />
      ) : null}
    </div>
  );
}

type StageProps = {
  request: AvatarEditRequest;
  onCancel: () => void;
  onConfirm: (result: AvatarEditResult) => void;
  onPickNew: (file: File) => void;
};

function AvatarCropStage({ request, onCancel, onConfirm, onPickNew }: StageProps) {
  const t = useTranslations('auth.memberProfile.photo.crop');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The latest crop rectangle (percent for the DB, pixels for the canvas). A ref, not state: it
  // changes on every frame of a drag and nothing needs to re-render for it.
  const areaRef = useRef<{ percent: Area; pixels: Area } | null>(null);
  // False once the dialog is gone, so a crop that finishes AFTER an Esc/✕ close can't still push
  // its result into the form.
  const aliveRef = useRef(true);

  const [source, setSource] = useState<LoadedSource | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Sourced from the Cropper's own `onMediaLoaded` — a data URL existing only means the FILE was
  // read, not that the browser successfully decoded it as an image. The confirm button gates on
  // THIS, not on `source`, so a corrupt-but-readable file can never be confirmed as a blank
  // square (live-tested regression, 2026-09-20).
  const [mediaLoaded, setMediaLoaded] = useState(false);
  // The frame in percent of the original, for the round preview. State (unlike `areaRef`) because
  // the preview must re-render as the frame moves; `null` until the cropper has reported one, which
  // doubles as the "a frame exists, Save is allowed" flag.
  const [previewArea, setPreviewArea] = useState<Area | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Resolve the picture: downscale a fresh pick, or fetch the stored original / current avatar.
  // Results land in state from the async continuation (an external system reporting back), not
  // synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const resolved =
          request.kind === 'new'
            ? await prepareNewAvatarSource(request.file)
            : await loadExistingAvatarSource(request.pending);
        const imageSrc = await readAsDataUrl(resolved.image);
        if (!cancelled) setSource({ ...resolved, imageSrc });
      } catch (cause) {
        console.error('[AvatarCropDialog] could not load the photo', cause);
        if (!cancelled) setLoadError(true);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [request]);

  const canConfirm =
    Boolean(source) && mediaLoaded && previewArea !== null && !loadError && !isProcessing;

  const handleConfirm = async () => {
    const area = areaRef.current;
    if (!source || !area || !canConfirm) return;

    setIsProcessing(true);
    setError(null);
    try {
      const cropped = await cropImageToFile(source.imageSrc, area.pixels, source.image);
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
      if (!aliveRef.current) return;
      onConfirm({
        file: finalFile,
        crop: normalizeAvatarCrop(area.percent),
        original: source.original,
      });
    } catch (cause) {
      // Cropping/compression failing must not silently hand a broken (or the original,
      // un-cropped) file to the form — surface it and let the member retry or cancel instead.
      // Logged as well as shown: the visible message is deliberately generic, so without this
      // there would be nothing to look at when someone reports "it just says try again".
      console.error('[AvatarCropDialog] crop/compress failed', cause);
      if (!aliveRef.current) return;
      setError(t('error'));
      setIsProcessing(false);
    }
  };

  const handleNewFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Reset so picking the same file again still fires `onChange`.
    event.target.value = '';
    if (!picked) return;

    const looksLikeImage =
      picked.size > 0 && (ACCEPTED_AVATAR_MIME_TYPES as readonly string[]).includes(picked.type);
    if (!looksLikeImage) {
      setError(t('invalidFile'));
      return;
    }
    onPickNew(picked);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>{t('description')}</DialogDescription>
      </DialogHeader>

      <div className="relative h-64 w-full overflow-hidden rounded-xl bg-black sm:h-72">
        {loadError ? (
          <p
            role="alert"
            className="flex h-full items-center justify-center px-6 text-center text-tiny text-destructive"
          >
            {t('loadError')}
          </p>
        ) : source ? (
          <Cropper
            image={source.imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            // A plain SQUARE frame with the rule-of-thirds grid (the stored file is square — the
            // public profile shows it as a big square photo). How it lands in the round avatar is
            // shown by `AvatarRoundPreview` under the image, not drawn over the frame.
            cropShape="rect"
            showGrid
            // Restores the previous position AND zoom from the saved percent rectangle. Only read
            // when the media loads, which is exactly when this stage mounts a new image.
            initialCroppedAreaPercentages={source.crop ?? undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            // `onCropAreaChange`, not `onCropComplete`: restoring a frame at zoom 1 only moves the
            // crop (no zoom change), and the library reports that through this callback alone — so
            // a restored-but-untouched frame would otherwise save the stale default one. It also
            // fires on every drag/zoom step, which is what keeps the round preview live.
            onCropAreaChange={(percent, pixels) => {
              areaRef.current = { percent, pixels };
              setPreviewArea((previous) => (isSameArea(previous, percent) ? previous : percent));
            }}
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
            <span role="status" className="sr-only">
              {t('loading')}
            </span>
          </div>
        )}
      </div>

      {source?.notice ? (
        <p role="status" className="text-tiny text-muted-foreground">
          {t('originalUnavailable')}
        </p>
      ) : null}

      {/* One row under the image: the live round preview on the left, the zoom control on the
          right — so the dialog gains the preview without growing by a whole extra row. */}
      <div className="flex items-center gap-3">
        <AvatarRoundPreview
          src={source && !loadError ? source.imageSrc : null}
          area={previewArea}
          label={t('preview')}
        />
        <label htmlFor="avatar-crop-zoom" className="shrink-0 text-tiny text-muted-foreground">
          {t('zoom')}
        </label>
        {/* `h-11` (44px): the native range thumb is only ~16px, so the input's own box is what
            gives a thumb a finger-sized target on a phone. */}
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
          className="h-11 min-w-0 flex-1 accent-primary disabled:opacity-50"
        />
      </div>

      {error ? (
        <p role="alert" className="text-tiny text-destructive">
          {error}
        </p>
      ) : null}

      {/* Not `DialogFooter`: that one stacks every button full-width (3 × 56px here), which is
          what pushes this dialog off a 667px-tall phone. Upload on its own row, Cancel / Save
          side by side; every button is `sm` = 46px tall (>= 44px touch target). */}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {t('uploadNew')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            variant="primaryOutline"
            size="sm"
            loading={isProcessing}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {t('confirm')}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_MIME_TYPES.join(',')}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleNewFilePicked}
      />
    </>
  );
}
