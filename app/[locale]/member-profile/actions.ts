'use server';

/**
 * Server Action for the registration wizard's step 2/4 ("Member profile" — see
 * `page.tsx`). Validates the full step-2 form (including the avatar `File`), uploads the
 * photo to the `avatars` Storage bucket (public-read, write-own-folder), upserts `profiles`,
 * and atomically replaces the caller's `profile_interests` selection.
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

  // 1. Upload the photo into the caller's own folder — required by the bucket's RLS
  //    policies (`avatars_insert_own_folder` etc.), which key off the first path segment
  //    matching `auth.uid()`. The path is stable per user (not timestamped), so `upsert: true`
  //    actually replaces the previous avatar object instead of accumulating orphaned files,
  //    and a re-submission of this step overwrites the prior upload instead of erroring.
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
  // public via the `profiles_read` RLS policy), so a plain public URL is stored rather than a
  // long-lived signed bearer token.
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  const socials = {
    linkedin: input.linkedin,
    ...(input.instagram ? { instagram: input.instagram } : {}),
    ...(input.facebook ? { facebook: input.facebook } : {}),
    ...(input.tiktok ? { tiktok: input.tiktok } : {}),
    ...(input.threads ? { threads: input.threads } : {}),
    ...(input.youtube ? { youtube: input.youtube } : {}),
    ...(input.website ? { website: input.website } : {}),
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
      country: input.country,
      city: input.city,
      languages: input.languages,
      bio: input.bio,
      about: input.about?.trim() || null,
      avatar_url: publicUrl,
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

  // 3. Replace-all interests atomically via the `replace_profile_interests` DB function
  //    (see `supabase/migrations/20260707150500_fix_profile_interests_race_and_avatar_public_read.sql`),
  //    which locks
  //    the profile row, deletes the caller's existing selections, and inserts the new set as
  //    a single transaction — no partial-loss window if the insert half fails, and the row
  //    lock also closes the race on the max-10 cap under concurrent requests.
  const { error: interestsError } = await supabase.rpc('replace_profile_interests', {
    p_profile_id: user.id,
    p_interest_ids: input.interestIds,
  });
  if (interestsError) {
    console.error('[member-profile] saving interests failed:', interestsError);
    throw new ActionError('internal_error', 'Could not save your interests. Please try again.');
  }

  return { username: input.username };
});
