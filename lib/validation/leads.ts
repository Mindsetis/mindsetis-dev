/**
 * Homepage "signup intent" lead-capture boundary schema (spec §5.2, reworked stage 1.7).
 * Reworked from the stage 1.3 popup escape hatch: there is no separate name+email dialog
 * anymore — the visitor's email is captured straight from the hero's `HeroEmailCta` field
 * (email only, no `name`) on their way into `/sign-up`, and the same row later flips
 * `registered` to `true` server-side once they actually complete account registration (see
 * `signUp` in `app/[locale]/(auth)/actions.ts`). Distinct from `emailCaptureSchema`
 * (marketing.ts, footer newsletter form): this one feeds `recordSignupIntent`, which writes
 * to `leads` rather than `newsletter_emails` and never creates a Supabase Auth account.
 */
import { z } from 'zod';

import { emailSchema } from './common';

export const signupIntentSchema = z.object({
  email: emailSchema,
});
export type SignupIntentInput = z.infer<typeof signupIntentSchema>;
