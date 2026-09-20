/**
 * Build-profile boundary schema — registration wizard step 4/4 ("What do you build?", Figma
 * "Member profile 3/4"). Shared between the client form (`zodResolver`) and the Server Action
 * (`saveBuildProfile`), same pattern as `lib/validation/member-profile.ts`.
 *
 * Stage 1.4 Figma audit: all three fields carry `*` required-markers on this frame (missed in
 * the original stage 1.2 pass), so they're required here too — `company`/`role` stay plain
 * text. `industries` (Release-1 E1/E2/E3: `profiles.industry` → `profiles.industries text[]` +
 * `profiles.industry_custom`) is a MULTI-select validated against the fixed `INDUSTRY_VALUES`
 * catalog (`lib/constants/industries.ts`) via `z.array(z.enum(...))`, same pattern as
 * `languages`/`interestIds` in `lib/validation/member-profile.ts` — the picker only ever offers
 * catalog values, so the Server Action boundary must reject anything else too (a direct call
 * bypassing the UI must not be able to write an arbitrary string into `profiles.industries`).
 *
 * `industryCustom` is the free-text "Other" value (Release-1 E3): required when `industries`
 * includes `OTHER_INDUSTRY_VALUE`, forbidden (must be empty) otherwise — enforced by
 * `refineIndustryCustom`, applied via `.superRefine` on every schema that composes
 * `buildProfileFields` (this file's `buildProfileSchema` and the cabinet's `createHeroSchema` in
 * `dashboard-profile.ts`). The DB never lets the client set `profiles.industry_custom_status`
 * directly (staff-only trigger, `20260920093000_profiles_multi_industry.sql`) — this schema has
 * no opinion on that column at all.
 */
import { z } from 'zod';

import { INDUSTRY_VALUES, OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries';

import { isLatinOnly, LATIN_ONLY_MESSAGE } from './common';
import { vmsg } from './messages';

export const MAX_COMPANY_LENGTH = 120;
export const MAX_ROLE_LENGTH = 120;
/** Up to 3 catalog industries per profile — mirrors the DB's `industries_valid()` cap. */
export const MAX_INDUSTRIES = 3;
/** Mirrors the DB's `profiles_industry_custom_length` check. */
export const MAX_INDUSTRY_CUSTOM_LENGTH = 60;

/**
 * Exported as a shape (not just the assembled schema) so the cabinet's Hero editor can compose
 * these fields with the step-3 ones into a single form — the Figma cabinet frame merges both
 * wizard steps into one "Hero" section. Pure refactor otherwise: `buildProfileSchema` below is
 * the same fields it always was, plus the E2/E3 industries rework.
 */
export const buildProfileFields = {
  company: z
    .string()
    .trim()
    .min(1, vmsg('companyRequired'))
    .max(MAX_COMPANY_LENGTH, vmsg('companyMax', { max: MAX_COMPANY_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  role: z
    .string()
    .trim()
    .min(1, vmsg('roleRequired'))
    .max(MAX_ROLE_LENGTH, vmsg('roleMax', { max: MAX_ROLE_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  industries: z
    .array(z.enum(INDUSTRY_VALUES))
    .min(1, vmsg('industriesRequired'))
    .max(MAX_INDUSTRIES, vmsg('industriesMax', { max: MAX_INDUSTRIES }))
    .refine((values) => new Set(values).size === values.length, vmsg('industriesDuplicate')),
  // Free text for the "Other" catalog entry — optional at the shape level (a picker that never
  // selects `other` submits `''`/`undefined`); `refineIndustryCustom` below is what actually
  // makes it required-when-Other/forbidden-otherwise, the same "shape stays permissive, a
  // superRefine enforces the real rule" split `createMemberProfileSchema` uses for `avatar`.
  industryCustom: z
    .string()
    .trim()
    .max(MAX_INDUSTRY_CUSTOM_LENGTH, vmsg('industryCustomMax', { max: MAX_INDUSTRY_CUSTOM_LENGTH }))
    .optional(),
} as const;

/**
 * Cross-field rule for `industries`/`industryCustom`, factored out so every schema built from
 * `buildProfileFields` (this file's `buildProfileSchema`, the cabinet's `createHeroSchema`)
 * applies the exact same check via its own `.superRefine` rather than re-deriving it.
 */
export function refineIndustryCustom(
  data: { industries: readonly string[]; industryCustom?: string },
  ctx: z.RefinementCtx,
): void {
  const hasOther = data.industries.includes(OTHER_INDUSTRY_VALUE);
  const trimmed = data.industryCustom?.trim() ?? '';

  if (hasOther && !trimmed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: vmsg('industryCustomRequired'),
      path: ['industryCustom'],
    });
  }

  if (!hasOther && trimmed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: vmsg('industryCustomNotAllowed'),
      path: ['industryCustom'],
    });
  }
}

export const buildProfileSchema = z.object(buildProfileFields).superRefine(refineIndustryCustom);

export type BuildProfileInput = z.infer<typeof buildProfileSchema>;
