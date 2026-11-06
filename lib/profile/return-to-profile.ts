/**
 * "Edit" on a Mindsetter's own public profile (Release 4 П2, 06.11.2026): it opens the cabinet's
 * section list, and once the owner saves a section they land back on their public page instead of
 * walking on to the next section ("Save & Next", `useCabinetSaved`).
 *
 * The intent rides along as `?from=profile` — on the section list, on every section card link out
 * of it, and on the editors' "All sections" link back — so nothing is stored anywhere. Leaving the
 * cabinet any other way simply drops it.
 */
export const RETURN_TO_PROFILE_PARAM = 'from';
export const RETURN_TO_PROFILE_VALUE = 'profile';

/** The section list, opened from the public profile's "Edit". */
export const MANAGE_PROFILE_FROM_PROFILE_HREF = `/dashboard/profile?${RETURN_TO_PROFILE_PARAM}=${RETURN_TO_PROFILE_VALUE}`;

/**
 * Redirects to the signed-in user's own public page (`/mindsetters/<username>` or
 * `/members/<username>`) — client code that only knows "go back to my profile" uses this instead of
 * having to carry the username around.
 */
export const OWN_PUBLIC_PROFILE_HREF = '/dashboard/profile/public';

export function isReturnToProfile(value: string | string[] | null | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === RETURN_TO_PROFILE_VALUE;
}

/** Appends `?from=profile` to a plain cabinet path (none of them carry a query of their own). */
export function withReturnToProfile(href: string): string {
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}${RETURN_TO_PROFILE_PARAM}=${RETURN_TO_PROFILE_VALUE}`;
}
