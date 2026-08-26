/**
 * Extended Mindsetter onboarding — boundary schemas (ROADMAP stage 1.9,
 * `docs/mindsetter-extended-onboarding.md`). One export block per wizard step, in the same
 * order the steps run (`roles` → `superpowers` → `help` → `session` → `shine`) — all five are
 * implemented as of `shine`, kept in one file so every Mindsetter-onboarding Server Action
 * shares one import path.
 *
 * Shared with both the client form (`zodResolver`) and the `roles`-step Server Action
 * (`saveRoles`) — same "Zod at every boundary" pattern as `lib/validation/member-profile.ts`.
 */
import { z } from 'zod';

import { isSupportedVideoUrl } from '@/lib/video-embed';

import { isLatinOnly, LATIN_ONLY_MESSAGE } from './common';
import { vmsg } from './messages';

// -----------------------------------------------------------------------------------------
// Step "Your roles" — stored as `mindsetter_profiles.roles` jsonb (migrated text[] -> jsonb
// in `20260718160224_mindsetter_onboarding_schema_alignment.sql`).
// -----------------------------------------------------------------------------------------

export const MAX_ROLE_TITLE_LENGTH = 40;
export const MAX_ROLE_DESCRIPTION_LENGTH = 200;
export const MAX_ROLE_LINKS = 5;
export const MIN_ROLES = 1;
export const MAX_ROLES = 10;

/** `roleLinkSchema.mediaType` — mirrors `LinkPreviewMediaType` in `lib/link-preview.ts` (kept as
 * a separate literal union here rather than importing that server-only module's type, since this
 * schema is shared with the client `zodResolver`). */
export const ROLE_LINK_MEDIA_TYPES = ['video', 'article', 'link'] as const;

export type RoleLinkMediaType = (typeof ROLE_LINK_MEDIA_TYPES)[number];

/**
 * One optional link per role. `ogTitle`/`ogImage`/`mediaType`/`siteName`/`favicon` are populated
 * by the og-scraping Server Action (`fetchRoleLinkPreview`, `lib/link-preview.ts`) once the
 * caller blurs a filled-in `url` field (see `RolesForm.tsx`) — the form itself never computes
 * them, just persists whatever that action returned via `form.setValue` so `saveRoles` writes
 * them straight through. Deliberately camelCase here (matching the rest of this TS/Zod layer)
 * even though the schema-alignment migration's own SQL comment documents the jsonb shape with
 * snake_case keys (e.g. `og_title`) — this app owns both the read and write side of this
 * brand-new field, so there is no existing consumer to stay compatible with; keep this comment
 * in sync if that ever changes.
 */
/** `true` only for an absolute `http:`/`https:` URL — shared by `url`/`ogImage`/`favicon` below.
 * Security boundary (audit finding, stage 1.10 review): all three fields are later rendered as a
 * live `<a href>`/hotlinked `<img src>`/favicon `<link>` by a caller (`MindsetterProfileView.tsx`)
 * that trusts whatever was stored, so a bare `.url()` check (which accepts ANY scheme, e.g.
 * `javascript:`/`data:`/`file:`/`vbscript:`) isn't enough — same stored-XSS class already closed
 * for `socials` in stage 1.6 (`isSafeHttpUrl`, `MemberProfileView.tsx`). This also hardens
 * `saveRoles` against a client submitting a crafted non-http URL directly, bypassing the
 * scraper's own http(s)-only filtering entirely (`absolutizeHttpUrl`, `lib/link-preview.ts`). */
function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Upper bound for a link's display title — the scraper's own og:title is capped at the same
 * value, so a hand-edited label can never be longer than a scraped one. */
export const MAX_ROLE_LINK_TITLE_LENGTH = 200;

export const roleLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, vmsg('urlInvalid'))
    .url(vmsg('urlInvalid'))
    .refine(isHttpUrl, 'must be http(s)'),
  /**
   * The link's display label — seeded by the scraper, then EDITABLE by the member (pencil on
   * the preview row, `RolesForm.tsx`). It is what the public profile renders instead of a
   * bare "Learn more", so the two sources deliberately share one field: whatever the member
   * sees in the picker is what visitors see.
   *
   * Unlike the other preview fields below it is therefore genuine client input. Safe as such:
   * it is rendered as text content, never as an `href`/`src`, and bounded here.
   */
  // Latin-only, unlike its sibling preview fields: those are scraper output, this one is typed
  // by the member and rendered on the public profile in the brand font.
  ogTitle: z
    .string()
    .trim()
    .max(MAX_ROLE_LINK_TITLE_LENGTH)
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE)
    .optional(),
  ogImage: z.string().trim().url().refine(isHttpUrl, 'must be http(s)').optional(),
  mediaType: z.enum(ROLE_LINK_MEDIA_TYPES).optional(),
  siteName: z.string().trim().max(200).optional(),
  favicon: z.string().trim().url().refine(isHttpUrl, 'must be http(s)').optional(),
});

export type RoleLink = z.infer<typeof roleLinkSchema>;

/** `fetchRoleLinkPreview`'s Server Action input — just the URL the caller blurred off of
 * (`RolesForm.tsx`); the preview fields above are never client input, only ever the action's
 * OUTPUT. */
export const roleLinkPreviewRequestSchema = z.object({
  url: z.string().trim().min(1, vmsg('urlInvalid')).url(vmsg('urlInvalid')),
});

