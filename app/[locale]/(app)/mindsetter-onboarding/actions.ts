'use server';

/**
 * Server Actions for the extended Mindsetter onboarding wizard (ROADMAP stage 1.9,
 * `docs/mindsetter-extended-onboarding.md`). Roles/superpowers/help/session/shine are all
 * implemented, mirroring `lib/validation/mindsetter.ts`'s one-block-per-step layout.
 *
 * Unlike the staff-only fields flagged in the onboarding doc (section B: `account_type`,
 * `mindsetter_profiles.is_public`), `roles` is a plain column the caller owns outright —
 * `mindsetter_profiles_insert_own`/`_update_own` RLS (`auth.uid() = id`) already allow this
 * via the normal server client, no service-role needed here. One deliberate exception, scoped to a
 * single row keyed by the caller's own `requireUser()` id: `finalizeMindsetterOnboarding` below
 * (section 8/B's resolved decision D1), which flips `account_type` — a staff-only column — once
 * the core wizard is done. See that action's own doc comment for the narrow scope it is held to.
 */
import { z } from 'zod';

import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { isMindsetterAutoPublishEnabled } from '@/lib/config/mindsetter-publication';
import { fetchLinkPreview, type LinkPreview } from '@/lib/link-preview';
import { firstMissingMindsetterStep } from '@/lib/profile/completeness';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/supabase/service';
import { vmsg } from '@/lib/validation/messages';
import {
  fckupsStepSchema,
  helpStepSchema,
  MAX_REEL_LIFE_PHOTOS,
  myWayStepSchema,
  numbersStepSchema,
  philosophyStepSchema,
  PROMO_THUMBNAIL_PATH,
  promoStepSchema,
  promoThumbnailDeleteSchema,
  promoThumbnailUploadSchema,
  reelLifePhotoDeleteSchema,
  reelLifePhotoUploadSchema,
  reelLifeStepSchema,
  roleLinkPreviewRequestSchema,
  rolesStepSchema,
  shineStepSchema,
  superpowersStepSchema,
  videoBlogStepSchema,
  winsStepSchema,
} from '@/lib/validation/mindsetter';
import { resolveVideoMeta, resolveVideoOrientation } from '@/lib/video-embed';

/**
 * `mindsetter_profiles.onboarding_step` (added by the stage-1.9 review-loop follow-up migration
 * `20260718172922_mindsetter_onboarding_review_fixes.sql`) is this wizard's OWN progress column —
 * dedicated precisely because `profiles.onboarding_step` is a DIFFERENT column the Member
 * registration wizard already writes (values 1/2/3 — see `member-profile`/`build-profile`
 * actions), and the two wizards' step numbers would otherwise collide/stomp on each other.
 * NEVER read or write `profiles.onboarding_step` for Mindsetter-onboarding progress — only this
 * `mindsetter_profiles` column. Each step must only ever raise it, never lower it back down for
 * a caller who's already further along, same "only advance" contract the Member wizard follows.
 *
 * "Personal session" left the wizard on 2026-08-13 — 1:1 settings moved to the cabinet
 * (`/dashboard/sessions`), where a Mindsetter can set them up whenever, instead of being a gate on
 * finishing signup. The flow is now roles(1) → superpowers(2) → help(3) → shine(4) → [optional
 * blocks] → congrats. Since Release 4 П1 (06.11.2026) `HELP_STEP_ONBOARDING_STEP` (3) — the last
 * REQUIRED step — is the "core wizard done" threshold `promoteIfCoreWizardDone` checks below; it
 * was the Shine picker's 4 before that, and the session step's 5 before 2026-08-13.
 */
const ROLES_STEP_ONBOARDING_STEP = 1;
const SUPERPOWERS_STEP_ONBOARDING_STEP = 2;
const HELP_STEP_ONBOARDING_STEP = 3;
const SHINE_STEP_ONBOARDING_STEP = 4;

