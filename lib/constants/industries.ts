/**
 * Curated "industry" catalog for the registration wizard's step 3/4 form ("What do you
 * build?", Figma "Member profile 3/4"). No fixed catalog was visible in the design (per the
 * stage 1.4 Figma audit — "use your judgment"), so this is a deliberately small, curated list
 * of common industries. Mirrors `lib/constants/languages.ts` / `lib/constants/interests.ts`: a
 * static, code-defined catalog rather than a DB seed table — the same "code-defined list over
 * DB table" precedent as the interests-catalog refactor (commit `d8bcef3`). `profiles.industry`
 * is a plain `text` column (`20260714101121_profiles_step3_build_fields.sql`), so no migration
 * is needed to introduce this fixed option set.
 *
 * `value` is what gets stored on `profiles.industry` and submitted by the `Select`; `label` is
 * the display string. Not run through next-intl — a catalog value, not translated UI copy,
 * same convention as `SUPPORTED_LANGUAGES`/`INTERESTS`.
 */
export const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'retail', label: 'Retail' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'media-entertainment', label: 'Media & Entertainment' },
  { value: 'non-profit', label: 'Non-profit' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]['value'];

export const INDUSTRY_VALUES = INDUSTRIES.map((industry) => industry.value) as [
  IndustryValue,
  ...IndustryValue[],
];
