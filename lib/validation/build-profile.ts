/**
 * Build-profile boundary schema — registration wizard step 3/4 ("What do you build?", Figma
 * "Member profile 3/4"). Shared between the client form (`zodResolver`) and the Server Action
 * (`saveBuildProfile`), same pattern as `lib/validation/member-profile.ts`.
 *
 * All three fields are plain optional text — no `*` required-markers were found on this
 * Figma step (unlike step 2), so nothing here blocks submission; an empty step-3 form is a
 * valid (if pointless) submission, same as the Zod-level looseness on `memberProfile.about`.
 */
import { z } from 'zod';

export const MAX_COMPANY_LENGTH = 120;
export const MAX_ROLE_LENGTH = 120;
export const MAX_INDUSTRY_LENGTH = 120;

export const buildProfileSchema = z.object({
  company: z
    .string()
    .trim()
    .max(MAX_COMPANY_LENGTH, `Company must be at most ${MAX_COMPANY_LENGTH} characters.`)
    .optional(),
  role: z
    .string()
    .trim()
    .max(MAX_ROLE_LENGTH, `Role must be at most ${MAX_ROLE_LENGTH} characters.`)
    .optional(),
  industry: z
    .string()
    .trim()
    .max(MAX_INDUSTRY_LENGTH, `Industry must be at most ${MAX_INDUSTRY_LENGTH} characters.`)
    .optional(),
});

export type BuildProfileInput = z.infer<typeof buildProfileSchema>;
