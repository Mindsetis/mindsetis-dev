/**
 * "I'm on the way" lead-capture boundary schema (spec §5.2) — the standalone escape hatch
 * for visitors who are not ready to complete the full registration wizard. Distinct from
 * `emailCaptureSchema` (marketing.ts): this collects both name and email and writes
 * straight to the `leads` table, independent of the sign-up flow (no Supabase Auth account
 * is ever created here).
 */
import { z } from 'zod';

import { emailSchema } from './common';

/** Matches the DB check constraint on `leads.name` (non-empty, <= 200 chars). */
const nameSchema = z.string().trim().min(1, 'Name is required.').max(200, 'Name is too long.');

/** Fields the visitor actually fills in — used by the client-side form resolver. */
export const leadFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});
export type LeadFormInput = z.infer<typeof leadFormSchema>;

/**
 * Full `captureLead` Server Action input — deliberately identical to `leadFormSchema`, with
 * NO `source` field. `source` identifies which surface captured the lead and must be trusted
 * data: a Server Action is a directly callable HTTP endpoint (not gated behind the React
 * component that happens to call it), so accepting `source` here would let any caller forge
 * attribution data. It is hardcoded server-side per call site in `captureLead` instead — see
 * `app/[locale]/actions.ts`.
 */
export const leadCaptureSchema = leadFormSchema;
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;