/** Each data-carrying required step's counter value, keyed like `firstMissingMindsetterStep`. */
const REQUIRED_STEP_COUNTERS = {
  roles: ROLES_STEP_ONBOARDING_STEP,
  superpowers: SUPERPOWERS_STEP_ONBOARDING_STEP,
  helpWith: HELP_STEP_ONBOARDING_STEP,
} as const;

/**
 * Shared "only advance `mindsetter_profiles.onboarding_step`" tail, factored out once three
 * steps (roles/superpowers/help) needed the identical read-then-conditionally-update sequence.
 * Errors surface the same `ActionError` shape/log prefix every step used before this was
 * extracted, so behavior for `saveRoles` is unchanged.
 *
 * `mindsetter_profiles` is created lazily — its row only exists once the caller's first
 * `upsert` runs (`saveRoles` et al, all called before this). By the time this runs the row
 * always exists, but `maybeSingle()` still tolerates a missing row (`null` step) defensively,
 * treating it the same as step 0.
 */
async function advanceOnboardingStep(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  minStep: number,
): Promise<void> {
  const { data: currentProfile, error: profileReadError } = await supabase
    .from('mindsetter_profiles')
    .select('onboarding_step')
    .eq('id', userId)
    .maybeSingle();

  if (profileReadError) {
    console.error('[mindsetter-onboarding] mindsetter_profiles read failed:', profileReadError);
    throw new ActionError('internal_error', 'Could not save your progress. Please try again.');
  }

  const currentStep = currentProfile?.onboarding_step ?? 0;
  const nextStep = Math.max(currentStep, minStep);
  if (nextStep !== currentStep) {
    const { error: stepError } = await supabase
      .from('mindsetter_profiles')
      .update({ onboarding_step: nextStep })
      .eq('id', userId);

    if (stepError) {
      console.error('[mindsetter-onboarding] onboarding_step update failed:', stepError);
      throw new ActionError('internal_error', 'Could not save your progress. Please try again.');
    }
  }
}

export const saveRoles = createAction(rolesStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: rolesError } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, roles: input.roles }, { onConflict: 'id' });

  if (rolesError) {
    console.error('[mindsetter-onboarding] roles upsert failed:', rolesError);
    throw new ActionError('internal_error', 'Could not save your roles. Please try again.');
  }

  await advanceOnboardingStep(supabase, user.id, ROLES_STEP_ONBOARDING_STEP);

  return { roles: input.roles };
});

export type FetchRoleLinkPreviewResult = {
  /** `null` when the fetch/scrape failed for any reason — the client just shows no preview
   * card in that case, never an error message (see `lib/link-preview.ts`'s doc comment: this
   * never throws, so a `null` result is an expected, ordinary outcome, not a failure). */
  preview: LinkPreview | null;
};

/**
 * Scrapes Open Graph metadata for one role-link URL (`RolesForm.tsx`, fired on `url` field
 * blur). The actual fetch + parsing — and, critically, the SSRF guard (protocol allow-list,
 * private/reserved-IP deny-list checked against BOTH the literal hostname and every DNS-resolved
 * address, manually-revalidated redirects) — lives entirely in `lib/link-preview.ts`; this
 * action is just the authenticated, rate-limited entry point to it.
 *
 * Auth-gated (`requireUser()`) rather than public: this endpoint makes the SERVER fetch an
 * arbitrary caller-supplied URL, which is exactly the kind of capability that must never be
 * exposed to anonymous callers (open SSRF proxy / anonymous scraping-as-a-service). Rate-limited
 * on top of that as defense-in-depth against a signed-in caller hammering it (e.g. scripted
 * abuse of the fetch itself, independent of the SSRF guard already blocking unsafe targets).
 */
export const fetchRoleLinkPreview = createAction(
  roleLinkPreviewRequestSchema,
  async (input): Promise<FetchRoleLinkPreviewResult> => {
    await requireUser();
    const preview = await fetchLinkPreview(input.url);
    return { preview };
  },
  {
    rateLimit: { key: 'mindsetter-onboarding:link-preview', limit: 20, window: '10 m' },
  },
);

