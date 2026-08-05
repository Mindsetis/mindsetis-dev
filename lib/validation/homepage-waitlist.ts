/**
 * Homepage placeholder ("Заглушка") waitlist form — boundary schema (ROADMAP stage 1.11,
 * Figma frames `866:4823` desktop / `866:4885` mobile). Shared between the client form
 * (`zodResolver`) and the `submitHomepageWaitlist` Server Action (`app/[locale]/actions.ts`),
 * same "Zod at every boundary" pattern as `lib/validation/member-profile.ts`.
 *
 * This is a one-shot, three-required-field "notify me at launch" application feeding
 * `homepage_waitlist` (`supabase/migrations/20260805181705_homepage_waitlist.sql`) — see that
 * migration's comment for the full write-path rationale (service-role INSERT only, no client
 * policy, duplicate email rejected via `23505` rather than silently upserted).
 */
import { z } from 'zod';

import { emailSchema } from './common';

export const MAX_FIRST_NAME_LENGTH = 200;
export const MAX_SOCIAL_LINK_LENGTH = 2048;

/**
 * `true` only for an absolute `http:`/`https:` URL. Same restricted-scheme precedent as
 * `lib/validation/member-profile.ts`/`lib/validation/mindsetter.ts` (`isHttpUrl`) — this
 * value isn't rendered as a live `<a href>` anywhere yet (the field is staff-read-only, no
 * public back-office UI exists this stage), but there's no reason to accept
 * `javascript:`/`data:`/other unsafe schemes just because today's consumer happens to be a
 * database column.
 */
function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export const homepageWaitlistSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(MAX_FIRST_NAME_LENGTH, `First name must be at most ${MAX_FIRST_NAME_LENGTH} characters.`),
  email: emailSchema,
  /**
   * "LinkedIn or Instagram" — a real link, not necessarily typed with a scheme (visitors
   * commonly paste `linkedin.com/in/...` without `https://`). Bare domains/paths are
   * accepted and normalized by prefixing `https://` before the http(s)-only check, so the
   * stored value is always a real absolute URL.
   */
  socialLink: z
    .string()
    .trim()
    .min(1, 'Add your LinkedIn or Instagram link.')
    .max(MAX_SOCIAL_LINK_LENGTH, 'That link is too long.')
    .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
    .refine(isHttpUrl, 'Enter a valid LinkedIn or Instagram link.'),
});
export type HomepageWaitlistInput = z.infer<typeof homepageWaitlistSchema>;
