/**
 * "Languages you speak" catalog for the member-profile form (Figma "Member profile 2/4").
 *
 * `value` is the stable identifier stored in `profiles.languages` (text[]); `label` is the
 * full language name shown in the picker; `code` is the ISO 639-1 two-letter code used for
 * the abbreviated uppercase display on the profile pages (e.g. "EN / UK", see
 * `resolveLanguageText` in `components/profile/MemberProfileView.tsx`).
 *
 * ORDERING is deliberate, not alphabetical throughout: the original fourteen most-spoken
 * entries stay first and in their original order (they cover the overwhelming majority of
 * picks, so the common case needs no scrolling), then the 2026-08-05 expansion follows
 * alphabetically so browsing the tail is predictable. The picker is searchable, so list
 * length costs nothing to someone who already knows what they want.
 *
 * The original fourteen entries' `value`/`label`/`code` are FROZEN — `profiles.languages`
 * stores these strings, so renaming one silently orphans every profile that picked it
 * (`resolveLanguageText` skips values it no longer recognises). Add rows; don't edit
 * existing ones.
 *
 * Every `label`/`code` pair below was generated and verified against ICU
 * (`Intl.DisplayNames(['en'], { type: 'language' })`) rather than typed by hand — a wrong
 * two-letter code would surface as a wrong abbreviation on a public profile.
 *
 * Not run through next-intl: these are catalog values (like the `interests` table), not
 * translated UI copy — mirrors the "profile content isn't re-translated" convention, kept
 * here instead of the DB only because there's no seed table for languages.
 */
export const SUPPORTED_LANGUAGES = [
  // — original fourteen, frozen, ordered by prevalence —
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

  // — 2026-08-05 expansion, alphabetical —
  { value: 'afrikaans', label: 'Afrikaans', code: 'af' },
  { value: 'albanian', label: 'Albanian', code: 'sq' },
  { value: 'amharic', label: 'Amharic', code: 'am' },
  { value: 'armenian', label: 'Armenian', code: 'hy' },
  { value: 'azerbaijani', label: 'Azerbaijani', code: 'az' },
  { value: 'basque', label: 'Basque', code: 'eu' },
  { value: 'belarusian', label: 'Belarusian', code: 'be' },
  { value: 'bengali', label: 'Bengali', code: 'bn' },
  { value: 'bosnian', label: 'Bosnian', code: 'bs' },
  { value: 'bulgarian', label: 'Bulgarian', code: 'bg' },
  { value: 'burmese', label: 'Burmese', code: 'my' },
  { value: 'catalan', label: 'Catalan', code: 'ca' },
  { value: 'croatian', label: 'Croatian', code: 'hr' },
  { value: 'czech', label: 'Czech', code: 'cs' },
  { value: 'danish', label: 'Danish', code: 'da' },
  { value: 'dutch', label: 'Dutch', code: 'nl' },
  { value: 'estonian', label: 'Estonian', code: 'et' },
  { value: 'filipino', label: 'Filipino', code: 'tl' },
  { value: 'finnish', label: 'Finnish', code: 'fi' },
  { value: 'galician', label: 'Galician', code: 'gl' },
  { value: 'georgian', label: 'Georgian', code: 'ka' },
  { value: 'greek', label: 'Greek', code: 'el' },
  { value: 'gujarati', label: 'Gujarati', code: 'gu' },
  { value: 'hausa', label: 'Hausa', code: 'ha' },
  { value: 'hebrew', label: 'Hebrew', code: 'he' },
  { value: 'hungarian', label: 'Hungarian', code: 'hu' },
  { value: 'icelandic', label: 'Icelandic', code: 'is' },
  { value: 'igbo', label: 'Igbo', code: 'ig' },
  { value: 'indonesian', label: 'Indonesian', code: 'id' },
  { value: 'irish', label: 'Irish', code: 'ga' },
  { value: 'kannada', label: 'Kannada', code: 'kn' },
  { value: 'kazakh', label: 'Kazakh', code: 'kk' },
  { value: 'khmer', label: 'Khmer', code: 'km' },
  { value: 'lao', label: 'Lao', code: 'lo' },
  { value: 'latvian', label: 'Latvian', code: 'lv' },
  { value: 'lithuanian', label: 'Lithuanian', code: 'lt' },
  { value: 'macedonian', label: 'Macedonian', code: 'mk' },
  { value: 'malay', label: 'Malay', code: 'ms' },
  { value: 'malayalam', label: 'Malayalam', code: 'ml' },
  { value: 'maltese', label: 'Maltese', code: 'mt' },
  { value: 'marathi', label: 'Marathi', code: 'mr' },
  { value: 'mongolian', label: 'Mongolian', code: 'mn' },
  { value: 'nepali', label: 'Nepali', code: 'ne' },
  { value: 'norwegian', label: 'Norwegian', code: 'no' },
  { value: 'persian', label: 'Persian', code: 'fa' },
  { value: 'punjabi', label: 'Punjabi', code: 'pa' },
  { value: 'romanian', label: 'Romanian', code: 'ro' },
  { value: 'serbian', label: 'Serbian', code: 'sr' },
  { value: 'sinhala', label: 'Sinhala', code: 'si' },
  { value: 'slovak', label: 'Slovak', code: 'sk' },
  { value: 'slovenian', label: 'Slovenian', code: 'sl' },
  { value: 'somali', label: 'Somali', code: 'so' },
  { value: 'swahili', label: 'Swahili', code: 'sw' },
  { value: 'swedish', label: 'Swedish', code: 'sv' },
  { value: 'tamil', label: 'Tamil', code: 'ta' },
  { value: 'telugu', label: 'Telugu', code: 'te' },
  { value: 'thai', label: 'Thai', code: 'th' },
  { value: 'turkish', label: 'Turkish', code: 'tr' },
  { value: 'urdu', label: 'Urdu', code: 'ur' },
  { value: 'uzbek', label: 'Uzbek', code: 'uz' },
  { value: 'vietnamese', label: 'Vietnamese', code: 'vi' },
  { value: 'yoruba', label: 'Yoruba', code: 'yo' },
  { value: 'zulu', label: 'Zulu', code: 'zu' },
] as const;