export const saveSuperpowers = createAction(superpowersStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: superpowersError } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, superpowers: input.superpowers }, { onConflict: 'id' });

  if (superpowersError) {
    console.error('[mindsetter-onboarding] superpowers upsert failed:', superpowersError);
    throw new ActionError('internal_error', 'Could not save your superpowers. Please try again.');
  }

  await advanceOnboardingStep(supabase, user.id, SUPERPOWERS_STEP_ONBOARDING_STEP);

  return { superpowers: input.superpowers };
});

export const saveHelp = createAction(helpStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: helpError } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, help_with: input.expertise }, { onConflict: 'id' });

  if (helpError) {
    console.error('[mindsetter-onboarding] help_with upsert failed:', helpError);
    throw new ActionError('internal_error', 'Could not save your expertise. Please try again.');
  }

  await advanceOnboardingStep(supabase, user.id, HELP_STEP_ONBOARDING_STEP);
  // Help is the last REQUIRED step, so this is where the caller becomes a Mindsetter (Release 4
  // П1, owner's call 06.11.2026): the "Shine" picker and the blocks after it are optional, and
  // its new "See how looks my profile page" button must open a page that already exists. Before,
  // the promotion waited for `saveShine`, so leaving from that preview kept a finished caller a
  // Member.
  await promoteIfCoreWizardDone(user.id);

  return { expertise: input.expertise };
});

/**
 * Step 4/5 "Make your profile shine" — the optional-block picker, now reached right after Help
 * instead of after Personal session (product decision D9). Unlike every step above, the picker's
 * own selection is never written anywhere: it's handed to the first picked block screen via a
 * query-param handoff (`lib/mindsetter-onboarding/blocks.ts`), not a DB column, per this stage's
 * build decision. So this action has nothing to upsert — it exists purely to advance
 * `mindsetter_profiles.onboarding_step` to 4, run for BOTH the "Continue fill" and "Skip" paths
 * (`ShineForm.tsx`), since reaching/leaving this step either way means the picker itself is done,
 * regardless of which (if any) optional blocks were picked.
 *
 * The promotion to Mindsetter normally happened one step earlier, in `saveHelp` (Release 4 П1).
 * It still runs here too, idempotently, for a caller who saved Help before that change and is
 * still a Member (Release-2 П4 put it here first: "the status changes once the required fields
 * are filled").
 */
export const saveShine = createAction(shineStepSchema, async () => {
  const user = await requireUser();
  const supabase = await createClient();

  await advanceOnboardingStep(supabase, user.id, SHINE_STEP_ONBOARDING_STEP);
  await promoteIfCoreWizardDone(user.id);

  return {};
});

const finalizeMindsetterOnboardingSchema = z.object({});

export type FinalizeMindsetterOnboardingResult = {
  /** `true` once `profiles.account_type` is (or already was) `'mindsetter'`. */
  finalized: boolean;
  /** The caller's current `mindsetter_profiles.onboarding_step`, always returned so a caller
   * that gets `finalized: false` back knows exactly which core step to send the user back to. */
  onboardingStep: number;
};

