/**
 * Fixed category list for the "Choose your interests" filter chips (Figma: All, Sports &
 * Health, Travel & Outdoors, Gastronomy, Culture & Art, Social & Impact).
 *
 * Deliberately a static list, NOT derived from the `interests` catalog table's distinct
 * `category` values: per `supabase/migrations/20260707141211_profile_step2_interests.sql`,
 * only "Sports & Health" is seeded with tag rows so far — the other four categories exist
 * in the confirmed product taxonomy but have zero rows until a follow-up migration adds
 * their tags. Deriving the chip list from present rows would silently hide those four
 * categories instead of showing them (empty) as the migration's own comment expects.
 */
export const INTEREST_CATEGORIES = [
  'Sports & Health',
  'Travel & Outdoors',
  'Gastronomy',
  'Culture & Art',
  'Social & Impact',
] as const;
