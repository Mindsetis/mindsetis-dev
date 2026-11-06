'use client';

import { useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';

import { GuardedLink } from '@/components/dashboard/GuardedLink';
import {
  isReturnToProfile,
  RETURN_TO_PROFILE_PARAM,
  withReturnToProfile,
} from '@/lib/profile/return-to-profile';

const SECTION_LIST_HREF = '/dashboard/profile';

/**
 * A section editor's "All sections" link (`SectionEditorShell`). Keeps `?from=profile` when the
 * editor was opened that way (Release 4 П2), so the owner who came in through their public
 * profile's "Edit" and backs out to pick a different section still returns to the profile after
 * saving that one. The shell itself is a Server Component and can't read the query, hence this
 * thin client wrapper.
 */
export function AllSectionsLink(props: Omit<ComponentProps<typeof GuardedLink>, 'href'>) {
  const returnToProfile = isReturnToProfile(useSearchParams().get(RETURN_TO_PROFILE_PARAM));
  return (
    <GuardedLink
      href={returnToProfile ? withReturnToProfile(SECTION_LIST_HREF) : SECTION_LIST_HREF}
      {...props}
    />
  );
}
