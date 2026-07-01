/**
 * Auth boundary schemas (stage 0.6) — email + password only.
 *
 * Google OAuth is deferred; these schemas are the single source of truth for the auth
 * forms and their Server Actions.
 */
import { z } from 'zod';

import {
  emailSchema,
  isSafeRedirectPath,
  passwordSchema,
  passwordSignInSchema,
  usernameSchema,
} from './common';

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    username: usernameSchema.optional(),
    fullName: z.string().trim().max(120, 'Name is too long.').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSignInSchema,
  /** Where to send the user after a successful sign-in (validated as a safe relative path). */
  redirectTo: z.string().refine(isSafeRedirectPath, 'Invalid redirect.').optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
