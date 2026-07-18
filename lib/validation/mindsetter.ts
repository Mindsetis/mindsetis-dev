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

// -----------------------------------------------------------------------------------------
// Step "Your roles" — stored as `mindsetter_profiles.roles` jsonb (migrated text[] -> jsonb
// in `20260718160224_mindsetter_onboarding_schema_alignment.sql`).
// -----------------------------------------------------------------------------------------

export const MAX_ROLE_TITLE_LENGTH = 40;
export const MAX_ROLE_DESCRIPTION_LENGTH = 200;
export const MAX_ROLE_LINKS = 5;
export const MIN_ROLES = 1;
export const MAX_ROLES = 5;

/**
 * One optional link per role. `ogTitle` is populated later by a not-yet-built og-scraping
 * step (see the "Your roles" section of the onboarding doc, "// TODO og preview" in
 * `RolesForm.tsx`) — for now the form only ever writes `url`. Deliberately camelCase here
 * (matching the rest of this TS/Zod layer) even though the schema-alignment migration's own
 * SQL comment documents the jsonb shape with a snake_case `og_title` key — this app owns both
 * the read and write side of this brand-new field, so there is no existing consumer to stay
 * compatible with; keep this comment in sync if that ever changes.
 */
export const roleLinkSchema = z.object({
  url: z.string().trim().min(1, 'Enter a valid URL.').url('Enter a valid URL.'),
  ogTitle: z.string().trim().max(200).optional(),
});

export type RoleLink = z.infer<typeof roleLinkSchema>;

export const roleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(MAX_ROLE_TITLE_LENGTH, `Title must be at most ${MAX_ROLE_TITLE_LENGTH} characters.`),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(
      MAX_ROLE_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_ROLE_DESCRIPTION_LENGTH} characters.`,
    ),
  links: z.array(roleLinkSchema).max(MAX_ROLE_LINKS, `You can add up to ${MAX_ROLE_LINKS} links.`),
});

export type Role = z.infer<typeof roleSchema>;

export const rolesStepSchema = z.object({
  roles: z
    .array(roleSchema)
    .min(MIN_ROLES, 'Add at least one role.')
    .max(MAX_ROLES, `You can add up to ${MAX_ROLES} roles.`),
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
      .max(
        MAX_SUPERPOWER_TITLE_LENGTH,
        `Title must be at most ${MAX_SUPERPOWER_TITLE_LENGTH} characters.`,
      ),
    description: z
      .string()
      .trim()
      .max(
        MAX_SUPERPOWER_DESCRIPTION_LENGTH,
        `Description must be at most ${MAX_SUPERPOWER_DESCRIPTION_LENGTH} characters.`,
      ),
  })
  .superRefine((slot, ctx) => {
    if (!isSuperpowerFilled(slot)) return;
    if (slot.title.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Title is required.',
      });
    }
    if (slot.description.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Description is required.',
      });
    }
  });

export type Superpower = z.infer<typeof superpowerSchema>;

export const superpowersStepSchema = z
  .object({
    superpowers: z
      .array(superpowerSchema)
      .max(MAX_SUPERPOWERS, `You can add up to ${MAX_SUPERPOWERS} superpowers.`),
  })
  .superRefine((data, ctx) => {
    // Count of ACTUALLY filled cards, not raw array length — `SuperpowersForm.tsx` always
    // submits (padded, pre-filter) or sends (post-filter) an array whose length alone doesn't
    // tell you how many slots are real.
    if (data.superpowers.filter(isSuperpowerFilled).length < MIN_SUPERPOWERS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['superpowers'],
        message: 'Add at least one superpower.',
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
export const MAX_EXPERTISE = 5;

export const expertiseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(
      MAX_EXPERTISE_TITLE_LENGTH,
      `Title must be at most ${MAX_EXPERTISE_TITLE_LENGTH} characters.`,
    ),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(
      MAX_EXPERTISE_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_EXPERTISE_DESCRIPTION_LENGTH} characters.`,
    ),
});

export type Expertise = z.infer<typeof expertiseSchema>;