/**
 * Onboarding doc section 8 / section B's resolved decision (D1, flagged for security review):
 * saving the REQUIRED steps (Roles → Superpowers → Help, i.e.
 * `mindsetter_profiles.onboarding_step >= HELP_STEP_ONBOARDING_STEP` with their data present —
 * the Shine picker and the blocks after it are optional since Release 4 П1) flips
 * `profiles.account_type` from `'member'` to `'mindsetter'`. This does NOT verify the account.
 * Since 06.11.2026 it DOES publish the page (`mindsetter_profiles.is_public = true`) at that same
 * flip, unless `MINDSETTER_AUTO_PUBLISH=false` — the owner's interim rule until the back office
 * exists (see `lib/config/mindsetter-publication.ts`); the spec's "published after staff
 * verification" (§5.7) returns with it. Never touches `verification_status`/`is_blocked`.
 *
 * `account_type` is one of the staff-only columns guarded by
 * `guard_profiles_protected_columns()` (onboarding doc section B) — a plain client update
 * throws. So, mirroring the narrow, justified service-role precedent in `(auth)/actions.ts`'s
 * `updatePassword` (its `access_restricted`/`verification_deadline` reset), this reaches for the
 * service-role client for exactly ONE update, scoped to `user.id` resolved from the caller's own
 * authenticated session (`requireUser()` — never a client-supplied id), and only after
 * re-reading that same caller's own `mindsetter_profiles.onboarding_step` via the normal
 * (RLS-respecting) server client first. If the core wizard isn't done yet, this returns
 * `{ finalized: false, onboardingStep }` instead of flipping anything — the caller (the congrats
 * page) uses `onboardingStep` to redirect back to wherever the user left off, rather than
 * showing congrats prematurely.
 *
 * Idempotent: a caller who is already `'mindsetter'` (e.g. revisits `/congrats` later) gets
 * `{ finalized: true, ... }` back with no further write — never errors on a repeat call.
 *
 * The promotion normally happens earlier, in `saveHelp` (Release 4 П1; `saveShine` before that,
 * Release-2 П4), through the same `promoteIfCoreWizardDone`; this action stays as the `/congrats` safety net (and the repair path
 * `resolveOnboardingRedirect` sends a not-yet-promoted finisher down).
 */
export const finalizeMindsetterOnboarding = createAction(
  finalizeMindsetterOnboardingSchema,
  async (): Promise<FinalizeMindsetterOnboardingResult> => {
    const user = await requireUser();
    return promoteIfCoreWizardDone(user.id);
  },
);

/**
 * The guarded `account_type` flip shared by `saveShine` and `finalizeMindsetterOnboarding` —
 * see the latter's doc comment for why it is safe. `userId` must come from `requireUser()`,
 * never from client input.
 */
async function promoteIfCoreWizardDone(
  userId: string,
): Promise<FinalizeMindsetterOnboardingResult> {
  const supabase = await createClient();

  const [
    { data: mindsetterProfile, error: mindsetterProfileReadError },
    { data: profile, error: profileReadError },
  ] = await Promise.all([
    supabase
      .from('mindsetter_profiles')
      .select('onboarding_step, roles, superpowers, help_with')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('profiles').select('account_type, is_blocked').eq('id', userId).maybeSingle(),
  ]);

  if (mindsetterProfileReadError || profileReadError) {
    console.error(
      '[mindsetter-onboarding] finalize: profile read failed:',
      mindsetterProfileReadError ?? profileReadError,
    );
    throw new ActionError(
      'internal_error',
      'Could not finalize your Mindsetter profile. Please try again.',
    );
  }

  // Help (3) is the last required step since Release 4 П1 — the Shine picker (4) is optional.
  const onboardingStep = mindsetterProfile?.onboarding_step ?? 0;
  if (onboardingStep < HELP_STEP_ONBOARDING_STEP) {
    return { finalized: false, onboardingStep };
  }

  if (profile?.account_type === 'mindsetter') {
    return { finalized: true, onboardingStep };
  }

  // The counter alone is not proof: `saveShine` raises it to 4 for whoever calls it, so promote
  // only when the three data-carrying required steps are actually saved (Release-2 П4 — "the
  // status changes once the required fields are filled"). Otherwise report the steps saved before
  // the first missing one as `onboardingStep`, so `/congrats` sends the caller back to it.
  const missingStep = firstMissingMindsetterStep({
    roles: mindsetterProfile?.roles ?? null,
    superpowers: mindsetterProfile?.superpowers ?? null,
    helpWith: mindsetterProfile?.help_with ?? null,
  });
  if (missingStep) {
    return { finalized: false, onboardingStep: REQUIRED_STEP_COUNTERS[missingStep] - 1 };
  }

  // Narrow, one-off service-role write — see `finalizeMindsetterOnboarding`'s doc comment for
  // why this can't go through the normal server client, and why it's safe (own row, server-derived
  // id, guarded).
  const service = createServiceClient();
  const { error: flipError } = await service
    .from('profiles')
    .update({ account_type: 'mindsetter' })
    .eq('id', userId);

  if (flipError) {
    console.error('[mindsetter-onboarding] finalize: account_type flip failed:', flipError);
    throw new ActionError(
      'internal_error',
      'Could not finalize your Mindsetter profile. Please try again.',
    );
  }

  // Publish the page at the same moment (owner's decision 06.11.2026, see
  // `lib/config/mindsetter-publication.ts`). Same narrow service-role write — `is_public` is
  // staff-only (`guard_mindsetter_profiles_is_public` lets only staff/service role change it) — on
  // the caller's own row. Only here, at the member → mindsetter flip, so re-saving a step later
  // never re-publishes a page staff unpublished. Not fatal: the caller IS a Mindsetter now, and a
  // missed publish is a staff fix, not a reason to fail their save.
  // A blocked account is never published (it would go public the day it's unblocked, without a
  // staff decision) — same rule as the 20261106150000 backfill.
  if (isMindsetterAutoPublishEnabled() && !profile?.is_blocked) {
    const { error: publishError } = await service
      .from('mindsetter_profiles')
      .update({ is_public: true })
      .eq('id', userId);

    if (publishError) {
      console.error('[mindsetter-onboarding] finalize: auto-publish failed:', publishError);
    }
  }

  return { finalized: true, onboardingStep };
}

