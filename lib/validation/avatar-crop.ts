/**
 * Shared contract for the Facebook-style re-crop of the profile photo (Release 2, "Правки 3.0").
 *
 * The cropped avatar is still what the site renders (`avatars/{uid}/avatar.{ext}` → `avatar_url`).
 * To let a member re-frame it later WITHOUT re-uploading, the UNCROPPED original is kept in the
 * PRIVATE `avatar-originals` bucket and the frame they chose is stored next to it:
 *   - `profiles.avatar_original_path` — always exactly {@link avatarOriginalPath}`(profile id)`;
 *   - `profiles.avatar_crop`          — `{x, y, width, height}` in PERCENT (0..100) of the original,
 *     i.e. react-easy-crop's `croppedArea`, which it accepts back as
 *     `initialCroppedAreaPercentages` (position AND zoom restored from that one rectangle).
 *
 * This file is imported by BOTH sides (the crop dialog in the browser, the Server Actions), so it
 * stays free of `server-only` / browser-only imports. The DB mirrors these rules with CHECK
 * constraints (`avatar_crop_valid()` and friends, migration `20261031132359`) — a 23514 from
 * Postgres means a writer bypassed this file.
 */
import { z } from 'zod';

/** Private bucket holding the uncropped originals (owner-only RLS, no public read). */
export const AVATAR_ORIGINALS_BUCKET = 'avatar-originals';

/**
 * The ONE object name used inside a member's folder. Fixed on purpose (no extension, no
 * timestamp): `upload(..., { upsert: true })` then replaces the previous original instead of
 * accumulating orphans, and the server never has to trust a client-supplied path — it derives
 * this value itself from the authenticated user id.
 */
export const AVATAR_ORIGINAL_FILENAME = 'original';

export function avatarOriginalPath(userId: string): string {
  return `${userId}/${AVATAR_ORIGINAL_FILENAME}`;
}

/**
 * Decimals kept when persisting the frame. 4 decimals of a percent is ~0.0001% of the image edge
 * (a fraction of a pixel even on a 2560px original) — plenty — while keeping the jsonb tidy.
 */
const CROP_DECIMALS = 4;

/**
 * Same tolerance as the DB helper `avatar_crop_valid()` (`x + width <= 100.01`): react-easy-crop
 * reports floats such as `100.00000000000001`. {@link normalizeAvatarCrop} clamps below this, so
 * the tolerance only matters for payloads from outside the dialog.
 */
const CROP_EDGE_TOLERANCE = 0.01;

export const avatarCropSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().gt(0).max(100),
    height: z.number().gt(0).max(100),
  })
  // `.strict()`: exactly these four keys — the DB column rejects extras too, and the value is
  // readable by anyone who can read the profile row, so it must not become a junk drawer.
  .strict()
  .refine(
    (crop) =>
      crop.x + crop.width <= 100 + CROP_EDGE_TOLERANCE &&
      crop.y + crop.height <= 100 + CROP_EDGE_TOLERANCE,
    { message: 'Crop rectangle must stay inside the image.' },
  );

export type AvatarCrop = z.infer<typeof avatarCropSchema>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  const factor = 10 ** CROP_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Turns react-easy-crop's raw `croppedArea` (floats, occasionally a hair outside 0..100) into a
 * value the DB CHECK will accept: rounded, clamped to [0, 100], and with the rectangle forced to
 * stay inside the image. Non-finite input (never expected) falls back to the full image.
 */
export function normalizeAvatarCrop(area: {
  x: number;
  y: number;
  width: number;
  height: number;
}): AvatarCrop {
  const finite = [area.x, area.y, area.width, area.height].every(Number.isFinite);
  if (!finite) return { x: 0, y: 0, width: 100, height: 100 };

  const minSize = 1 / 10 ** CROP_DECIMALS;
  const x = clamp(round(area.x), 0, 100 - minSize);
  const y = clamp(round(area.y), 0, 100 - minSize);
  const width = clamp(round(area.width), minSize, 100 - x);
  const height = clamp(round(area.height), minSize, 100 - y);
  return { x, y, width, height };
}

/**
 * `avatarCrop` as it travels in the Server Action's `FormData`: a JSON string. Server-side only
 * (it transforms) — it is composed onto the action schemas with `.and(...)` instead of being
 * added to the shared form shapes, because a transform would turn that field's inferred INPUT
 * type into `unknown` and break the `useForm<...>` resolver typing those shapes document.
 */
export const avatarCropActionFields = z.object({
  avatarCrop: z
    .string()
    .max(200)
    .transform((raw, ctx): AvatarCrop => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid photo frame.' });
        return z.NEVER;
      }
      const result = avatarCropSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid photo frame.' });
        return z.NEVER;
      }
      return result.data;
    })
    .optional(),
});

/**
 * `profiles.avatar_crop` is typed `Json`; this is the only way it is turned back into a typed
 * frame. Anything malformed (should be impossible given the DB CHECK) reads as "no frame".
 */
export function parseStoredAvatarCrop(value: unknown): AvatarCrop | null {
  const result = avatarCropSchema.safeParse(value);
  return result.success ? result.data : null;
}