export const helpStepSchema = z.object({
  expertise: z
    .array(expertiseSchema)
    .min(MIN_EXPERTISE, 'Add at least one expertise.')
    .max(MAX_EXPERTISE, `You can add up to ${MAX_EXPERTISE} expertise entries.`),
});

export type HelpStepInput = z.infer<typeof helpStepSchema>;

// -----------------------------------------------------------------------------------------
// Step "Personal session" — maps to the `session_settings` row (mindsetter_id primary key),
// migrated in `20260718160224_mindsetter_onboarding_schema_alignment.sql` to add
// `accepts_bookings`/`timezone`/`available_days`/`available_from`/`available_to` on top of the
// pre-existing `session_type`/`duration_min`/`topics`/`price_cents`/`currency` columns
// (onboarding doc section 5/A). The UI collects price in whole dollars; this schema's
// `priceCents` is already the converted integer-cents value the Server Action writes straight
// to `price_cents` — the dollars->cents math lives in `SessionForm.tsx`'s price `Input`
// `onChange`, not here, so this boundary schema only ever sees the final stored shape.
//
// `topics` options are the `mindsetter_profiles.help_with` card titles from the previous step
// (doc section E.1) PLUS whatever ad-hoc "+ Add custom" entries the caller typed in — both are
// indistinguishable plain strings by the time they reach this schema/the server, matching the
// product decision that custom topics are session-topics-only and never written back to
// `help_with`.
// -----------------------------------------------------------------------------------------

export const MAX_SESSION_TOPICS = 5;
export const MAX_TOPIC_LENGTH = 40;

/** Fixed pill choices (doc section 5: "pills 30/45/60/90 min (single-select)") — no custom
 * duration input. */
export const SESSION_DURATIONS = [30, 45, 60, 90] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

/** Recurring weekly-schedule days, matching `session_settings.available_days`'s stored
 * shorthand (e.g. `{mon,tue}`, per that column's migration comment) — not full weekday names. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeStringSchema = z.string().regex(TIME_PATTERN, 'Enter a valid time (HH:mm).');

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
    durationMin: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
    topics: z
      .array(z.string().trim().min(1).max(MAX_TOPIC_LENGTH))
      .max(MAX_SESSION_TOPICS, `You can select up to ${MAX_SESSION_TOPICS} topics.`),
    /** IANA timezone string, auto-detected client-side (`Intl.DateTimeFormat().resolvedOptions().timeZone`) — see `TimezoneField` in `SessionForm.tsx`. A full timezone picker is out of MVP scope (product decision, this stage's build prompt). */
    timezone: z.string().trim().min(1, 'Timezone is required.'),
    availableDays: z.array(z.enum(WEEKDAYS)),
    availableFrom: timeStringSchema,
    availableTo: timeStringSchema,
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
        message: 'Enter a price greater than $0.',
      });
    }

    if (data.topics.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topics'],
        message: 'Select at least one topic.',
      });
    }

    if (data.availableDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['availableDays'],
        message: 'Select at least one available day.',
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

// --- Promo video -> mindsetter_profiles.promo_video jsonb { youtube, vimeo } ---------------
// Direct video upload is deferred past MVP (decision D4, migration comment on
// `promo_video`) — the dropzone in `PromoForm.tsx` is a disabled visual placeholder only; the
// real save path is this YouTube/Vimeo URL pair, both optional (empty string is valid — "not
// filled in").

export const promoStepSchema = z.object({
  youtube: z.union([z.literal(''), z.string().trim().url('Enter a valid URL.')]),
  vimeo: z.union([z.literal(''), z.string().trim().url('Enter a valid URL.')]),
});

export type PromoStepInput = z.infer<typeof promoStepSchema>;

// --- Numbers -> mindsetter_profiles.numbers jsonb, array of {value, label} ------------------

export const MAX_NUMBER_VALUE_LENGTH = 40;
export const MAX_NUMBER_LABEL_LENGTH = 40;
export const MIN_NUMBERS = 1;
export const MAX_NUMBERS = 5;

export const numberItemSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, 'Value is required.')
    .max(MAX_NUMBER_VALUE_LENGTH, `Value must be at most ${MAX_NUMBER_VALUE_LENGTH} characters.`),
  label: z
    .string()
    .trim()
    .min(1, 'Label is required.')
    .max(MAX_NUMBER_LABEL_LENGTH, `Label must be at most ${MAX_NUMBER_LABEL_LENGTH} characters.`),
});