export type LanguageValue = (typeof SUPPORTED_LANGUAGES)[number]['value'];

export const LANGUAGE_VALUES = SUPPORTED_LANGUAGES.map((language) => language.value) as [
  LanguageValue,
  ...LanguageValue[],
];

/**
 * What the two-letter badge on a profile SHOWS, where it differs from the ISO 639-1 language
 * code above (owner decision, 2026-09-24).
 *
 * `code` stays ISO and is what search matching uses. This map is display only.
 *
 * Why: ISO 639-1 is a LANGUAGE registry, and for a couple of dozen languages its code is not
 * the country letters readers expect. "UK" for Ukrainian next to "Kyiv, Ukraine" reads as
 * United Kingdom; Figma drew "EN / UA". The design is right about what people expect, so the
 * badge follows the country, not the registry.
 *
 * It was already worse than a cosmetic mismatch: Burmese (`my`) rendered as "MY" — Malaysia —
 * while Malay itself rendered "MS"; Sinhala (`si`) rendered as "SI" — Slovenia — while
 * Slovenian rendered "SL". Two pairs of languages were wearing each other's flags.
 *
 * THE RULE for adding entries here: override only when the language has ONE unambiguous home
 * country AND those letters are not already taken by another language in the catalog.
 *
 * Deliberately NOT overridden, because they break that rule:
 *   - Igbo, Hausa, Yoruba — all Nigeria; three languages cannot all be "NG".
 *   - Kannada, Malayalam, Marathi, Telugu, Gujarati, Punjabi, Tamil — India is already Hindi's
 *     badge, and Tamil/Punjabi span borders anyway.
 *   - Catalan, Basque, Galician — Spain is already Spanish's badge.
 *   - Swahili — Kenya and Tanzania both; picking one would be a statement, not a fact.
 *   - Arabic — spoken across some two dozen countries.
 * Those keep their ISO code, which is the honest answer when no single country fits. "EU" for
 * Basque is an unfortunate read (European Union), but "ES" would collide with Spanish.
 */
