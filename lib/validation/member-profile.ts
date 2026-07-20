/**
 * Member-profile boundary schema — registration wizard step 3/4 ("Member profile", Figma
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

import { INTEREST_VALUES } from '@/lib/constants/interests';
import { LANGUAGE_VALUES } from '@/lib/constants/languages';

import { usernameSchema } from './common';

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // matches the `avatars` bucket's file_size_limit
export const ACCEPTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
export const MAX_INTERESTS = 10;
export const MAX_BIO_LENGTH = 300;
export const MAX_ABOUT_LENGTH = 300;

/**
 * `z.string().url()` accepts any scheme the WHATWG `URL` constructor parses, including
 * `javascript:`/`data:`/`vbscript:` — these social links are rendered as real `<a href>`s on
 * the public `/member/[username]` page (`components/profile/MemberProfileView.tsx`), so an
 * unrestricted scheme here is a stored-XSS vector (security-auditor finding, stage 1.6).
 * Restrict to `http:`/`https:` only.
 */
function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Optional social URL: a real http(s) URL, or an empty string (the RHF default before the
 * user types anything) — `.optional()` alone only special-cases `undefined`, not `''`, so an
 * untouched field would otherwise fail `.url()`. No `z.preprocess` involved (see file
 * header), so the field's inferred input type stays a concrete `string`, not `unknown`.
 */
const optionalUrlSchema = z
  .union([
    z.literal(''),
    z.string().trim().url('Enter a valid URL.').refine(isHttpUrl, 'Enter a valid URL.'),
  ])
  .optional();

/**
 * `File` is a global in the Node 20+ runtime this app requires (engines.node in
 * package.json) as well as the browser, so this schema validates identically on both the
 * client (`zodResolver`) and the Server Action.
 *
 * Always `.optional()` at the shape level — regardless of `avatarRequired` below — so
 * `MemberProfileInput['avatar']` has one stable type (`File | undefined`) whether or not a
 * photo is mandatory for a given render of the form; "required" is enforced by the
 * `.superRefine` in {@link createMemberProfileSchema} instead of by this field's own
 * optionality. See that function's doc comment for why (editing a profile that already has
 * a saved `avatar_url` must not force re-picking a file).
 */
const avatarFileSchema = z
  .instanceof(File, { message: 'Profile photo is required.' })
  .refine((file) => file.size > 0, 'Profile photo is required.')
  .refine(
    (file) => (ACCEPTED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type),
    'Only PNG or JPEG images are allowed.',
  )
  .refine((file) => file.size <= MAX_AVATAR_SIZE_BYTES, 'Image must be at most 5 MB.')
  .optional();

export type MemberProfileSchemaOptions = {
  /**
   * Whether picking a photo is mandatory for this submission. Defaults to `true` (a
   * first-time step-2 submission always needs a photo). Pass `false` when the profile
   * being edited already has a saved `profiles.avatar_url` — see
   * `MemberProfileForm`'s `initialAvatarUrl` prop and `AvatarUpload` — so a user revisiting
   * this step isn't forced to re-upload a photo they've already saved.
   */
  avatarRequired?: boolean;
};

/**
 * Factory rather than a single static schema so the client form (`MemberProfileForm`) can
 * relax the avatar requirement when editing a profile that already has a saved photo, while
 * the Server Action (`memberProfileActionSchema`, below) always parses with the field
 * optional at the schema level and instead enforces "a file OR an existing `avatar_url`"
 * against the real DB row inside the handler — the server must not trust a client-supplied
 * "I already have a photo" flag for something this cheap to just look up.
 */
export function createMemberProfileSchema({
  avatarRequired = true,
}: MemberProfileSchemaOptions = {}) {
  return z
    .object({
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
      avatar: avatarFileSchema,
      // Not marked `*` on the Figma frame — 0 to `MAX_INTERESTS` selections are allowed.
      interestIds: z
        .array(z.enum(INTEREST_VALUES))
        .max(MAX_INTERESTS, `You can select up to ${MAX_INTERESTS} interests.`),
      linkedin: z
        .string()
        .trim()
        .min(1, 'Linkedin URL is required.')
        .url('Enter a valid URL.')
        .refine(isHttpUrl, 'Enter a valid URL.'),
      instagram: optionalUrlSchema,
      facebook: optionalUrlSchema,
      tiktok: optionalUrlSchema,
      threads: optionalUrlSchema,
      youtube: optionalUrlSchema,
      website: optionalUrlSchema,
    })
    .superRefine((data, ctx) => {
      if (avatarRequired && !data.avatar) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Profile photo is required.',
          path: ['avatar'],
        });
      }
    });
}

/** Default schema (avatar required) — the client resolver swaps in `avatarRequired: false`
 *  via {@link createMemberProfileSchema} when editing a profile that already has a photo. */
export const memberProfileSchema = createMemberProfileSchema();

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
 *
 * Parses with `avatarRequired: false` — a resubmission of this step legitimately omits
 * `avatar` from the `FormData` when the user didn't pick a new file (see
 * `MemberProfileForm`'s conditional `formData.append('avatar', ...)`). The action handler
 * (`saveMemberProfile`) is the one place that decides whether that's actually allowed, by
 * checking the caller's real `profiles.avatar_url` rather than trusting the client.
 */
export const memberProfileActionSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== 'object' || raw === null) return raw;
    const value = raw as Record<string, unknown>;
    return {
      ...value,
      languages: toArray(value.languages),
      interestIds: toArray(value.interestIds),
    };
  },
  createMemberProfileSchema({ avatarRequired: false }),
);