export type NumberItem = z.infer<typeof numberItemSchema>;

export const numbersStepSchema = z.object({
  numbers: z
    .array(numberItemSchema)
    .min(MIN_NUMBERS, 'Add at least one number.')
    .max(MAX_NUMBERS, `You can add up to ${MAX_NUMBERS} numbers.`),
});

export type NumbersStepInput = z.infer<typeof numbersStepSchema>;

// --- My Wins -> mindsetter_profiles.wins jsonb, array of {year, win, description, color} ----

/** Palette keys stored on each win (not hex — the hex values live in `WinsForm.tsx`'s own
 * display-only swatch map, `// TODO confirm exact palette hex from Figma`), onboarding doc
 * section 7 "My Wins": "palette of 7 colors (yellow/purple/blue/orange/teal/light-blue/pink)". */
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
export const MAX_WINS = 5;

export const winSchema = z.object({
  year: z
    .string()
    .trim()
    .min(1, 'Year is required.')
    .max(MAX_WIN_YEAR_LENGTH, `Year must be at most ${MAX_WIN_YEAR_LENGTH} characters.`),
  win: z
    .string()
    .trim()
    .min(1, 'Win is required.')
    .max(MAX_WIN_TITLE_LENGTH, `Win must be at most ${MAX_WIN_TITLE_LENGTH} characters.`),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(
      MAX_WIN_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_WIN_DESCRIPTION_LENGTH} characters.`,
    ),
  color: z.enum(WIN_COLORS),
});

export type Win = z.infer<typeof winSchema>;

export const winsStepSchema = z.object({
  wins: z
    .array(winSchema)
    .min(MIN_WINS, 'Add at least one win.')
    .max(MAX_WINS, `You can add up to ${MAX_WINS} wins.`),
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
export const MAX_MY_WAY = 5;

export const myWayStageSchema = z.object({
  project: z
    .string()
    .trim()
    .min(1, 'Project name is required.')
    .max(
      MAX_MY_WAY_PROJECT_LENGTH,
      `Project name must be at most ${MAX_MY_WAY_PROJECT_LENGTH} characters.`,
    ),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(
      MAX_MY_WAY_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_MY_WAY_DESCRIPTION_LENGTH} characters.`,
    ),
  yearFrom: z
    .string()
    .trim()
    .min(1, 'Start year is required.')
    .max(
      MAX_MY_WAY_YEAR_LENGTH,
      `Start year must be at most ${MAX_MY_WAY_YEAR_LENGTH} characters.`,
    ),
  yearTo: z
    .string()
    .trim()
    .min(1, 'End year is required.')
    .max(MAX_MY_WAY_YEAR_LENGTH, `End year must be at most ${MAX_MY_WAY_YEAR_LENGTH} characters.`),
});

export type MyWayStage = z.infer<typeof myWayStageSchema>;

export const myWayStepSchema = z.object({
  myWay: z
    .array(myWayStageSchema)
    .min(MIN_MY_WAY, 'Add at least one stage.')
    .max(MAX_MY_WAY, `You can add up to ${MAX_MY_WAY} stages.`),
});

export type MyWayStepInput = z.infer<typeof myWayStepSchema>;

// --- My F*ckUp(s) -> mindsetter_profiles.fckups jsonb, array of {story} ---------------------
// Design mockup wrongly labels the add-button "Add stage" here — fixed to "Add f*ckup" per the
// onboarding doc's E.4 silent-fix list; `FckupsForm.tsx` uses the corrected copy key.

