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

import { isLatinOnly, LATIN_ONLY_MESSAGE, usernameSchema } from './common';
import { vmsg } from './messages';

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // matches the `avatars` bucket's file_size_limit
export const ACCEPTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
export const MAX_INTERESTS = 10;
export const MAX_BIO_LENGTH = 300;
export const MAX_ABOUT_LENGTH = 300;

/**
 * `z.string().url()` accepts any scheme the WHATWG `URL` constructor parses, including
 * `javascript:`/`data:`/`vbscript:` — these social links are rendered as real `<a href>`s on
 * the public `/members/[username]` page (`components/profile/MemberProfileView.tsx`), so an
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
    z.string().trim().url(vmsg('urlInvalid')).refine(isHttpUrl, vmsg('urlInvalid')),
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
  .instanceof(File, { message: vmsg('avatarRequired') })
  .refine((file) => file.size > 0, vmsg('avatarRequired'))
  .refine(
    (file) => (ACCEPTED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type),
    vmsg('imageType'),
  )
  .refine(
    (file) => file.size <= MAX_AVATAR_SIZE_BYTES,
    vmsg('imageMax', { max: MAX_AVATAR_SIZE_BYTES / (1024 * 1024) }),
  )
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
/**
 * The step's own (non-social) fields, exported as a plain shape so the cabinet's Hero editor
 * (`lib/validation/dashboard-profile.ts`) can build its schema from the SAME field definitions
 * instead of restating them. Splitting these out is a pure refactor — `createMemberProfileSchema`
 * below composes exactly the object it always did, so the wizard's validation is unchanged.
 */
export const memberProfileCoreFields = {
  username: usernameSchema,
  // Location is submitted as two identifiers, never as display text. The Server Action
  // re-derives the country/city/region names and the IANA timezone from `geo_countries`
  // and `geo_cities` — a client-supplied "Kyiv" string is exactly the free-text mess the
  // code-backed picker exists to eliminate, and trusting it would let a caller write any
  // label they like onto a profile that the catalog then filters on.
  countryCode: z
    .string()
    .trim()
    .length(2, vmsg('countryRequired'))
    .regex(/^[A-Za-z]{2}$/, vmsg('countryRequired')),
  // A digit string rather than `z.coerce.number()`: coercion makes the field's inferred
  // *input* type `unknown`, which breaks the RHF resolver typing this file's header
  // documents. The Server Action converts it once, after validation.
  cityGeonameId: z
    .string()
    .trim()
    .regex(/^\d{1,12}$/, vmsg('cityRequired')),
  languages: z
    .array(z.enum(LANGUAGE_VALUES))
    .min(1, vmsg('languagesRequired'))
    .max(LANGUAGE_VALUES.length),
  bio: z
    .string()
    .trim()
    .min(1, vmsg('bioRequired'))
    .max(MAX_BIO_LENGTH, vmsg('bioMax', { max: MAX_BIO_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  // `.refine` before `.optional()`, not after: applied to the optional schema the predicate
  // would receive `undefined` for an untouched field and throw inside the regex test.
  about: z
    .string()
    .max(MAX_ABOUT_LENGTH, vmsg('aboutMax', { max: MAX_ABOUT_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE)
    .optional(),
  avatar: avatarFileSchema,
  // Not marked `*` on the Figma frame — 0 to `MAX_INTERESTS` selections are allowed.
  interestIds: z
    .array(z.enum(INTEREST_VALUES))
    .max(MAX_INTERESTS, vmsg('interestsMax', { max: MAX_INTERESTS })),
} as const;

/**
 * The social-channel fields, likewise exported so the cabinet's "Social links" section — which
 * edits exactly these and nothing else — reuses them rather than redefining the URL rules.
 */
export const socialLinkFields = {
  // The one mandatory channel is now the COMPANY WEBSITE, not LinkedIn (2026-08-05
  // product decision): a company site is the stronger signal for a member-first
  // community, and demanding LinkedIn excluded people who simply do not use it.
  website: z
    .string()
    .trim()
    .min(1, vmsg('websiteRequired'))
    .url(vmsg('urlInvalid'))
    .refine(isHttpUrl, vmsg('urlInvalid')),
  linkedin: optionalUrlSchema,
  instagram: optionalUrlSchema,
  facebook: optionalUrlSchema,
  tiktok: optionalUrlSchema,
  threads: optionalUrlSchema,
  youtube: optionalUrlSchema,
} as const;

export function createMemberProfileSchema({
  avatarRequired = true,
}: MemberProfileSchemaOptions = {}) {
  return z
    .object({
      ...memberProfileCoreFields,
      ...socialLinkFields,
    })
    .superRefine((data, ctx) => {
      if (avatarRequired && !data.avatar) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vmsg('avatarRequired'),
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
  // LinkedIn heads the optional list because the form renders the required Company Website
  // above it — so the on-screen order stays Company Website, LinkedIn, then the rest.
  'linkedin',
  'instagram',
  'facebook',
  'tiktok',
  'threads',
  'youtube',
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
