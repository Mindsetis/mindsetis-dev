/**
 * Build-profile boundary schema — registration wizard step 3/4 ("What do you build?", Figma
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

export const MAX_COMPANY_LENGTH = 120;
export const MAX_ROLE_LENGTH = 120;

export const buildProfileSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, 'Company is required.')
    .max(MAX_COMPANY_LENGTH, `Company must be at most ${MAX_COMPANY_LENGTH} characters.`),
  role: z
    .string()
    .trim()
    .min(1, 'Role is required.')
    .max(MAX_ROLE_LENGTH, `Role must be at most ${MAX_ROLE_LENGTH} characters.`),
  industry: z.enum(INDUSTRY_VALUES, { message: 'Please select an industry.' }),
});

export type BuildProfileInput = z.infer<typeof buildProfileSchema>;
