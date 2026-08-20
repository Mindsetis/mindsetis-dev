/**
 * Auth boundary schemas (stage 0.6) — email + password only.
 *
 * Google OAuth is deferred; these schemas are the single source of truth for the auth
 * forms and their Server Actions.
 */
import { z } from 'zod';

import {
  emailSchema,
  isLatinOnly,
  isSafeRedirectPath,
  LATIN_ONLY_MESSAGE,
  passwordSchema,
  passwordSignInSchema,
  usernameSchema,
} from './common';
import { vmsg } from './messages';

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    username: usernameSchema.optional(),
    // `fullName` maps to `profiles.full_name` and holds only the first name (form label
    // "First name") — `last_name` is the sibling column for the surname.
    // Latin-only (see `isLatinOnly`): both names are rendered in the brand font on the public
    // profile and in the catalog, so the restriction has to start at sign-up, not just in the
    // cabinet's Hero editor — otherwise an account is created with a name the site can't draw.
    fullName: z
      .string()
      .trim()
      .min(1, vmsg('firstNameRequired'))
      .max(120, vmsg('nameMax', { max: 120 }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
    lastName: z
      .string()
      .trim()
      .min(1, vmsg('lastNameRequired'))
      .max(120, vmsg('nameMax', { max: 120 }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: vmsg('passwordsMismatch'),
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSignInSchema,
  /** Where to send the user after a successful sign-in (validated as a safe relative path). */
  redirectTo: z.string().refine(isSafeRedirectPath, vmsg('invalidRedirect')).optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Input for `resendConfirmationEmail` (`/verify-email`, stage 1.5) — email only, no session. */
export const resendConfirmationEmailSchema = z.object({
  email: emailSchema,
});
export type ResendConfirmationEmailInput = z.infer<typeof resendConfirmationEmailSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: vmsg('passwordsMismatch'),
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