export type RoleLinkPreviewRequest = z.infer<typeof roleLinkPreviewRequestSchema>;

export const roleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, vmsg('titleRequired'))
    .max(MAX_ROLE_TITLE_LENGTH, vmsg('titleMax', { max: MAX_ROLE_TITLE_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  description: z
    .string()
    .trim()
    .min(1, vmsg('descriptionRequired'))
    .max(MAX_ROLE_DESCRIPTION_LENGTH, vmsg('descriptionMax', { max: MAX_ROLE_DESCRIPTION_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  links: z.array(roleLinkSchema).max(MAX_ROLE_LINKS, vmsg('linksMax', { max: MAX_ROLE_LINKS })),
});

export type Role = z.infer<typeof roleSchema>;

export const rolesStepSchema = z.object({
  roles: z
    .array(roleSchema)
    .min(MIN_ROLES, vmsg('rolesRequired'))
    .max(MAX_ROLES, vmsg('rolesMax', { max: MAX_ROLES })),
});

export type RolesStepInput = z.infer<typeof rolesStepSchema>;

// -----------------------------------------------------------------------------------------
// Step "Your superpowers" — stored as `mindsetter_profiles.superpowers` jsonb (already the
// right shape, section A of the onboarding doc — no migration needed). Design fixes this at
// exactly 3 cards with no "Add" button (section 3), unlike Roles/Help's variable-length
// lists — but a brand-new caller hasn't filled all 3 yet, so the step schema only requires at
// least one filled card rather than all three, and the form always renders exactly 3 card
// slots (see `SuperpowersForm.tsx`) with the empty ones simply omitted from what's submitted.
// -----------------------------------------------------------------------------------------

export const MAX_SUPERPOWER_TITLE_LENGTH = 40;
export const MAX_SUPERPOWER_DESCRIPTION_LENGTH = 200;
export const MIN_SUPERPOWERS = 1;
export const MAX_SUPERPOWERS = 3;

/**
 * True when at least one of a superpower card's two fields has non-whitespace content — i.e.
 * the card isn't one of `SuperpowersForm.tsx`'s 3 fixed, padded-empty slots. Shared by
 * `superpowerSchema`'s own per-slot leniency (below), `superpowersStepSchema`'s
 * "at least `MIN_SUPERPOWERS` filled" check, and the form's post-parse `handleSubmit` filter
 * (drops still-empty slots from what's actually sent to `saveSuperpowers`). Takes a plain shape
 * rather than `Superpower` to avoid a circular reference — `Superpower` is inferred from
 * `superpowerSchema`, which this function is used inside of.
 */
export function isSuperpowerFilled(superpower: { title: string; description: string }): boolean {
  return superpower.title.trim().length > 0 || superpower.description.trim().length > 0;
}

/**
 * Design fixes the "Your superpowers" step at exactly 3 cards with no "Add" button (section 3),
 * unlike Roles/Help's variable-length lists — but a brand-new caller hasn't filled all 3 yet,
 * and `MIN_SUPERPOWERS` only requires ONE of the 3 filled. Rather than making `title`/
 * `description` unconditionally required (which would block submission for any caller who
 * leaves even one of the 3 fixed slots blank — the bug this schema fixes), a wholly-empty slot
 * is valid here (silently dropped before `saveSuperpowers`, see `SuperpowersForm.tsx`'s
 * `handleSubmit`); a PARTIALLY filled slot (exactly one of the two fields has content) still
 * gets a normal "required" error on whichever field is missing. Validating the padded 3-slot
 * array in place like this (rather than filtering empties out before Zod runs) keeps every
 * error's array index aligned with the actual on-screen card — filtering first would shift
 * indices whenever an earlier slot is empty and a later one isn't, misattributing the error to
 * the wrong card.
 */
export const superpowerSchema = z
  .object({
    title: z
      .string()
      .trim()
      .max(MAX_SUPERPOWER_TITLE_LENGTH, vmsg('titleMax', { max: MAX_SUPERPOWER_TITLE_LENGTH }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
    description: z
      .string()
      .trim()
      .max(
        MAX_SUPERPOWER_DESCRIPTION_LENGTH,
        vmsg('descriptionMax', { max: MAX_SUPERPOWER_DESCRIPTION_LENGTH }),
      )
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  })
  .superRefine((slot, ctx) => {
    if (!isSuperpowerFilled(slot)) return;
    if (slot.title.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: vmsg('titleRequired'),
      });
    }
    if (slot.description.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: vmsg('descriptionRequired'),
      });
    }
  });

export type Superpower = z.infer<typeof superpowerSchema>;

export const superpowersStepSchema = z
  .object({
    superpowers: z
      .array(superpowerSchema)
      .max(MAX_SUPERPOWERS, vmsg('superpowersMax', { max: MAX_SUPERPOWERS })),
  })
  .superRefine((data, ctx) => {
    // Count of ACTUALLY filled cards, not raw array length — `SuperpowersForm.tsx` always
    // submits (padded, pre-filter) or sends (post-filter) an array whose length alone doesn't
    // tell you how many slots are real.
    if (data.superpowers.filter(isSuperpowerFilled).length < MIN_SUPERPOWERS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['superpowers'],
        message: vmsg('superpowersRequired'),
      });
    }
  });

export type SuperpowersStepInput = z.infer<typeof superpowersStepSchema>;