// -----------------------------------------------------------------------------------------
// Optional blocks (onboarding doc section 7). Unlike every step above, none of these advance
// `mindsetter_profiles.onboarding_step` — the core wizard is already at step 5 (`saveShine`) by
// the time any block screen runs, so each of these just upserts its own `mindsetter_profiles` column,
// same plain-RLS "caller owns their own row" reasoning as `saveRoles`/`saveSuperpowers`/`saveHelp`.
// -----------------------------------------------------------------------------------------

export const savePromo = createAction(promoStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  // Link-only since 2026-08-05 — direct upload was removed, so there is no longer a Storage
  // object path to validate or persist. Writing the object WITHOUT a `videoPath` key also
  // clears it for anyone whose row still carries one from the old flow.
  // Orientation decides which promo layout the public profile uses (16:9 landscape vs a
  // Shorts-style portrait). Resolved once here, at write time, rather than on every page render:
  // YouTube answers from the URL alone, Vimeo needs an oEmbed round trip we don't want in the
  // render path. Stored inside the existing `promo_video` jsonb, so no migration.
  // The same round trip also yields Vimeo's cover image (`thumbnailUrl`, a `*.vimeocdn.com` https
  // URL — validated inside `resolveVideoMeta`), stored so the render path needs no network call.
  const { orientation, thumbnailUrl } = await resolveVideoMeta(input.youtube, input.vimeo);

  // Custom cover (Release 4 П7): only a path inside the caller's own folder is accepted.
  const thumbnailPath = input.thumbnailPath?.trim() || null;
  if (thumbnailPath && !thumbnailPath.startsWith(`${user.id}/`)) {
    throw new ActionError('validation_error', 'Invalid photo.');
  }

  // The thumbnail currently stored, so it can be removed from Storage once it is replaced/cleared.
  const { data: existing } = await supabase
    .from('mindsetter_profiles')
    .select('promo_video')
    .eq('id', user.id)
    .maybeSingle();
  const previousThumbnailPath = (
    existing?.promo_video as { thumbnailPath?: unknown } | null | undefined
  )?.thumbnailPath;

  // Keys are only written when set, so a row without a cover keeps the old shape (absent =
  // none). `thumbnailUrl` = Vimeo's CDN cover; `thumbnailPath` = the member's own upload.
  const { error } = await supabase.from('mindsetter_profiles').upsert(
    {
      id: user.id,
      promo_video: {
        youtube: input.youtube || null,
        vimeo: input.vimeo || null,
        orientation,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(thumbnailPath ? { thumbnailPath } : {}),
      },
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[mindsetter-onboarding] promo_video upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your promo video. Please try again.');
  }

  // Best-effort tidy-up AFTER the save succeeded (had it failed, the old object is still the live
  // cover). A failure only leaves an orphan; the profile never references it.
  if (
    typeof previousThumbnailPath === 'string' &&
    previousThumbnailPath !== thumbnailPath &&
    previousThumbnailPath.startsWith(`${user.id}/`) &&
    PROMO_THUMBNAIL_PATH.test(previousThumbnailPath)
  ) {
    const { error: removeError } = await supabase.storage
      .from('covers')
      .remove([previousThumbnailPath]);
    if (removeError) {
      console.error('[mindsetter-onboarding] previous promo thumbnail remove failed:', removeError);
    }
  }

  return { ...input };
});

