/**
 * Role/status enums shared by RBAC (stage 0.7) — account type, verification status, and
 * staff role. Single source of truth for the literal unions used across `profiles` and
 * `staff_roles`, so forms, Server Actions, and guards all agree on the same values.
 */
import { z } from 'zod';

export const accountTypeSchema = z.enum(['member', 'mindsetter']);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const verificationStatusSchema = z.enum(['unverified', 'pending', 'verified', 'rejected']);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const staffRoleSchema = z.enum(['admin', 'moderator']);
export type StaffRole = z.infer<typeof staffRoleSchema>;