const LANGUAGE_DISPLAY_CODE: Readonly<Record<string, string>> = {
  af: 'ZA', // Afrikaans — South Africa ("AF" reads as Afghanistan)
  am: 'ET', // Amharic — Ethiopia (free once Estonian moves to EE)
  be: 'BY', // Belarusian
  bn: 'BD', // Bengali — Bangladesh
  cs: 'CZ', // Czech
  da: 'DK', // Danish
  el: 'GR', // Greek
  et: 'EE', // Estonian
  fa: 'IR', // Persian — Iran
  ga: 'IE', // Irish
  he: 'IL', // Hebrew
  hi: 'IN', // Hindi
  hy: 'AM', // Armenian
  ja: 'JP', // Japanese
  ka: 'GE', // Georgian
  kk: 'KZ', // Kazakh
  km: 'KH', // Khmer — Cambodia
  ko: 'KR', // Korean
  lo: 'LA', // Lao
  ms: 'MY', // Malay — Malaysia (was "MS"; the letters were being worn by Burmese)
  my: 'MM', // Burmese — Myanmar (was showing "MY", i.e. Malaysia)
  ne: 'NP', // Nepali
  si: 'LK', // Sinhala — Sri Lanka (was showing "SI", i.e. Slovenia)
  sl: 'SI', // Slovenian
  sq: 'AL', // Albanian
  sr: 'RS', // Serbian
  sv: 'SE', // Swedish
  tl: 'PH', // Filipino — Philippines
  uk: 'UA', // Ukrainian — the one that started this
  ur: 'PK', // Urdu — Pakistan
  vi: 'VN', // Vietnamese
  zh: 'CN', // Mandarin Chinese
};

/**
 * The uppercase badge for an ISO 639-1 code, as shown on profile pages ("UA", "JP", "EN").
 * Falls through to the ISO code for every language the map above deliberately leaves alone.
 */
export function languageDisplayCode(code: string): string {
  return (LANGUAGE_DISPLAY_CODE[code] ?? code).toUpperCase();
}

/**
 * English names a language is ALSO commonly known by, keyed by ISO 639-1 code.
 *
 * ICU gives exactly one English name per language, but several are widely known under a
 * second one — someone who speaks Tagalog will not think to type "Filipino", and "Farsi" is
 * far more familiar to its own speakers than "Persian". Search-only; the picker still shows
 * the single canonical `label`.
 */
const ENGLISH_SYNONYMS: Record<string, readonly string[]> = {
  bn: ['Bangla'],
  fa: ['Farsi'],
  he: ['Ivrit'],
  my: ['Myanmar'],
  nl: ['Flemish'],
  no: ['Norsk', 'Bokmal'],
  pa: ['Panjabi'],
  tl: ['Tagalog'],
  zh: ['Chinese', 'Putonghua'],
};

/**
 * Locales whose spellings of a language name are accepted as search input.
 *
 * Same reasoning as the country picker (`lib/geo/countries.ts`): the release is EN/ES, so a
 * Spanish speaker types "alemán" rather than "German", and the team plus a large share of
 * early members are Ukrainian-speaking — a list of 77 English names where "українська"
 * matches nothing is the exact bug already reported once for countries.
 */
const ALIAS_LOCALES = ['es', 'uk', 'ru'] as const;

const foldDiacritics = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Match-only aliases for one language: its ISO code, its well-known English synonyms, and
 * its name in each alias locale — the last straight from the ICU data bundled with Node and
 * every browser, so this needs no dataset, no download and no licence.
 */
export function buildLanguageAliases(code: string, englishLabel: string): string[] {
  // The displayed badge is an alias too: someone who has seen "UA" on a profile and types it
  // into the picker should land on Ukrainian, not on nothing.
  const aliases = new Set<string>([
    code,
    languageDisplayCode(code).toLowerCase(),
    ...(ENGLISH_SYNONYMS[code] ?? []),
  ]);

  for (const locale of ALIAS_LOCALES) {
    let localized: string | undefined;
    try {
      localized = new Intl.DisplayNames([locale], { type: 'language' }).of(code);
    } catch {
      continue;
    }
    // ICU echoes the code back when it has no name for it.
    if (!localized || localized === code || localized === englishLabel) continue;
    aliases.add(localized);
    const folded = foldDiacritics(localized);
    if (folded !== localized) aliases.add(folded);
  }

  return [...aliases];
}