// --- Promo thumbnail (private `covers` bucket) -----------------------------------------------
// Same mechanics as the Reel Life photo above: uploaded by its own Server Action the moment the
// file is picked (session client, owner-folder RLS), only the path is later sent to `savePromo`.

/** Signed-URL lifetime for the just-uploaded preview; page loads mint fresh ones. */
const PROMO_THUMBNAIL_SIGNED_URL_TTL_SECONDS = 60 * 60;

type DetectedImage = {
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  ext: 'png' | 'jpg' | 'webp';
};

/**
 * Real image type from the file's leading bytes — `file.type` is client-declared and untrusted.
 * PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`, WebP `RIFF????WEBP`; anything else is `null`.
 */
async function detectPromoThumbnailType(file: File): Promise<DetectedImage | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const at = (offset: number, bytes: number[]) => bytes.every((b, i) => head[offset + i] === b);

  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

/**
 * Uploads the optional promo cover into `covers/<uid>/promo-thumb-<ts>-<rand>.<ext>` and returns
 * `{ path, url }` (short-lived signed URL for the preview). Not attached to the profile until
 * `savePromo` receives the path. Needs the `covers_select_own` policy for `createSignedUrl`
 * (migration `20261106130000`).
 */
export const uploadPromoThumbnail = createAction(
  promoThumbnailUploadSchema,
  async (input) => {
    const user = await requireUser();
    const supabase = await createClient();

    const detected = await detectPromoThumbnailType(input.thumbnail);
    if (!detected) throw new ActionError('validation_error', vmsg('promoThumbnailType'));

    // The random part is alphanumeric only, so the name always matches `PROMO_THUMBNAIL_PATH`.
    const random = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    const path = `${user.id}/promo-thumb-${Date.now()}-${random}.${detected.ext}`;
    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, input.thumbnail, { contentType: detected.mime });

    if (uploadError) {
      console.error('[mindsetter-onboarding] promo thumbnail upload failed:', uploadError);
      throw new ActionError('internal_error', 'Could not upload your thumbnail. Please try again.');
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('covers')
      .createSignedUrl(path, PROMO_THUMBNAIL_SIGNED_URL_TTL_SECONDS);

    if (signError || !signed) {
      console.error('[mindsetter-onboarding] promo thumbnail signed URL failed:', signError);
      throw new ActionError('internal_error', 'Could not load your thumbnail. Please try again.');
    }

    return { path, url: signed.signedUrl };
  },
  { rateLimit: { key: 'mindsetter-onboarding:promo-thumbnail-upload', limit: 30, window: '10 m' } },
);

/**
 * Best-effort delete of a promo thumbnail object the caller uploaded but did not (or no longer
 * wants to) save. Scoped to the caller's own folder. Never used for the currently SAVED cover —
 * `savePromo` removes that one itself once the replacement/clear is persisted.
 */
export const deletePromoThumbnail = createAction(promoThumbnailDeleteSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  if (!input.path.startsWith(`${user.id}/`)) {
    throw new ActionError('validation_error', 'Invalid photo.');
  }

  const { error } = await supabase.storage.from('covers').remove([input.path]);
  if (error) {
    console.error('[mindsetter-onboarding] promo thumbnail delete failed:', error);
  }

  return {};
});

