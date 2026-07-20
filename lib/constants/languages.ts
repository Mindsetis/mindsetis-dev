/**
 * Curated "languages spoken" catalog for the member-profile form (Figma "Member profile
 * 2/4" — "Language you speak" multi-select). No fixed catalog was visible in the design, so
 * this is a deliberately small, curated list of widely-spoken languages rather than a full
 * ISO-639 table — `value` is the stable identifier stored in `profiles.languages` (text[]),
 * `label` is the display string shown in the picker, `code` is the ISO 639-1 two-letter code
 * used for the abbreviated uppercase display on `MemberProfileView` (e.g. "EN / UK").
 *
 * Not run through next-intl: these are catalog values (like the `interests` table), not
 * translated UI copy — mirrors the "profile content isn't re-translated" convention, kept
 * here instead of the DB only because there's no seed table for languages.
 */
export const SUPPORTED_LANGUAGES = [
  { value: 'english', label: 'English', code: 'en' },
  { value: 'spanish', label: 'Spanish', code: 'es' },
  { value: 'french', label: 'French', code: 'fr' },
  { value: 'german', label: 'German', code: 'de' },
  { value: 'portuguese', label: 'Portuguese', code: 'pt' },
  { value: 'ukrainian', label: 'Ukrainian', code: 'uk' },
  { value: 'polish', label: 'Polish', code: 'pl' },
  { value: 'italian', label: 'Italian', code: 'it' },
  { value: 'arabic', label: 'Arabic', code: 'ar' },
  { value: 'mandarin', label: 'Mandarin Chinese', code: 'zh' },
  { value: 'hindi', label: 'Hindi', code: 'hi' },
  { value: 'russian', label: 'Russian', code: 'ru' },
  { value: 'japanese', label: 'Japanese', code: 'ja' },
  { value: 'korean', label: 'Korean', code: 'ko' },
] as const;

export type LanguageValue = (typeof SUPPORTED_LANGUAGES)[number]['value'];

export const LANGUAGE_VALUES = SUPPORTED_LANGUAGES.map((language) => language.value) as [
  LanguageValue,
  ...LanguageValue[],
];