// -----------------------------------------------------------------------------------------
// Step "You can help with" — stored as `mindsetter_profiles.help_with` jsonb (migrated
// text[] -> jsonb in the same schema-alignment migration as `roles`). No nested `links`
// sub-array here (section 4 of the onboarding doc), and these card titles later feed the
// "Topics you're expert in" multiselect on the Personal-session step (E.1) —
// kept as a plain flat array of {title, description} so that future step can read titles
// straight off it.
// -----------------------------------------------------------------------------------------

export const MAX_EXPERTISE_TITLE_LENGTH = 40;
export const MAX_EXPERTISE_DESCRIPTION_LENGTH = 200;
export const MIN_EXPERTISE = 1;
/** Capped at 5 (2026-08-05 product decision, down from 10): these titles are also what the
 * public profile renders as its "Topics I'm expert" pills, and that row stops reading as a
 * summary past about five. */
export const MAX_EXPERTISE = 5;

export const expertiseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, vmsg('titleRequired'))
    .max(MAX_EXPERTISE_TITLE_LENGTH, vmsg('titleMax', { max: MAX_EXPERTISE_TITLE_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  description: z
    .string()
    .trim()
    .min(1, vmsg('descriptionRequired'))
    .max(
      MAX_EXPERTISE_DESCRIPTION_LENGTH,
      vmsg('descriptionMax', { max: MAX_EXPERTISE_DESCRIPTION_LENGTH }),
    )
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
});

export type Expertise = z.infer<typeof expertiseSchema>;

export const helpStepSchema = z.object({
  expertise: z
    .array(expertiseSchema)
    .min(MIN_EXPERTISE, vmsg('expertiseRequired'))
    .max(MAX_EXPERTISE, vmsg('expertiseMax', { max: MAX_EXPERTISE })),
});

export type HelpStepInput = z.infer<typeof helpStepSchema>;

// -----------------------------------------------------------------------------------------
// "Sessions Setup" — maps to the `session_settings` row (mindsetter_id primary key). This was the
// wizard's last onboarding step until 2026-08-13; it now lives only in the cabinet
// (`/dashboard/sessions`), and migration `20260813113351` reshaped the columns it writes:
// `duration_min int` → `durations int[]` (several enabled lengths) and
// `available_days`/`available_from`/`available_to` → `weekly_availability jsonb` (per-day windows).
// The UI collects price in whole dollars; this schema's
// `priceCents` is already the converted integer-cents value the Server Action writes straight
// to `price_cents` — the dollars->cents math lives in `SessionsSetupForm.tsx`'s price `Input`
// `onChange`, not here, so this boundary schema only ever sees the final stored shape.
//
// `topics` options are the `mindsetter_profiles.help_with` card titles from the previous step
// (doc section E.1) PLUS whatever ad-hoc "+ Add custom" entries the caller typed in — both are
// indistinguishable plain strings by the time they reach this schema/the server, matching the
// product decision that custom topics are session-topics-only and never written back to
// `help_with`.
// -----------------------------------------------------------------------------------------

/**
 * Total topics selectable on the session step — 10 (2026-08-05 product decision, up from 5).
 *
 * The budget is deliberately split: up to 5 come from the Help step's card titles (which are
 * themselves capped at `MAX_EXPERTISE`), leaving room for up to
 * `MAX_CUSTOM_SESSION_TOPICS` ad-hoc ones. A Mindsetter who wants ten custom topics cannot
 * have them — the cap below is enforced separately, on the custom subset only.
 */
export const MAX_SESSION_TOPICS = 10;

/**
 * How many of the selected topics may be ad-hoc "+ Add custom" entries.
 *
 * "Custom" is not a stored flag — a topic is custom precisely when it is not one of this
 * Mindsetter's `help_with` titles. The form knows those titles, and so does the Server Action
 * (it reads the row), so both sides can classify without a schema change. The schema itself
 * cannot: by the time it runs, every topic is an indistinguishable string.
 */
export const MAX_CUSTOM_SESSION_TOPICS = 5;
export const MAX_TOPIC_LENGTH = 40;

/**
 * Fixed pill choices. MULTI-select since 2026-08-13 (`session_settings.durations int[]`, migration
 * `20260813113351`): the Mindsetter enables a SET of lengths and the member picks one of them when
 * booking — "Members can pick any duration you enable below", per the Sessions Setup frame
 * `1094:23946`. Previously a single `duration_min`.
 */
export const SESSION_DURATIONS = [30, 45, 60, 90] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

/** Recurring weekly-schedule days — the keys of `session_settings.weekly_availability`, and the
 * shorthand that column's own migration comment documents. Not full weekday names. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeStringSchema = z.string().regex(TIME_PATTERN, vmsg('timeInvalid'));

/** How many separate windows one weekday may carry (e.g. a morning and an afternoon block). */
export const MAX_RANGES_PER_DAY = 4;

/**
 * One bookable window. Both ends are fixed-width zero-padded 24h strings, so the ordering check
 * is a plain lexicographic comparison rather than any date maths.
 */
export const timeRangeSchema = z
  .object({ from: timeStringSchema, to: timeStringSchema })
  .refine((range) => range.to > range.from, {
    message: vmsg('timeRangeReversed'),
    path: ['to'],
  });
export type TimeRange = z.infer<typeof timeRangeSchema>;

/**
 * `session_settings.weekly_availability` — a day → windows map, where a missing key or an empty
 * array means "unavailable that day" (Sessions Setup shows those days with the toggle off and an
 * "Unavailable" label).
 *
 * Every weekday key is required here even though the column tolerates absent ones: the form always
 * renders all seven rows, so a partial object could only come from a hand-crafted request.
 * Overlapping windows within a day are rejected — two overlapping ranges would generate duplicate
 * bookable slots for the same minutes.
 */
export const weeklyAvailabilitySchema = z
  .object(
    Object.fromEntries(
      WEEKDAYS.map((day) => [
        day,
        z
          .array(timeRangeSchema)
          .max(MAX_RANGES_PER_DAY, vmsg('timeRangesMax', { max: MAX_RANGES_PER_DAY })),
      ]),
    ) as Record<Weekday, z.ZodArray<typeof timeRangeSchema>>,
  )
  .superRefine((availability, ctx) => {
    for (const day of WEEKDAYS) {
      const ranges = [...availability[day]]
        .map((range, index) => ({ ...range, index }))
        .sort((a, b) => a.from.localeCompare(b.from));

      for (let i = 1; i < ranges.length; i += 1) {
        if (ranges[i]!.from < ranges[i - 1]!.to) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [day, ranges[i]!.index, 'from'],
            message: vmsg('timeRangesOverlap'),
          });
        }
      }
    }
  });