export const saveVideoBlog = createAction(videoBlogStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('mindsetter_profiles').upsert(
    {
      id: user.id,
      video_blog: {
        youtube: input.youtube || null,
        vimeo: input.vimeo || null,
        orientation: await resolveVideoOrientation(input.youtube, input.vimeo),
      },
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[mindsetter-onboarding] video_blog upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your video blog. Please try again.');
  }

  return { ...input };
});

export const saveNumbers = createAction(numbersStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, numbers: input.numbers }, { onConflict: 'id' });

  if (error) {
    console.error('[mindsetter-onboarding] numbers upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your numbers. Please try again.');
  }

  return { numbers: input.numbers };
});

export const saveWins = createAction(winsStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, wins: input.wins }, { onConflict: 'id' });

  if (error) {
    console.error('[mindsetter-onboarding] wins upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your wins. Please try again.');
  }

  return { wins: input.wins };
});

export const saveMyWay = createAction(myWayStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, my_way: input.myWay }, { onConflict: 'id' });

  if (error) {
    console.error('[mindsetter-onboarding] my_way upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your way. Please try again.');
  }

  return { myWay: input.myWay };
});

export const saveFckups = createAction(fckupsStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, fckups: input.fckups }, { onConflict: 'id' });

  if (error) {
    console.error('[mindsetter-onboarding] fckups upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your f*ckups. Please try again.');
  }

  return { fckups: input.fckups };
});

export const savePhilosophy = createAction(philosophyStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('mindsetter_profiles').upsert(
    {
      id: user.id,
      philosophy: input.philosophy,
      // Empty stays NULL rather than an empty string, so "no author" is one value in the column
      // and the profile's own `?.trim()` checks don't have to special-case both.
      philosophy_author: input.philosophyAuthor?.trim() || null,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[mindsetter-onboarding] philosophy upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your philosophy. Please try again.');
  }

  return { philosophy: input.philosophy };
});

// --- Reel Life (private-bucket photo gallery) -----------------------------------------------
// See `lib/validation/mindsetter.ts`'s "Reel Life" section header for the full upload-mechanism
// rationale: one Server Action per photo (`uploadReelLifePhoto`), fired the moment it's picked in
// `ReelLifeForm.tsx`, rather than batching every pending `File` into the final `saveReelLife`
// submission.

/** How long a freshly-uploaded photo's signed URL stays valid — long enough to render the
 * thumbnail immediately and for the rest of that one onboarding session; a fresh one is minted
 * server-side on every later page load anyway (`blocks/reel-life/page.tsx`), so there's no need
 * for a long-lived token here. */
