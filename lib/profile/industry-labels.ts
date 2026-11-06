import { type CatalogTranslator, getIndustryLabelMap } from '@/lib/constants/catalog-labels';
import { OTHER_INDUSTRY_VALUE } from '@/lib/constants/industries';

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
 *
 * Catalog labels are translated into the viewer's locale with `tCatalog`
 * (`getTranslations('catalog')` on the page). The free-text custom industry is user content and
 * is shown verbatim, never translated.
 */
export function resolveIndustryLabels(
  profile: {
    industries: string[] | null;
    industryCustom: string | null;
    industryCustomStatus: string | null;
  },
  tCatalog: CatalogTranslator,
): string[] {
  const labelByValue = getIndustryLabelMap(tCatalog);
  const customText =
    profile.industryCustomStatus === 'approved' ? (profile.industryCustom?.trim() ?? '') : '';

  return (profile.industries ?? [])
    .map((value) => (value === OTHER_INDUSTRY_VALUE ? customText : (labelByValue.get(value) ?? '')))
    .filter((label) => label.length > 0);
}
