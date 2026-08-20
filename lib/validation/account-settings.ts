/**
 * Cabinet → Settings boundary schemas.
 *
 * Separate from `lib/validation/auth.ts` because the flows differ in what they can assume:
 * `resetPasswordSchema` runs on a recovery session where possession of the mailbox IS the proof of
 * ownership, so it never asks for the old password. Here the caller is an ordinary signed-in user,
 * and a session alone is weaker evidence (an unattended laptop is enough), so the current password
 * is required and re-checked server-side.
 */
import { z } from 'zod';

import { passwordSchema, passwordSignInSchema } from './common';
import { vmsg } from './messages';

export const changePasswordSchema = z
  .object({
    // Presence-only, exactly like sign-in: this is an EXISTING password, so applying today's
    // policy to it would reject accounts created under an older, weaker one — and the real check
    // is the server's re-authentication anyway.
    currentPassword: passwordSignInSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: vmsg('passwordsMismatch'),
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: vmsg('passwordUnchanged'),
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