const REEL_LIFE_SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionForReelLifeMimeType(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

/**
 * Uploads one Reel Life photo into the caller's own `reel-life/<uid>/...` Storage folder —
 * mirrors `saveMemberProfile`'s avatar-upload mechanics (same authed server client, same
 * owner-scoped RLS: `reel_life_insert_own_folder`), just called once per photo instead of once
 * per submission. Object names are randomized (not a stable per-user path like the single
 * avatar) since there can be many of these and they must never collide with each other.
 *
 * Capped at `MAX_REEL_LIFE_PHOTOS` by counting the caller's own folder in Storage (not
 * `mindsetter_profiles.reel_life`, which only gets its final value on `saveReelLife` — a caller
 * could otherwise upload past the limit before ever calling that) before allowing another
 * upload, so a caller can't accumulate unbounded 10 MB files by repeatedly calling this action
 * without ever finishing the step.
 *
 * Returns a *signed* URL (not a public one — unlike `avatars`, `reel-life` is a PRIVATE bucket,
 * see the schema-alignment migration's own comment) so the just-uploaded thumbnail can render
 * immediately in `ReelLifeForm.tsx` without a full page reload.
 */
export const uploadReelLifePhoto = createAction(
  reelLifePhotoUploadSchema,
  async (input) => {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: existing, error: listError } = await supabase.storage
      .from('reel-life')
      .list(user.id, { limit: MAX_REEL_LIFE_PHOTOS + 1 });

    if (listError) {
      console.error('[mindsetter-onboarding] reel-life folder list failed:', listError);
      throw new ActionError('internal_error', 'Could not upload your photo. Please try again.');
    }

    if ((existing?.length ?? 0) >= MAX_REEL_LIFE_PHOTOS) {
      throw new ActionError(
        'validation_error',
        `You can add up to ${MAX_REEL_LIFE_PHOTOS} photos.`,
      );
    }

    const path = `${user.id}/reel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionForReelLifeMimeType(input.photo.type)}`;
    const { error: uploadError } = await supabase.storage
      .from('reel-life')
      .upload(path, input.photo, { contentType: input.photo.type });

    if (uploadError) {
      console.error('[mindsetter-onboarding] reel-life photo upload failed:', uploadError);
      throw new ActionError('internal_error', 'Could not upload your photo. Please try again.');
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('reel-life')
      .createSignedUrl(path, REEL_LIFE_SIGNED_URL_TTL_SECONDS);

    if (signError || !signed) {
      console.error('[mindsetter-onboarding] reel-life signed URL failed:', signError);
      throw new ActionError('internal_error', 'Could not load your photo. Please try again.');
    }

    return { path, url: signed.signedUrl };
  },
  // Defense-in-depth alongside the in-handler folder-count cap above: bounds how many upload
  // attempts (successful or not) one caller can fire in a window, same IP-keyed pattern every
  // other rate-limited action in this codebase uses (`createAction`'s `rateLimit` option).
  { rateLimit: { key: 'mindsetter-onboarding:reel-life-upload', limit: 30, window: '10 m' } },
);

/**
 * Best-effort delete of one Reel Life Storage object, fired when the caller removes a photo
 * tile in `ReelLifeForm.tsx`. Scoped to the caller's own folder (mirrors the bucket's own
 * `reel_life_delete_own` RLS policy) so a client-supplied path can never delete another user's
 * object. Not fatal on failure — `mindsetter_profiles.reel_life` (written by `saveReelLife`) is
 * the real source of truth for what's shown on the profile; an orphaned Storage object here
 * doesn't corrupt any user-visible state, just wastes a little Storage space.
 */
export const deleteReelLifePhoto = createAction(reelLifePhotoDeleteSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  if (!input.path.startsWith(`${user.id}/`)) {
    throw new ActionError('validation_error', 'Invalid photo.');
  }

  const { error } = await supabase.storage.from('reel-life').remove([input.path]);
  if (error) {
    console.error('[mindsetter-onboarding] reel-life photo delete failed:', error);
  }

  return {};
});

/**
 * Optional block "Reel Life" (onboarding doc section 7) — unlike `uploadReelLifePhoto` above,
 * this just upserts the final ORDERED array of already-uploaded paths onto
 * `mindsetter_profiles.reel_life`. Re-checks that every path belongs to the caller's own folder
 * (never trust client-supplied paths outright, even though Storage RLS already prevents
 * reading/deleting someone else's object) before writing.
 */
export const saveReelLife = createAction(reelLifeStepSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const hasForeignPath = input.reelLife.some((path) => !path.startsWith(`${user.id}/`));
  if (hasForeignPath) {
    throw new ActionError('validation_error', 'Invalid photo.');
  }

  // TODO confirm min-3 enforcement — the design's "Add at least 3 photos to activate this
  // section" hint is informational only for MVP; any count from 0 up to MAX_REEL_LIFE_PHOTOS is
  // accepted here (see `lib/validation/mindsetter.ts`'s "Reel Life" section header).
  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, reel_life: input.reelLife }, { onConflict: 'id' });

  if (error) {
    console.error('[mindsetter-onboarding] reel_life upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your photos. Please try again.');
  }

  return { reelLife: input.reelLife };
});
