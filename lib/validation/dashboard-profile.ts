/**
 * Cabinet ("My Profile") boundary schemas — the two Member-side section editors, Hero and Social
 * links (Figma `613:4445` / `613:4606`).
 *
 * Both are COMPOSED from the wizard's existing field definitions (`memberProfileCoreFields`,
 * `socialLinkFields`, `buildProfileFields`) rather than restating any validation rule, so a change
 * to, say, the bio limit or the URL scheme allow-list lands in both places at once. The cabinet's
 * Hero form spans two wizard steps — sign-up's names, step 3's profile fields, step 4's
 * company/role/industries — because that's exactly what the Figma Hero frame renders, in that
 * order.
 *
 * `*ActionSchema` variants mirror `memberProfileActionSchema`'s trick: a `z.preprocess` wrapper
 * used ONLY by the Server Action, to normalize raw `FormData` (a key appended once decodes to a
 * bare string, twice or more to an array) into real arrays. It stays out of the base schema
 * because wrapping a field in `z.preprocess` makes its inferred INPUT type `unknown`, which breaks
 * `@hookform/resolvers` typing against `useForm<Input>()` — see `member-profile.ts`'s header.
 */
import { z } from 'zod';

import { buildProfileFields, refineIndustryCustom } from './build-profile';
import { isLatinOnly, LATIN_ONLY_MESSAGE } from './common';
import { memberProfileCoreFields, socialLinkFields } from './member-profile';
import { vmsg } from './messages';

export const MAX_NAME_LENGTH = 120;

/**
 * First/second name — collected at sign-up (`lib/validation/auth.ts`) and, until the cabinet
 * existed, editable nowhere afterwards. Same rules as there: required, trimmed, 120 chars.
 * `full_name` holds the FIRST name only (the column predates the split; see that file's note).
 */
const nameFields = {
  fullName: z
    .string()
    .trim()
    .min(1, vmsg('firstNameRequired'))
    .max(MAX_NAME_LENGTH, vmsg('nameMax', { max: MAX_NAME_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  lastName: z
    .string()
    .trim()
    .min(1, vmsg('lastNameRequired'))
    .max(MAX_NAME_LENGTH, vmsg('nameMax', { max: MAX_NAME_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
} as const;

export type HeroSchemaOptions = {
  /**
   * Whether picking a photo is mandatory for this submission — `false` when the profile already
   * has a saved `avatar_url`, so editing Hero doesn't force re-uploading an existing photo. Same
   * contract as `createMemberProfileSchema`; the Server Action always parses with `false` and
   * re-checks the real DB row itself rather than trusting a client-supplied "I have one" flag.
   */
  avatarRequired?: boolean;
};

export function createHeroSchema({ avatarRequired = false }: HeroSchemaOptions = {}) {
  return z
    .object({
      ...nameFields,
      ...memberProfileCoreFields,
      ...buildProfileFields,
    })
    .superRefine((data, ctx) => {
      if (avatarRequired && !data.avatar) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vmsg('avatarRequired'),
          path: ['avatar'],
        });
      }
      // Same Other/industryCustom cross-field rule `buildProfileSchema` applies — this schema
      // composes `buildProfileFields` directly rather than nesting `buildProfileSchema` itself
      // (nesting would double the `.superRefine` avatar/industries concerns), so it re-applies
      // the shared helper instead of re-deriving the rule.
      refineIndustryCustom(data, ctx);
    });
}

export const heroSchema = createHeroSchema();
export type HeroInput = z.infer<typeof heroSchema>;

/** Coerce a FormData-decoded value (string | string[] | File | undefined) into an array. */
function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

export const heroActionSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== 'object' || raw === null) return raw;
    const value = raw as Record<string, unknown>;
    return {
      ...value,
      languages: toArray(value.languages),
      interestIds: toArray(value.interestIds),
      industries: toArray(value.industries),
    };
  },
  createHeroSchema({ avatarRequired: false }),
);

export const socialLinksSchema = z.object(socialLinkFields);
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

/**
 * No `FormData` normalization needed — every social field is a single scalar — but the Server
 * Action still parses through its own named export so the boundary is explicit and symmetric with
 * `heroActionSchema`.
 */
export const socialLinksActionSchema = socialLinksSchema;