export type WeeklyAvailability = z.infer<typeof weeklyAvailabilitySchema>;

/** Every day off — the starting point for a Mindsetter who has never saved a schedule. */
export function emptyWeeklyAvailability(): WeeklyAvailability {
  // `Object.fromEntries` widens to `{ [k: string]: never[] }`, which TypeScript won't narrow to
  // the seven-key record directly — hence the explicit build rather than a cast through `unknown`.
  const empty = {} as WeeklyAvailability;
  for (const day of WEEKDAYS) {
    empty[day] = [];
  }
  return empty;
}

export const sessionStepSchema = z
  .object({
    acceptsBookings: z.boolean(),
    sessionType: z.enum(['free', 'paid']),
    /**
     * Already-converted cents (see file-header note). `null` is valid for a Free session or
     * while a Paid session's price hasn't been typed yet — enforced conditionally below rather
     * than via a plain `.min()`, since "must be a positive number" only applies once
     * `sessionType === 'paid'` AND `acceptsBookings` is on.
     */
    priceCents: z.number().int().positive().nullable(),
    // A plain `z.union` of literals (not `z.number().refine(...)`) — `refine`'s type-guard
    // overload narrows the schema's *output* type without narrowing its *input* type, which
    // fights `zodResolver`'s inferred `Resolver<Input, Output>` typing against `useForm`'s own
    // `SessionStepInput` generic (verified via `npm run typecheck` — that combination doesn't
    // compile). A union of literals keeps input and output identical, sidestepping the
    // mismatch entirely.
    durations: z
      .array(z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]))
      .max(SESSION_DURATIONS.length),
    // Latin-only applies to the CUSTOM topics a Mindsetter types; the catalog ones are already
    // English, so the rule costs them nothing.
    topics: z
      .array(z.string().trim().min(1).max(MAX_TOPIC_LENGTH).refine(isLatinOnly, LATIN_ONLY_MESSAGE))
      .max(MAX_SESSION_TOPICS, vmsg('topicsMax', { max: MAX_SESSION_TOPICS })),
    /** IANA timezone string, auto-detected client-side (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — see `TimezoneField` in `SessionsSetupForm.tsx`. */
    timezone: z.string().trim().min(1, vmsg('timezoneRequired')),
    weeklyAvailability: weeklyAvailabilitySchema,
    /** Whether the caller accepted the platform-fee / Session-Terms policy. Persisted to
     * `session_settings.fee_consent_accepted`. Not a rendered input; the Sessions Setup page
     * carries it through unchanged, since the wizard's consent gate (`PlatformFeeModal`) left with
     * the onboarding step on 2026-08-13. */
    feeConsentAccepted: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // "Accept bookings" off (doc section 5): "rest of the fields hide, only toggle + 'Continue'
    // remain" — so none of the below are required in that state. The form still submits
    // whatever defaults are sitting in those (hidden) fields; only the acceptsBookings=true
    // path enforces them.
    if (!data.acceptsBookings) return;

    if (data.sessionType === 'paid' && (data.priceCents === null || data.priceCents <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceCents'],
        message: vmsg('priceRequired'),
      });
    }

    if (data.topics.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topics'],
        message: vmsg('topicsRequired'),
      });
    }

    if (data.durations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durations'],
        message: vmsg('durationsRequired'),
      });
    }

    // A profile that accepts bookings but has every day switched off can never be booked, which
    // is the same dead end as accepting bookings with no topics — caught here rather than left
    // to produce an empty calendar. Per-range validity and overlaps are already handled by
    // `weeklyAvailabilitySchema` itself.
    const hasAnyRange = WEEKDAYS.some((day) => data.weeklyAvailability[day].length > 0);
    if (!hasAnyRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weeklyAvailability'],
        message: vmsg('availabilityRequired'),
      });
    }
  });

export type SessionStepInput = z.infer<typeof sessionStepSchema>;

// -----------------------------------------------------------------------------------------
// Step "Make your profile shine" — the optional-block picker (onboarding doc section 6). Unlike
// every step above, the picker's selection itself is never persisted: it's handed to the first
// picked block screen via a query-param handoff (`lib/mindsetter-onboarding/blocks.ts`), not
// written to any column. This step's Server Action (`saveShine`) only advances
// `profiles.onboarding_step`, so its input schema takes no fields at all — kept here anyway
// (rather than skipping a schema) so every Mindsetter-onboarding Server Action shares the same
// "Zod at every boundary" `createAction` shape.
// -----------------------------------------------------------------------------------------