export const MAX_FCKUP_STORY_LENGTH = 200;
export const MIN_FCKUPS = 1;
export const MAX_FCKUPS = 5;

export const fckupSchema = z.object({
  story: z
    .string()
    .trim()
    .min(1, 'Story is required.')
    .max(MAX_FCKUP_STORY_LENGTH, `Story must be at most ${MAX_FCKUP_STORY_LENGTH} characters.`),
});

export type Fckup = z.infer<typeof fckupSchema>;

export const fckupsStepSchema = z.object({
  fckups: z
    .array(fckupSchema)
    .min(MIN_FCKUPS, 'Add at least one f*ckup.')
    .max(MAX_FCKUPS, `You can add up to ${MAX_FCKUPS} f*ckups.`),
});

export type FckupsStepInput = z.infer<typeof fckupsStepSchema>;

// --- My Philosophy -> mindsetter_profiles.philosophy text (one quote) ----------------------
// Only block that stores a plain scalar column (not jsonb) — no "Add" button, no field array.

export const MAX_PHILOSOPHY_LENGTH = 200;

export const philosophyStepSchema = z.object({
  philosophy: z
    .string()
    .trim()
    .min(1, 'Quote is required.')
    .max(MAX_PHILOSOPHY_LENGTH, `Quote must be at most ${MAX_PHILOSOPHY_LENGTH} characters.`),
});

export type PhilosophyStepInput = z.infer<typeof philosophyStepSchema>;

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

export const MAX_REEL_LIFE_PHOTOS = 20; // no cap specified in the onboarding doc — a sane bound.
/** Design's own hint copy: "Add at least 3 photos to activate this section" — informational
 * only for MVP; `saveReelLife` does NOT hard-block saving fewer than 3 (or zero) photos.
 * // TODO confirm min-3 enforcement with product before this ships past MVP. */
export const MIN_REEL_LIFE_TO_ACTIVATE = 3;
export const MAX_REEL_LIFE_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // matches the bucket's 10 MB file_size_limit
/** Design's hint copy says "PNG or JPEG" even though the `reel-life` bucket's own
 * `allowed_mime_types` also lists webp/avif — client-side validation intentionally follows the
 * design copy, not the (slightly wider) bucket allow-list. */
export const ACCEPTED_REEL_LIFE_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

const reelLifePathSchema = z.string().trim().min(1, 'Invalid photo.');

export const reelLifeStepSchema = z.object({
  reelLife: z
    .array(reelLifePathSchema)
    .max(MAX_REEL_LIFE_PHOTOS, `You can add up to ${MAX_REEL_LIFE_PHOTOS} photos.`),
});

export type ReelLifeStepInput = z.infer<typeof reelLifeStepSchema>;

/** Single-photo upload payload (`uploadReelLifePhoto`'s Server Action input) — validated the
 * same way `avatarFileSchema` validates the Member-profile photo
 * (`lib/validation/member-profile.ts`), just required (no existing-photo fallback: every call to
 * `uploadReelLifePhoto` is a brand-new file the caller just picked, never a resubmission). */
export const reelLifePhotoFileSchema = z
  .instanceof(File, { message: 'Select a photo.' })
  .refine((file) => file.size > 0, 'Select a photo.')
  .refine(
    (file) => (ACCEPTED_REEL_LIFE_MIME_TYPES as readonly string[]).includes(file.type),
    'Only PNG or JPEG images are allowed.',
  )
  .refine((file) => file.size <= MAX_REEL_LIFE_PHOTO_SIZE_BYTES, 'Image must be at most 10 MB.');

export const reelLifePhotoUploadSchema = z.object({ photo: reelLifePhotoFileSchema });

export type ReelLifePhotoUploadInput = z.infer<typeof reelLifePhotoUploadSchema>;

/** `deleteReelLifePhoto`'s Server Action input — a single already-uploaded object path. */
export const reelLifePhotoDeleteSchema = z.object({ path: reelLifePathSchema });

export type ReelLifePhotoDeleteInput = z.infer<typeof reelLifePhotoDeleteSchema>;
