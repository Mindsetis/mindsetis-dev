/**
 * "Help & Support" dialog (account menus) — boundary schemas, shared by the dialog
 * (`components/support/HelpSupportDialog.tsx`) and the `submitHelpSupport` Server Action
 * (`app/[locale]/(app)/support/actions.ts`).
 *
 * Two layers: the FORM schema is what the user types (email + message); the ACTION schema adds the
 * page the dialog was opened from, which the client sends silently. Device/browser, user id and UI
 * language are NOT in either — the action takes those from the request/session itself.
 */
import { z } from 'zod';

import { vmsg } from './messages';

/** Plenty for a support request, small enough that one message can't bloat a mailbox or a queue row. */
export const MAX_SUPPORT_MESSAGE_LENGTH = 5000;
/** RFC 5321 address limit — same ceiling `emailSchema` uses. */
export const MAX_SUPPORT_EMAIL_LENGTH = 254;
/** Pathname + search of the page the dialog was opened from; informational only. */
export const MAX_SUPPORT_PAGE_LENGTH = 1000;

/**
 * One message for empty AND malformed ("Please enter a valid email."), unlike the shared
 * `emailSchema` (which says "Email is required." / "Enter a valid email address.") — the support
 * form's copy is specified as a single line.
 */
const supportEmail = z
  .string()
  .trim()
  .min(1, vmsg('supportEmailInvalid'))
  .max(MAX_SUPPORT_EMAIL_LENGTH, vmsg('supportEmailInvalid'))
  .email(vmsg('supportEmailInvalid'))
  .toLowerCase();

export const helpSupportFormSchema = z.object({
  email: supportEmail,
  message: z
    .string()
    .trim()
    .min(1, vmsg('supportMessageRequired'))
    .max(
      MAX_SUPPORT_MESSAGE_LENGTH,
      vmsg('supportMessageMax', { max: MAX_SUPPORT_MESSAGE_LENGTH }),
    ),
});
export type HelpSupportFormInput = z.infer<typeof helpSupportFormSchema>;

export const helpSupportActionSchema = helpSupportFormSchema.extend({
  /** `pathname + search` of the current page. Optional and never trusted for anything but display. */
  page: z.string().max(MAX_SUPPORT_PAGE_LENGTH).optional(),
});
export type HelpSupportActionInput = z.infer<typeof helpSupportActionSchema>;