export const shineStepSchema = z.object({});

export type ShineStepInput = z.infer<typeof shineStepSchema>;

// -----------------------------------------------------------------------------------------
// Optional blocks (onboarding doc section 7, ROADMAP stage 1.9 next slice). Unlike the five
// core steps above, each of these is its own screen at `/mindsetter-onboarding/blocks/<slug>`
// (`lib/mindsetter-onboarding/blocks.ts`), only reached if picked on the "Make your profile
// shine" picker, and never advances `profiles.onboarding_step` (already at 5 by the time any
// block screen runs) — its Server Action only upserts its own `mindsetter_profiles` column.
// -----------------------------------------------------------------------------------------

// --- Promo video -> mindsetter_profiles.promo_video jsonb { youtube, vimeo, videoPath } -----
// Direct video upload is now enabled (product follow-up, 2026-07-19, un-deferring decision D4):
// the caller can EITHER upload a video file (stored in the private `promo-video` Storage bucket,
// migration `20260719132834_promo_video_storage_bucket.sql`; only its object PATH lands in the
// jsonb, like `reel_life`) OR paste a YouTube/Vimeo URL — all three fields optional (empty
// string / omitted = "not filled in"). The 200 MB file is uploaded CLIENT-SIDE straight to
// Storage (a Server Action's request body can't carry it — Next's default 1 MB action-body limit
// / Vercel's 4.5 MB serverless body limit), so this schema only ever validates the resulting
// path string; `savePromo` re-checks it's inside the caller's own `<uid>/` folder before storing.

/** Max promo-video upload size — mirrors the `promo-video` bucket's `file_size_limit` (200 MB)
 * and the onboarding doc's "Max 200MB" copy. Client-side pre-check; Storage enforces it too. */
export const MAX_PROMO_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;
/** Accepted promo-video MIME types — mirrors the bucket's `allowed_mime_types` (MP4 + MOV). */
export const ACCEPTED_PROMO_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const;

// Host allow-lists for the "Youtube URL"/"Vimeo URL" fields (promo + video-blog steps) — so those
// inputs reject arbitrary links (a random blog/article URL pasted into "Youtube URL") instead of
// accepting any valid URL, per product follow-up (2026-07-19).
const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be'] as const;
const VIMEO_HOSTS = ['vimeo.com'] as const;

/** True when `value`'s hostname is (a subdomain of) one of `hosts` — `www.` stripped first, so
 * `www.youtube.com`, `m.youtube.com`, `player.vimeo.com` all match; a non-URL returns false. */
function urlHostMatches(value: string, hosts: readonly string[]): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

/**
 * Optional "Youtube URL" field — empty, or a link that resolves to ONE concrete video.
 *
 * The host check alone (2026-07-19) let through anything on the domain: a channel page, a
 * playlist, a search URL, `youtube.com` itself. Those saved fine and then rendered as an empty
 * iframe on the public profile. `parseVideoUrl` additionally requires a well-formed video id in a
 * recognised path shape (`/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`).
 */
const youtubeUrlField = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .url(vmsg('urlInvalid'))
    .refine((value) => urlHostMatches(value, YOUTUBE_HOSTS), vmsg('youtubeHost'))
    .refine((value) => isSupportedVideoUrl(value), vmsg('youtubeVideo')),
]);

/** Optional "Vimeo URL" field — empty, or a link to a single Vimeo video. Same reasoning. */
const vimeoUrlField = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .url(vmsg('urlInvalid'))
    .refine((value) => urlHostMatches(value, VIMEO_HOSTS), vmsg('vimeoHost'))
    .refine((value) => isSupportedVideoUrl(value), vmsg('vimeoVideo')),
]);

/**
 * Promo video — LINK ONLY (YouTube / Vimeo).
 *
 * Direct file upload was removed on 2026-08-05 (product decision): hosting members' raw MP4/MOV
 * files meant a 200 MB private bucket, signed-URL plumbing on every render, and orphan cleanup,
 * to serve video that a platform streams better anyway. The `videoPath` field that carried the
 * uploaded object's Storage path is therefore gone from this schema.
 *
 * Now structurally identical to `videoBlogStepSchema` below — kept separate because the two map
 * to different columns and are likely to diverge again.
 */
export const promoStepSchema = z.object({
  youtube: youtubeUrlField,
  vimeo: vimeoUrlField,
});

export type PromoStepInput = z.infer<typeof promoStepSchema>;

// --- Video blog -> mindsetter_profiles.video_blog jsonb { youtube, vimeo } -----------------
// Un-deferred from Phase 2 back into MVP scope (migration
// `20260718185944_mindsetter_video_blog.sql`) — identical shape/schema to `promoStepSchema`
// above (both YouTube/Vimeo URL fields optional, empty string is valid), just no upload
// dropzone: this block is a link-only "BUILT NOT BURN interview" field, `VideoBlogForm.tsx`
// never renders a placeholder dropzone the way `PromoForm.tsx` does.

export const videoBlogStepSchema = z.object({
  youtube: youtubeUrlField,
  vimeo: vimeoUrlField,
});

export type VideoBlogStepInput = z.infer<typeof videoBlogStepSchema>;

// --- Numbers -> mindsetter_profiles.numbers jsonb, array of {value, label} ------------------

