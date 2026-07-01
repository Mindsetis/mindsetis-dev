/**
 * Marketing/landing-page boundary schemas (Welcome screen — Figma "Welcome Screen - 1440
 * px" / "Welcome Screen"). Both the footer newsletter form and the hero "quick start" email
 * field only ever collect a single email address, so they share one schema.
 */
import { z } from 'zod';

import { emailSchema } from './common';

export const emailCaptureSchema = z.object({
  email: emailSchema,
});
export type EmailCaptureInput = z.infer<typeof emailCaptureSchema>;
