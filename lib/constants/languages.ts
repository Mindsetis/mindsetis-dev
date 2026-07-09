/**
 * Curated "languages spoken" catalog for the member-profile form (Figma "Member profile
 * 2/4" — "Language you speak" multi-select). No fixed catalog was visible in the design, so
 * this is a deliberately small, curated list of widely-spoken languages rather than a full
 * ISO-639 table — `value` is the stable identifier stored in `profiles.languages` (text[]),
 * `label` is the display string shown in the picker.
 *
 * Not run through next-intl: these are catalog values (like the `interests` table), not
 * translated UI copy — mirrors the "profile content isn't re-translated" convention, kept
 * here instead of the DB only because there's no seed table for languages.
 */
export const SUPPORTED_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'ukrainian', label: 'Ukrainian' },
  { value: 'polish', label: 'Polish' },
  { value: 'italian', label: 'Italian' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'mandarin', label: 'Mandarin Chinese' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'russian', label: 'Russian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
] as const;

export type LanguageValue = (typeof SUPPORTED_LANGUAGES)[number]['value'];

export const LANGUAGE_VALUES = SUPPORTED_LANGUAGES.map((language) => language.value) as [
  LanguageValue,
  ...LanguageValue[],
];