export const MAX_NUMBER_VALUE_LENGTH = 40;
export const MAX_NUMBER_LABEL_LENGTH = 40;
export const MIN_NUMBERS = 1;
/** Capped at 4 (2026-08-05 product decision, down from 10) — the profile renders these as a
 * single row of stat cards, and the design only ever had four. Fewer than four now stretch to
 * fill the row rather than leaving a gap (see `MindsetterProfileView.tsx`). */
export const MAX_NUMBERS = 4;

export const numberItemSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, vmsg('valueRequired'))
    .max(MAX_NUMBER_VALUE_LENGTH, vmsg('valueMax', { max: MAX_NUMBER_VALUE_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  label: z
    .string()
    .trim()
    .min(1, vmsg('labelRequired'))
    .max(MAX_NUMBER_LABEL_LENGTH, vmsg('labelMax', { max: MAX_NUMBER_LABEL_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
});

export type NumberItem = z.infer<typeof numberItemSchema>;

export const numbersStepSchema = z.object({
  numbers: z
    .array(numberItemSchema)
    .min(MIN_NUMBERS, vmsg('numbersRequired'))
    .max(MAX_NUMBERS, vmsg('numbersMax', { max: MAX_NUMBERS })),
});

/**
 * Cabinet-only variant: same items, same cap, but NO minimum — an empty array is a valid save,
 * which is how the cabinet CLEARS this section (2026-08-11).
 *
 * Why this exists rather than relaxing `numbersStepSchema` itself: in the wizard, "optional"
 * means the caller never picks this block at the Shine step and so never lands on its page at
 * all — once they are on it, it must be filled (`BlockShell` deliberately dropped its "Skip"
 * link for exactly that reason). The cabinet has no such picker: every section is a permanent
 * card, so "Optional · not added" has to be a state the form can actually save and return to.
 * Two different rules for two different flows, so two schemas.
 */
export const numbersCabinetSchema = z.object({
  numbers: z.array(numberItemSchema).max(MAX_NUMBERS, vmsg('numbersMax', { max: MAX_NUMBERS })),
});

export type NumbersStepInput = z.infer<typeof numbersStepSchema>;

// --- My Wins -> mindsetter_profiles.wins jsonb, array of {year, win, description, color} ----

/** Palette keys stored on each win (not hex — the hex values live in `WinsForm.tsx`'s own
 * display-only swatch map), onboarding doc section 7 "My Wins": "palette of 7 colors
 * (yellow/purple/blue/orange/teal/light-blue/pink)". */
export const WIN_COLORS = [
  'yellow',
  'purple',
  'blue',
  'orange',
  'teal',
  'lightblue',
  'pink',
] as const;

export type WinColor = (typeof WIN_COLORS)[number];

export const MAX_WIN_YEAR_LENGTH = 40;
export const MAX_WIN_TITLE_LENGTH = 40;
export const MAX_WIN_DESCRIPTION_LENGTH = 200;
export const MIN_WINS = 1;
/** Capped at 7 (2026-08-06 product decision, down from 10). */
export const MAX_WINS = 7;

export const winSchema = z.object({
  year: z
    .string()
    .trim()
    .min(1, vmsg('yearRequired'))
    .max(MAX_WIN_YEAR_LENGTH, vmsg('yearMax', { max: MAX_WIN_YEAR_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  win: z
    .string()
    .trim()
    .min(1, vmsg('winRequired'))
    .max(MAX_WIN_TITLE_LENGTH, vmsg('winMax', { max: MAX_WIN_TITLE_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  description: z
    .string()
    .trim()
    .min(1, vmsg('descriptionRequired'))
    .max(MAX_WIN_DESCRIPTION_LENGTH, vmsg('descriptionMax', { max: MAX_WIN_DESCRIPTION_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  color: z.enum(WIN_COLORS),
});

export type Win = z.infer<typeof winSchema>;

export const winsStepSchema = z.object({
  wins: z
    .array(winSchema)
    .min(MIN_WINS, vmsg('winsRequired'))
    .max(MAX_WINS, vmsg('winsMax', { max: MAX_WINS })),
});

/** Cabinet-only variant — no minimum, so the section can be saved empty (cleared). See
 * {@link numbersCabinetSchema} for why this isn't just a relaxed `winsStepSchema`. */
export const winsCabinetSchema = z.object({
  wins: z.array(winSchema).max(MAX_WINS, vmsg('winsMax', { max: MAX_WINS })),
});

export type WinsStepInput = z.infer<typeof winsStepSchema>;

// --- My Way -> mindsetter_profiles.my_way jsonb, array of {project, description, yearFrom, yearTo} ---
// Stored camelCase as written straight through by `saveMyWay` (same "this app owns both the
// read and write side of this brand-new field" precedent `roleLinkSchema`'s `ogTitle` already
// established, even though the schema-alignment migration's own SQL comment documents the
// jsonb shape with snake_case `year_from`/`year_to` keys).

export const MAX_MY_WAY_PROJECT_LENGTH = 40;
export const MAX_MY_WAY_DESCRIPTION_LENGTH = 200;
export const MAX_MY_WAY_YEAR_LENGTH = 40;
export const MIN_MY_WAY = 1;
export const MAX_MY_WAY = 10;

export const myWayStageSchema = z
  .object({
    project: z
      .string()
      .trim()
      .min(1, vmsg('projectRequired'))
      .max(MAX_MY_WAY_PROJECT_LENGTH, vmsg('projectMax', { max: MAX_MY_WAY_PROJECT_LENGTH }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
    description: z
      .string()
      .trim()
      .min(1, vmsg('descriptionRequired'))
      .max(
        MAX_MY_WAY_DESCRIPTION_LENGTH,
        vmsg('descriptionMax', { max: MAX_MY_WAY_DESCRIPTION_LENGTH }),
      )
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
    yearFrom: z
      .string()
      .trim()
      .min(1, vmsg('yearFromRequired'))
      .max(MAX_MY_WAY_YEAR_LENGTH, vmsg('yearFromMax', { max: MAX_MY_WAY_YEAR_LENGTH }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
    yearTo: z
      .string()
      .trim()
      .min(1, vmsg('yearToRequired'))
      .max(MAX_MY_WAY_YEAR_LENGTH, vmsg('yearToMax', { max: MAX_MY_WAY_YEAR_LENGTH }))
      .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  })
  .superRefine((stage, ctx) => {
    // Reversed-range guard (product fix, stage 1.9 follow-up): only fires once BOTH years are
    // present and numeric — a non-numeric or missing year is already reported by the field's own
    // `min`/`max` rules above, so this stays silent in that case rather than piling on a second,
    // confusing error. Same year on both ends (a one-year project, e.g. "2020 – 2020") is
    // deliberately allowed — only a truly reversed range ("2016 – 2012") is rejected.
    if (!stage.yearFrom || !stage.yearTo) return;
    const from = Number(stage.yearFrom);
    const to = Number(stage.yearTo);
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    if (to < from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yearTo'],
        message: vmsg('yearRangeReversed'),
      });
    }
  });

export type MyWayStage = z.infer<typeof myWayStageSchema>;

export const myWayStepSchema = z.object({
  myWay: z
    .array(myWayStageSchema)
    .min(MIN_MY_WAY, vmsg('stagesRequired'))
    .max(MAX_MY_WAY, vmsg('stagesMax', { max: MAX_MY_WAY })),
});

export type MyWayStepInput = z.infer<typeof myWayStepSchema>;

// --- My F*ckUp(s) -> mindsetter_profiles.fckups jsonb, array of {story} ---------------------
// Design mockup wrongly labels the add-button "Add stage" here — fixed to "Add f*ckup" per the
// onboarding doc's E.4 silent-fix list; `FckupsForm.tsx` uses the corrected copy key.

/** Raised to 3000 (2026-08-05 product decision, up from 200): a f*ckup story is a narrative,
 * and 200 characters is barely two sentences — Mindsetters were being cut off mid-thought. */
export const MAX_FCKUP_STORY_LENGTH = 3000;
export const MIN_FCKUPS = 1;
export const MAX_FCKUPS = 10;

export const fckupSchema = z.object({
  story: z
    .string()
    .trim()
    .min(1, vmsg('storyRequired'))
    .max(MAX_FCKUP_STORY_LENGTH, vmsg('storyMax', { max: MAX_FCKUP_STORY_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
});

export type Fckup = z.infer<typeof fckupSchema>;

export const fckupsStepSchema = z.object({
  fckups: z
    .array(fckupSchema)
    .min(MIN_FCKUPS, vmsg('fckupsRequired'))
    .max(MAX_FCKUPS, vmsg('fckupsMax', { max: MAX_FCKUPS })),
});

/** Cabinet-only variant — no minimum, so the section can be saved empty (cleared). See
 * {@link numbersCabinetSchema} for why this isn't just a relaxed `fckupsStepSchema`. */
export const fckupsCabinetSchema = z.object({
  fckups: z.array(fckupSchema).max(MAX_FCKUPS, vmsg('fckupsMax', { max: MAX_FCKUPS })),
});

export type FckupsStepInput = z.infer<typeof fckupsStepSchema>;

// --- My Philosophy -> mindsetter_profiles.philosophy text (one quote) ----------------------
// Only block that stores a plain scalar column (not jsonb) — no "Add" button, no field array.

export const MAX_PHILOSOPHY_LENGTH = 200;

/** Attribution line under the quote. Short by design — it holds a name, not a bio. */
export const MAX_PHILOSOPHY_AUTHOR_LENGTH = 80;

export const philosophyStepSchema = z.object({
  philosophy: z
    .string()
    .trim()
    .min(1, vmsg('quoteRequired'))
    .max(MAX_PHILOSOPHY_LENGTH, vmsg('quoteMax', { max: MAX_PHILOSOPHY_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
  /**
   * Who said it (2026-08-14). Optional: an empty author means the quote is the Mindsetter's own,
   * which is the common case — the public profile then shows the line unattributed rather than
   * inventing a name.
   */
  philosophyAuthor: z
    .string()
    .trim()
    .max(MAX_PHILOSOPHY_AUTHOR_LENGTH, vmsg('authorMax', { max: MAX_PHILOSOPHY_AUTHOR_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE)
    .optional(),
});

export type PhilosophyStepInput = z.infer<typeof philosophyStepSchema>;

/**
 * Cabinet variant — the quote may be BLANK. "Optional" in the wizard meant "you can skip picking
 * this block at the Shine step"; once inside the block the quote was required. In the cabinet that
 * distinction is gone, and saving an empty quote is how the section gets cleared again. Same
 * relaxation `numbersCabinetSchema`/`winsCabinetSchema` make for their own lists.
 */
export const philosophyCabinetSchema = philosophyStepSchema.extend({
  philosophy: z
    .string()
    .trim()
    .max(MAX_PHILOSOPHY_LENGTH, vmsg('quoteMax', { max: MAX_PHILOSOPHY_LENGTH }))
    .refine(isLatinOnly, LATIN_ONLY_MESSAGE),
});

// --- Reel Life -> mindsetter_profiles.reel_life jsonb, ORDERED array of Storage object paths ---
// Storage bucket `reel-life` (private, signed URLs only — see the schema-alignment migration's
// own comment on `reel_life`) holds the actual image bytes; this column only stores the ordered
// list of object paths, same "column holds the reference, Storage holds the bytes" split as
// `profiles.avatar_url` — except `avatar_url` stores a full public URL (that bucket is public-
// read, see `20260707150500_fix_profile_interests_race_and_avatar_public_read.sql`) while this
// stores bare paths, resolved to signed URLs only where/when actually displayed
// (`blocks/reel-life/page.tsx`'s `createSignedUrls` call).
//
// Upload mechanism (this stage's build decision — mirrors `saveMemberProfile`'s real avatar-
// upload mechanics, does NOT invent a new one): each photo uploads via its own Server Action
// (`uploadReelLifePhoto`, `actions.ts`) the moment it's picked, using the authed server Supabase
// client (never the service-role client — same `auth.uid()`-owned-folder RLS as avatars/covers).
// `saveReelLife` below only ever receives already-uploaded path strings, never a `File` — unlike
// the single-avatar case, batching every pending upload into one `FormData` submitted at "Save
// and continue" would need a separate marker array just to reconstruct interleaved existing/new
// ordering (see `ReelLifeForm.tsx`'s doc comment), so each photo instead uploads immediately on
// pick and this schema only ever validates the final ordered list of paths.

/** Upper bound (2026-08-14 product decision, down from an arbitrary 20) — two full rows of seven. */
export const MAX_REEL_LIFE_PHOTOS = 14;

/**
 * How many photos the section needs before it appears on the public profile.
 *
 * A THRESHOLD FOR DISPLAY, NOT A REQUIRED FIELD (2026-08-14). Fewer than this — including none —
 * saves perfectly well and blocks nothing: the wizard step stays skippable and the cabinet section
 * stays optional. It only means the grid isn't shown to visitors yet, because a half-empty row
 * reads as a broken layout rather than a gallery. Seven is what fills two rows.
 *
 * `reelLifeStepSchema` deliberately does NOT enforce it — the only place it is applied is the
 * public profile's own render gate (`MindsetterProfileView`), and the copy that tells the member
 * what to expect.
 */
export const MIN_REEL_LIFE_PHOTOS_TO_DISPLAY = 7;

/** @deprecated Kept as the old name for the same number — prefer `MIN_REEL_LIFE_PHOTOS_TO_DISPLAY`. */
export const RECOMMENDED_REEL_LIFE_PHOTOS = MIN_REEL_LIFE_PHOTOS_TO_DISPLAY;
/** Mirrors the `reel-life` bucket's own 5 MB `file_size_limit` — see
 * 20260805220600_reel_life_photo_size_limit_5mb.sql. The bucket is the real enforcement; this
 * only buys a readable error before the upload round-trip. */
export const MAX_REEL_LIFE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
/** Design's hint copy says "PNG or JPEG" even though the `reel-life` bucket's own
 * `allowed_mime_types` also lists webp/avif — client-side validation intentionally follows the
 * design copy, not the (slightly wider) bucket allow-list. */
export const ACCEPTED_REEL_LIFE_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

const reelLifePathSchema = z.string().trim().min(1, vmsg('photoInvalid'));

export const reelLifeStepSchema = z.object({
  reelLife: z
    .array(reelLifePathSchema)
    .max(MAX_REEL_LIFE_PHOTOS, vmsg('photosMax', { max: MAX_REEL_LIFE_PHOTOS })),
});

export type ReelLifeStepInput = z.infer<typeof reelLifeStepSchema>;

/** Single-photo upload payload (`uploadReelLifePhoto`'s Server Action input) — validated the
 * same way `avatarFileSchema` validates the Member-profile photo
 * (`lib/validation/member-profile.ts`), just required (no existing-photo fallback: every call to
 * `uploadReelLifePhoto` is a brand-new file the caller just picked, never a resubmission). */
export const reelLifePhotoFileSchema = z
  .instanceof(File, { message: vmsg('photoRequired') })
  .refine((file) => file.size > 0, vmsg('photoRequired'))
  .refine(
    (file) => (ACCEPTED_REEL_LIFE_MIME_TYPES as readonly string[]).includes(file.type),
    vmsg('imageType'),
  )
  .refine(
    (file) => file.size <= MAX_REEL_LIFE_PHOTO_SIZE_BYTES,
    vmsg('imageMax', { max: MAX_REEL_LIFE_PHOTO_SIZE_BYTES / (1024 * 1024) }),
  );

export const reelLifePhotoUploadSchema = z.object({ photo: reelLifePhotoFileSchema });

export type ReelLifePhotoUploadInput = z.infer<typeof reelLifePhotoUploadSchema>;

/** `deleteReelLifePhoto`'s Server Action input — a single already-uploaded object path. */
export const reelLifePhotoDeleteSchema = z.object({ path: reelLifePathSchema });

export type ReelLifePhotoDeleteInput = z.infer<typeof reelLifePhotoDeleteSchema>;
