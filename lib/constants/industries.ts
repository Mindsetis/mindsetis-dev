/**
 * Curated "industry" catalog for the registration wizard's step 4/4 form ("What do you
 * build?", Figma "Member profile 3/4"). No fixed catalog was visible in the design (per the
 * stage 1.4 Figma audit — "use your judgment"), so this is a deliberately small, curated list
 * of common industries. Mirrors `lib/constants/languages.ts` / `lib/constants/interests.ts`: a
 * static, code-defined catalog rather than a DB seed table.
 *
 * `value` is one of the up-to-3 slugs stored in `profiles.industries` (`text[]`); `label` is
 * the display string. Not run through next-intl — a catalog value, not translated UI copy,
 * same convention as `SUPPORTED_LANGUAGES`/`INTERESTS`.
 *
 * Kept in alphabetical order by `label` (Release-1 E2 requirement) — including `other`, which
 * therefore sits wherever "Other" falls alphabetically rather than pinned last. Selecting
 * `other` reveals the free-text `industryCustom` field (see `lib/validation/build-profile.ts`);
 * that value is staff-moderated (`profiles.industry_custom_status`) before it can ever appear
 * in a future search filter — this catalog file has no part in that moderation.
 */
export const INDUSTRIES = [
  { value: 'consulting', label: 'Consulting' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'events', label: 'Events' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'investments', label: 'Investments' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'media-entertainment', label: 'Media & Entertainment' },
  { value: 'non-profit', label: 'Non-profit' },
  { value: 'other', label: 'Other' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'retail', label: 'Retail' },
  { value: 'technology', label: 'Technology' },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]['value'];

export const INDUSTRY_VALUES = INDUSTRIES.map((industry) => industry.value) as [
  IndustryValue,
  ...IndustryValue[],
];

/** The catalog slug that reveals the free-text `industryCustom` field — see
 *  `lib/validation/build-profile.ts`'s `refineIndustryCustom`. */
export const OTHER_INDUSTRY_VALUE: IndustryValue = 'other';
