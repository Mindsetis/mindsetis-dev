/**
 * "Apply for Ambassadorship" popup (homepage Ambassadors section) — boundary schemas, shared by
 * the dialog (`AmbassadorApplicationDialog.tsx`) and the `submitAmbassadorApplication` Server
 * Action (`app/[locale]/actions.ts`), which writes `ambassador_applications`.
 *
 * Who is applying decides which fields matter:
 * - a GUEST types First name / Last name / Email on the last step — `ambassadorGuestContactSchema`;
 * - a signed-in Member/Mindsetter sees no fields at all: the action takes name + email from their
 *   own account server-side and ignores anything the client sent, so it can't be spoofed.
 * The action therefore accepts `contact` as optional and only enforces the guest schema when
 * there is no session.
 */
import { z } from 'zod';

import { emailSchema } from './common';
import { vmsg } from './messages';

export const MAX_AMBASSADOR_NAME_LENGTH = 200;
export const MAX_AMBASSADOR_ANSWER_LENGTH = 2000;

/** Same idea as the homepage waitlist: a submit within 2s of opening the form wasn't typed. */
export const MIN_AMBASSADOR_SUBMIT_ELAPSED_MS = 2_000;

const nameField = (requiredKey: 'firstNameRequired' | 'lastNameRequired') =>
  z
    .string()
    .trim()
    .min(1, vmsg(requiredKey))
    .max(MAX_AMBASSADOR_NAME_LENGTH, vmsg('nameMax', { max: MAX_AMBASSADOR_NAME_LENGTH }));

export const ambassadorGuestContactSchema = z.object({
  firstName: nameField('firstNameRequired'),
  lastName: nameField('lastNameRequired'),
  email: emailSchema,
});
export type AmbassadorGuestContactInput = z.infer<typeof ambassadorGuestContactSchema>;

/** The three open questions (steps 1–3). Optional — a skipped answer is stored as NULL. */
const answerField = z
  .string()
  .trim()
  .max(MAX_AMBASSADOR_ANSWER_LENGTH, vmsg('descriptionMax', { max: MAX_AMBASSADOR_ANSWER_LENGTH }))
  .optional();

export const ambassadorApplicationSchema = z.object({
  eventExperience: answerField,
  communities: answerField,
  communitiesFeedback: answerField,
  /** Guest-only; see file header. Validated strictly by the action when there's no session. */
  contact: z
    .object({
      firstName: z.string().max(MAX_AMBASSADOR_NAME_LENGTH).optional(),
      lastName: z.string().max(MAX_AMBASSADOR_NAME_LENGTH).optional(),
      email: z.string().max(254).optional(),
    })
    .optional(),
  /** Honeypot — hidden from people; any value means a bot. Fake success, see the action. */
  website: z.string().max(2048).optional(),
  /** Epoch ms when the dialog opened — the minimum-elapsed-time bot filter. Forgeable; cheap. */
  formLoadedAt: z.number().int().positive().optional(),
});
export type AmbassadorApplicationInput = z.infer<typeof ambassadorApplicationSchema>;

/**
 * Field-error marker the action returns on `contact.email` when a guest's address already has a
 * confirmed account. Not a user-facing string: the dialog swaps it for its own localized
 * "already has an account" line plus a "Log in" link.
 */
export const ACCOUNT_EXISTS_ERROR = 'ambassador:account-exists';
