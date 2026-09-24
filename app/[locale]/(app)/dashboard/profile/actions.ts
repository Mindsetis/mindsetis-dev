'use server';

/**
 * Server Actions for the cabinet's two Member-side section editors (Hero, Social links).
 *
 * Separate from `app/[locale]/member-profile/actions.ts` on purpose, even though the fields
 * overlap: that action belongs to the registration wizard and does wizard things — it writes
 * `onboarding_step: 2` and always saves the profile fields and the socials together, because its
 * form submits them together. The cabinet saves each section independently ("each section is saved
 * separately", Figma `610:4227`), so a Social-links save must not touch bio/location, and a Hero
 * save must not touch the social links. Sharing one action would mean one of the two sections
 * silently overwriting the other's columns with stale form state.
 *
 * The VALIDATION is shared, though — `lib/validation/dashboard-profile.ts` composes both schemas
 * out of the wizard's own field definitions, so the rules can't drift apart.
 */
import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { heroActionSchema, socialLinksActionSchema } from '@/lib/validation/dashboard-profile';
import {
  fckupsCabinetSchema,
  numbersCabinetSchema,
  philosophyCabinetSchema,
  winsCabinetSchema,
} from '@/lib/validation/mindsetter';

function extensionForMimeType(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

/**
 * Hero — names, nickname, location, languages, bio/about, interests, company/role/industries
 * (+ the optional free-text "Other" industry), photo.
 *
 * `username` is editable here (2026-08-10 product decision) even though it is this profile's public
 * URL: a unique-violation from Postgres is translated into a field-level error rather than a 500,
 * exactly as the wizard's own action does. Changing it does break previously-shared links to
 * `/members/{old}` — the form warns about that; there is no redirect/alias table in MVP.
 */
export const saveHeroSection = createAction(heroActionSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  // Avatar: a newly-picked file replaces the stored object at the caller's stable path; no file
  // means "keep what's on record", verified against the real row rather than a client flag —
  // same contract as `saveMemberProfile`, including the deliberate `upsert: true` so re-saving
  // overwrites instead of accumulating orphaned objects.
  let avatarUrl: string;
  if (input.avatar) {
    const path = `${user.id}/avatar.${extensionForMimeType(input.avatar.type)}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, input.avatar, { contentType: input.avatar.type, upsert: true });
    if (uploadError) {
      console.error('[dashboard/profile] avatar upload failed:', uploadError);
      throw new ActionError(
        'internal_error',
        'Could not upload your profile photo. Please try again.',
      );
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path);
    avatarUrl = publicUrl;
  } else {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (!existingProfile?.avatar_url) {
      throw new ActionError('validation_error', 'Please add a profile photo.', {
        avatar: ['Profile photo is required.'],
      });
    }
    avatarUrl = existingProfile.avatar_url;
  }

  // Location is re-derived from the two submitted identifiers, never taken as display text —
  // see `saveMemberProfile` for the full reasoning (a client-supplied city label is exactly the
  // free-text mess the code-backed picker exists to eliminate).
  const geonameId = Number(input.cityGeonameId);
  const countryCode = input.countryCode.toUpperCase();

  const { data: cityRow } = await supabase
    .from('geo_cities')
    .select('geoname_id, name, country_code, admin1_code, timezone')
    .eq('geoname_id', geonameId)
    .maybeSingle();

  // Also rejects a city that doesn't belong to the submitted country: the two fields are
  // independent inputs, so "Lviv" + "Spain" is reachable by a crafted request.
  if (!cityRow || cityRow.country_code !== countryCode) {
    throw new ActionError('validation_error', 'Please pick your city from the list.', {
      cityGeonameId: ['Select your city from the list.'],
    });
  }

  const { data: countryRow } = await supabase
    .from('geo_countries')
    .select('name')
    .eq('iso2', countryCode)
    .maybeSingle();

  if (!countryRow) {
    throw new ActionError('validation_error', 'Please pick your country from the list.', {
      countryCode: ['Select your country from the list.'],
    });
  }

  // Most countries have no subdivision for a given city — a missing one is a normal state.
  let regionName: string | null = null;
  if (cityRow.admin1_code) {
    const { data: regionRow } = await supabase
      .from('geo_admin1')
      .select('name')
      .eq('country_code', countryCode)
      .eq('admin1_code', cityRow.admin1_code)
      .maybeSingle();
    regionName = regionRow?.name ?? null;
  }

  // No `socials` key here — that column belongs to the Social links section. Likewise no
  // `onboarding_step`: the cabinet edits a finished profile and must never rewind or advance
  // the wizard's own progress marker.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      last_name: input.lastName,
      username: input.username,
      country: countryRow.name,
      city: cityRow.name,
      country_code: countryCode,
      city_geoname_id: cityRow.geoname_id,
      region_code: cityRow.admin1_code,
      region_name: regionName,
      timezone: cityRow.timezone,
      languages: input.languages,
      interests: input.interestIds,
      bio: input.bio,
      about: input.about?.trim() || null,
      avatar_url: avatarUrl,
      company: input.company,
      role: input.role,
      industries: input.industries,
      // `industry_custom_status` is never written here — it's staff-only, DB-guarded
      // (`guard_profiles_industry_custom_status`), and resets itself to 'pending' on the DB
      // side whenever this text actually changes.
      industry_custom: input.industryCustom?.trim() || null,
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('[dashboard/profile] hero update failed:', profileError);
    // Postgres unique_violation — the only realistic conflict here is `profiles.username`.
    if (profileError.code === '23505') {
      throw new ActionError('conflict', 'That nickname is already taken.', {
        username: ['That nickname is already taken.'],
      });
    }
    throw new ActionError('internal_error', 'Could not save your profile. Please try again.');
  }

  return { username: input.username };
});

/**
 * Social links — writes `profiles.socials` and nothing else.
 *
 * Empty optional fields are dropped rather than stored as `""` so the public profile's
 * "render a link only when the channel is set" checks stay simple, matching how the wizard
 * builds the same jsonb.
 */
export const saveSocialLinks = createAction(socialLinksActionSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const socials = {
    website: input.website,
    ...(input.instagram ? { instagram: input.instagram } : {}),
    ...(input.facebook ? { facebook: input.facebook } : {}),
    ...(input.tiktok ? { tiktok: input.tiktok } : {}),
    ...(input.threads ? { threads: input.threads } : {}),
    ...(input.youtube ? { youtube: input.youtube } : {}),
    ...(input.linkedin ? { linkedin: input.linkedin } : {}),
  };

  const { error } = await supabase.from('profiles').update({ socials }).eq('id', user.id);

  if (error) {
    console.error('[dashboard/profile] socials update failed:', error);
    throw new ActionError('internal_error', 'Could not save your links. Please try again.');
  }

  return {};
});

/**
 * The three OPTIONAL Mindsetter sections (Numbers, My Wins, F*ckUps), saved from the cabinet.
 *
 * These exist alongside the wizard's own `saveNumbers`/`saveWins`/`saveFckups` rather than
 * reusing them, for one reason: their schemas differ. The wizard's require at least one entry
 * (`min(1)`) — correct there, because a caller only ever reaches those pages by explicitly
 * picking the block at the Shine step, and a picked block is meant to be filled. The cabinet
 * renders every section as a permanent card, so an optional one must be savable EMPTY — that
 * empty save is exactly how a Mindsetter clears the section again. `createAction` validates
 * server-side, so relaxing this on the client alone would just move the rejection; the boundary
 * needs its own schema (`*CabinetSchema`, `lib/validation/mindsetter.ts`).
 *
 * They also skip `advanceOnboardingStep`: the cabinet only ever edits an ALREADY-finished
 * profile (these editors are Mindsetter-gated, and `account_type` only flips once the core
 * wizard completes), so there is no wizard progress left to advance.
 */
export const saveNumbersSection = createAction(numbersCabinetSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, numbers: input.numbers }, { onConflict: 'id' });

  if (error) {
    console.error('[dashboard/profile] numbers upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your numbers. Please try again.');
  }

  return { numbers: input.numbers };
});

export const saveWinsSection = createAction(winsCabinetSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, wins: input.wins }, { onConflict: 'id' });

  if (error) {
    console.error('[dashboard/profile] wins upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your wins. Please try again.');
  }

  return { wins: input.wins };
});

export const saveFckupsSection = createAction(fckupsCabinetSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('mindsetter_profiles')
    .upsert({ id: user.id, fckups: input.fckups }, { onConflict: 'id' });

  if (error) {
    console.error('[dashboard/profile] fckups upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your f*ckups. Please try again.');
  }

  return { fckups: input.fckups };
});

/**
 * "My Philosophy" — the quote plus its optional attribution.
 *
 * Unlike the wizard's `savePhilosophy`, an EMPTY quote is accepted (`philosophyCabinetSchema`):
 * that empty save is how the section gets cleared. A blank quote drops the author too — an
 * attribution with nothing to attribute would linger invisibly and reappear the next time someone
 * typed a quote.
 */
export const savePhilosophySection = createAction(philosophyCabinetSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  const quote = input.philosophy.trim();
  const { error } = await supabase.from('mindsetter_profiles').upsert(
    {
      id: user.id,
      philosophy: quote || null,
      philosophy_author: quote ? input.philosophyAuthor?.trim() || null : null,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[dashboard/profile] philosophy upsert failed:', error);
    throw new ActionError('internal_error', 'Could not save your philosophy. Please try again.');
  }

  return { philosophy: quote };
});
