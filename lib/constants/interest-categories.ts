/**
 * Fixed category list for the "Choose your interests" filter chips (Figma: All, Sports &
 * Health, Travel & Outdoors, Gastronomy, Culture & Art, Social & Impact).
 *
 * Deliberately a static list, NOT derived from the `interests` catalog table's distinct
 * `category` values — a category with no seeded tags (temporarily or by product design)
 * should still show up as an empty chip rather than silently disappearing from the filter.
 * All five categories are now seeded with tags (see `20260707141211_profile_step2_interests.sql`
 * + the `20260707154047_..._remaining_categories.sql` follow-up).
 */
// The strings are the English identity of each category; displayed names come from the
// `catalog.interestCategories.*` next-intl keys (see `INTEREST_CATEGORY_KEY` below).
export const INTEREST_CATEGORIES = [
  'Sports & Health',
  'Travel & Outdoors',
  'Gastronomy',
  'Culture & Art',
  'Social & Impact',
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

/**
 * Key of each category in the `catalog.interestCategories` next-intl namespace. The English
 * strings above stay the identity used by `INTERESTS.category` and the picker's tab state; the
 * display name in the viewer's locale is looked up through this key
 * (`lib/constants/catalog-labels.ts`).
 */
export const INTEREST_CATEGORY_KEY: Readonly<Record<InterestCategory, string>> = {
  'Sports & Health': 'sports-health',
  'Travel & Outdoors': 'travel-outdoors',
  Gastronomy: 'gastronomy',
  'Culture & Art': 'culture-art',
  'Social & Impact': 'social-impact',
};
