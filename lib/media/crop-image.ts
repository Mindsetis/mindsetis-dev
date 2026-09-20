/**
 * Canvas-based crop helper for `AvatarCropDialog` — `react-easy-crop` only ever reports the
 * crop rectangle (as pixels on the *natural* image), it does not produce a file itself. This
 * draws that rectangle onto an offscreen canvas and reads it back out as a `File`, which is
 * then handed to `browser-image-compression` before going anywhere near the form.
 *
 * Browser-only (uses `Image`/`document.createElement('canvas')`) — only ever called from
 * `AvatarCropDialog`, a client component.
 */

export type PixelCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image for cropping')));
    image.src = src;
  });
}

/**
 * Crops `sourceFile` (rendered at `imageSrc`, an object URL of that same file) to `area` — the
 * `croppedAreaPixels` rectangle `react-easy-crop`'s `onCropComplete` reports — and returns the
 * result as a new square `File`.
 *
 * The output keeps `sourceFile`'s own MIME type (already restricted to
 * `ACCEPTED_AVATAR_MIME_TYPES` upstream) so the file downstream — including the Zod schema — is
 * never handed a format it wasn't validated for.
 */
export async function cropImageToFile(
  imageSrc: string,
  area: PixelCropArea,
  sourceFile: File,
): Promise<File> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);

  const mimeType = sourceFile.type || 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Canvas produced an empty blob'))),
      mimeType,
      0.95,
    );
  });

  return new File([blob], sourceFile.name, { type: mimeType, lastModified: Date.now() });
}
