'use server';

/**
 * Server Action for the registration wizard's step 3/4 ("Member profile" — see
 * `page.tsx`). Validates the full step-2 form, uploads a newly-picked avatar `File` to the
 * `avatars` Storage bucket (public-read, write-own-folder) — or reuses the caller's existing
 * `avatar_url` when resubmitting without picking a new one — and upserts `profiles`
 * (`interests` is just another plain column on that row, a `text[]` of code-defined slugs;
 * see `lib/constants/interests.ts`).
 */
import { createAction } from '@/lib/api';
import { ActionError } from '@/lib/api/errors';
import { requireUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import { memberProfileActionSchema } from '@/lib/validation/member-profile';

function extensionForMimeType(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

export const saveMemberProfile = createAction(memberProfileActionSchema, async (input) => {
  const user = await requireUser();
  const supabase = await createClient();

  // 1. Resolve the avatar URL to store. A new file was picked -> upload it (as before). No
  //    new file was picked (`input.avatar` is `undefined` — schema-level allowed, see
  //    `memberProfileActionSchema`'s doc comment) -> this must be a resubmission of a
  //    profile that already has a saved photo; reuse it rather than re-uploading, and reject
  //    only if there truly isn't one on file yet. This is a server-side check against the
  //    real row (never trust a client-supplied "I already have a photo" flag).
  let avatarUrl: string;
  if (input.avatar) {
    // Upload the photo into the caller's own folder — required by the bucket's RLS
    // policies (`avatars_insert_own_folder` etc.), which key off the first path segment
    // matching `auth.uid()`. The path is stable per user (not timestamped), so `upsert: true`
    // actually replaces the previous avatar object instead of accumulating orphaned files,
    // and a re-submission of this step overwrites the prior upload instead of erroring.
    const path = `${user.id}/avatar.${extensionForMimeType(input.avatar.type)}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, input.avatar, { contentType: input.avatar.type, upsert: true });
    if (uploadError) {
      console.error('[member-profile] avatar upload failed:', uploadError);
      throw new ActionError(
        'internal_error',
        'Could not upload your profile photo. Please try again.',
      );
    }

    // `avatars` has a public-read Storage policy (profiles.avatar_url is already effectively
    // public via the `profiles_read` RLS policy), so a plain public URL is stored rather than
    // a long-lived signed bearer token.
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

  // Resolve the location from the two submitted identifiers. The client sends ONLY ids; every
  // stored label (country name, city name, region, timezone) is read back from the reference
  // tables here. This is what makes the picker actually worth having — otherwise a caller
  // could post `cityGeonameId` of a real city alongside any display string they wanted, and
  // the catalog would be filtering on attacker-chosen text again.
  const geonameId = Number(input.cityGeonameId);
  const countryCode = input.countryCode.toUpperCase();

  const { data: cityRow } = await supabase
    .from('geo_cities')
    .select('geoname_id, name, country_code, admin1_code, timezone')
    .eq('geoname_id', geonameId)
    .maybeSingle();

  // Also rejects a city that doesn't belong to the submitted country — the two fields are
  // independent inputs, so "Lviv" + "Spain" is reachable by a crafted request even though
  // the UI clears the city whenever the country changes.
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

  // Region is looked up only where the city actually has one — most countries don't, and a
  // missing subdivision is a normal state, not an error (Singapore, Monaco, Hong Kong).
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

  const socials = {
    website: input.website,
    ...(input.instagram ? { instagram: input.instagram } : {}),
    ...(input.facebook ? { facebook: input.facebook } : {}),
    ...(input.tiktok ? { tiktok: input.tiktok } : {}),
    ...(input.threads ? { threads: input.threads } : {}),
    ...(input.youtube ? { youtube: input.youtube } : {}),
    ...(input.linkedin ? { linkedin: input.linkedin } : {}),
  };

  // 2. Upsert the profile fields. `profiles_update_own` RLS (see
  //    `supabase/migrations/20260701100100_profiles.sql`) lets the caller update their own
  //    row; the row itself already exists from the `handle_new_user` signup trigger, so a
  //    plain `update` (not `upsert`) is correct here. `onboarding_step` advances to 2 so
  //    later steps/gating can tell this step is complete.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      username: input.username,
      // `country` / `city` are denormalized display snapshots; the *_code / geoname_id
      // columns beside them are the filterable source of truth.
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
      socials,
      onboarding_step: 2,
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('[member-profile] profile update failed:', profileError);
    // Postgres unique_violation — the only realistic conflict here is `profiles.username`.
    if (profileError.code === '23505') {
      throw new ActionError('conflict', 'That username is already taken.', {
        username: ['That username is already taken.'],
      });
    }
    throw new ActionError('internal_error', 'Could not save your profile. Please try again.');
  }

  return { username: input.username };
});
