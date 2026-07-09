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
export const INTEREST_CATEGORIES = [
  'Sports & Health',
  'Travel & Outdoors',
  'Gastronomy',
  'Culture & Art',
  'Social & Impact',
] as const;
