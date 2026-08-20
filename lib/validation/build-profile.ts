/**
 * Build-profile boundary schema — registration wizard step 4/4 ("What do you build?", Figma
 * "Member profile 3/4"). Shared between the client form (`zodResolver`) and the Server Action
 * (`saveBuildProfile`), same pattern as `lib/validation/member-profile.ts`.
 *
 * Stage 1.4 Figma audit: all three fields carry `*` required-markers on this frame (missed in
 * the original stage 1.2 pass), so they're required here too — `company`/`role` stay plain
 * text, `industry` is validated against the fixed `INDUSTRY_VALUES` catalog
 * (`lib/constants/industries.ts`) via `z.enum`, same pattern as `languages`/`interests` in
 * `lib/validation/member-profile.ts` — the `Select` only ever offers catalog values, so the
 * Server Action boundary must reject anything else too (a direct call bypassing the UI must
 * not be able to write an arbitrary string to `profiles.industry`).
 */
import { z } from 'zod';

import { INDUSTRY_VALUES } from '@/lib/constants/industries';

import { isLatinOnly, LATIN_ONLY_MESSAGE } from './common';
import { vmsg } from './messages';

export const MAX_COMPANY_LENGTH = 120;
export const MAX_ROLE_LENGTH = 120;

/**
 * Exported as a shape (not just the assembled schema) so the cabinet's Hero editor can compose
 * these three fields with the step-3 ones into a single form — the Figma cabinet frame merges
 * both wizard steps into one "Hero" section. Pure refactor: `buildProfileSchema` below is the
 * same object it always was, so the wizard step is unchanged.
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
  industry: z.enum(INDUSTRY_VALUES, { message: vmsg('industryRequired') }),
} as const;

export const buildProfileSchema = z.object(buildProfileFields);

export type BuildProfileInput = z.infer<typeof buildProfileSchema>;
