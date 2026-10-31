import { INDUSTRIES, OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries';

/** Catalog slug → display label (`lib/constants/industries.ts`; same catalog the wizard uses). */
const INDUSTRY_LABEL_BY_VALUE = new Map<string, string>(
  INDUSTRIES.map((industry) => [industry.value, industry.label]),
);

/**
 * `profiles.industries` (+ the free-text "Other") → the labels shown in the INDUSTRY pill, in the
 * order the member picked them. Shared by BOTH public profile pages — `/members/[username]` and
 * `/mindsetters/[username]` read the same `profiles` columns, so they must apply the same rule.
 * (Moved here from `MemberProfileView.tsx` when the Mindsetter profile got the pill too — "Правки
 * 3.0" П9.)
 *
 * MODERATION RULE — this is the gate, keep it the only way industry reaches a page. A member's
 * free-text `industry_custom` is user-submitted and staff-moderated (`industry_custom_status`:
 * 'pending' | 'approved' | 'rejected'); it may be shown to other people ONLY once it is
 * `'approved'`. The `other` slug is therefore replaced by that text when approved, and simply
 * DROPPED otherwise (a bare "Other" tells the reader nothing, and a pending/rejected value must
 * not leak). The page calls this server-side BEFORE building the view's props, so the raw custom
 * text and its status never enter a profile view component at all.
 *
 * A slug no longer present in the catalog (renamed/removed after the profile saved it) is
 * silently skipped, same defensive precedent as `groupInterestsByCategory`. Returns `[]` when
 * there is nothing to show.
 */
export function resolveIndustryLabels(profile: {
  industries: string[] | null;
  industryCustom: string | null;
  industryCustomStatus: string | null;
}): string[] {
  const customText =
    profile.industryCustomStatus === 'approved' ? (profile.industryCustom?.trim() ?? '') : '';

  return (profile.industries ?? [])
    .map((value) =>
      value === OTHER_INDUSTRY_VALUE ? customText : (INDUSTRY_LABEL_BY_VALUE.get(value) ?? ''),
    )
    .filter((label) => label.length > 0);
}
