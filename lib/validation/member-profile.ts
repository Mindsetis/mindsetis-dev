/**
 * Member-profile boundary schema — registration wizard step 2/4 ("Member profile", Figma
 * `71:452` mobile / `387:2142` desktop). `memberProfileSchema` is shared between the client
 * form (`zodResolver`) and the Server Action, so both sides agree on required-vs-optional
 * exactly as marked on the Figma frame (`*` = required).
 *
 * `memberProfileActionSchema` (bottom of file) is a THIN WRAPPER used only by the Server
 * Action, not the client resolver: it normalizes raw `FormData` values (repeated keys become
 * arrays; a single occurrence stays a bare string) into real arrays before delegating to
 * `memberProfileSchema`. Deliberately not folded into `memberProfileSchema` itself — wrapping
 * even one field in `z.preprocess` makes that field's inferred *input* type `unknown`, which
 * breaks `@hookform/resolvers`' `Resolver<Input, Context, Output>` typing against
 * `useForm<MemberProfileInput>()` (a real, previously-hit type error) — so the raw-FormData
 * coercion is isolated to the server-only wrapper instead.
 */
import { z } from 'zod';

import { LANGUAGE_VALUES } from '@/lib/constants/languages';

import { usernameSchema } from './common';

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // matches the `avatars` bucket's file_size_limit
export const ACCEPTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
export const MAX_INTERESTS = 10;
export const MAX_BIO_LENGTH = 300;
export const MAX_ABOUT_LENGTH = 300;

/**
 * Optional social URL: a real URL, or an empty string (the RHF default before the user
 * types anything) — `.optional()` alone only special-cases `undefined`, not `''`, so an
 * untouched field would otherwise fail `.url()`. No `z.preprocess` involved (see file
 * header), so the field's inferred input type stays a concrete `string`, not `unknown`.
 */
const optionalUrlSchema = z
  .union([z.literal(''), z.string().trim().url('Enter a valid URL.')])
  .optional();

export const memberProfileSchema = z.object({
  username: usernameSchema,
  country: z.string().trim().min(1, 'Country is required.').max(120, 'Country is too long.'),
  city: z.string().trim().min(1, 'City is required.').max(120, 'City is too long.'),
  languages: z
    .array(z.enum(LANGUAGE_VALUES))
    .min(1, 'Select at least one language.')
    .max(LANGUAGE_VALUES.length),
  bio: z
    .string()
    .trim()
    .min(1, 'Bio is required.')
    .max(MAX_BIO_LENGTH, `Bio must be at most ${MAX_BIO_LENGTH} characters.`),
  about: z
    .string()
    .max(MAX_ABOUT_LENGTH, `About must be at most ${MAX_ABOUT_LENGTH} characters.`)
    .optional(),
  // `File` is a global in the Node 20+ runtime this app requires (engines.node in
  // package.json) as well as the browser, so this schema validates identically on both the
  // client (`zodResolver`) and the Server Action.
  avatar: z
    .instanceof(File, { message: 'Profile photo is required.' })
    .refine((file) => file.size > 0, 'Profile photo is required.')
    .refine(
      (file) => (ACCEPTED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type),
      'Only PNG or JPEG images are allowed.',
    )
    .refine((file) => file.size <= MAX_AVATAR_SIZE_BYTES, 'Image must be at most 5 MB.'),
  // Not marked `*` on the Figma frame — 0 to `MAX_INTERESTS` selections are allowed.
  interestIds: z
    .array(z.string().uuid())
    .max(MAX_INTERESTS, `You can select up to ${MAX_INTERESTS} interests.`),
  linkedin: z.string().trim().min(1, 'Linkedin URL is required.').url('Enter a valid URL.'),
  instagram: optionalUrlSchema,
  facebook: optionalUrlSchema,
  tiktok: optionalUrlSchema,
  threads: optionalUrlSchema,
  youtube: optionalUrlSchema,
  website: optionalUrlSchema,
});

export type MemberProfileInput = z.infer<typeof memberProfileSchema>;

/** Keys of the optional social-link fields, in the Figma frame's display order. */
export const OPTIONAL_SOCIAL_FIELDS = [
  'instagram',
  'facebook',
  'tiktok',
  'threads',
  'youtube',
  'website',
] as const;

/** Coerce a FormData-decoded value (string | string[] | File | undefined) into an array. */
function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Server-Action-only entry point: normalizes `languages`/`interestIds` from raw `FormData`
 * shape (repeated `formData.append(key, v)` calls decode to an array only when there's more
 * than one occurrence — see `formDataToObject` in `lib/api/action.ts`) before validating
 * with `memberProfileSchema`. See the file header for why this isn't just baked into
 * `memberProfileSchema` directly.
 */
export const memberProfileActionSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const value = raw as Record<string, unknown>;
  return {
    ...value,
    languages: toArray(value.languages),
    interestIds: toArray(value.interestIds),
  };
}, memberProfileSchema);
