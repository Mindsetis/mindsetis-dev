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

/**
 * Minimum time (ms) between the form mounting and a submit landing on the server. Real
 * visitors need seconds to type three fields; scripted submits fire near-instantly. Paired
 * with the honeypot below — see `submitHomepageWaitlist` for how a trip is handled (silently,
 * never as a visible validation error, so a bot can't tune its way past the check).
 */
export const MIN_SUBMIT_ELAPSED_MS = 2_000;

export const homepageWaitlistSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required.')
    .max(MAX_FIRST_NAME_LENGTH, `First name must be at most ${MAX_FIRST_NAME_LENGTH} characters.`),
  email: emailSchema,
  /**
   * "LinkedIn or Instagram" — OPTIONAL (product change, stage 1.11: a visitor can join the
   * waitlist with just a name + email). A blank/whitespace-only value normalizes to
   * `undefined` so "not supplied" has exactly one representation all the way down to the
   * column's SQL NULL (see `20260806120000_homepage_waitlist_optional_social_link.sql`).
   *
   * When a link IS supplied it's still a real link, not necessarily typed with a scheme
   * (visitors commonly paste `linkedin.com/in/...` without `https://`). Bare domains/paths
   * are accepted and normalized by prefixing `https://` before the http(s)-only check, so a
   * stored value is always a real absolute URL.
   */
  socialLink: z
    .string()
    .trim()
    .max(MAX_SOCIAL_LINK_LENGTH, 'That link is too long.')
    .transform((value) => {
      if (!value) return undefined;
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    })
    .refine((value) => value === undefined || isHttpUrl(value), {
      message: 'Enter a valid LinkedIn or Instagram link.',
    })
    .optional(),

  /**
   * Honeypot — a field no human ever sees (visually hidden, `tabIndex={-1}`,
   * `autoComplete="off"`, `aria-hidden`), named to look attractive to a naive form-filling
   * bot. Any non-empty value means the submitter was not a person. Deliberately NOT rejected
   * with a validation error here: the Server Action treats a trip as a fake success, so the
   * bot gets a 200 and never learns which field burned it.
   */
  company: z.string().max(MAX_SOCIAL_LINK_LENGTH).optional(),

  /**
   * Epoch-ms timestamp stamped when the form mounted in the browser, used for the
   * minimum-elapsed-time check (`MIN_SUBMIT_ELAPSED_MS`). Client-supplied and therefore
   * forgeable by a determined attacker — this is a cheap filter for unsophisticated bots,
   * NOT a substitute for the IP rate limit.
   */
  formLoadedAt: z.number().int().positive().optional(),
});
export type HomepageWaitlistInput = z.infer<typeof homepageWaitlistSchema>;
