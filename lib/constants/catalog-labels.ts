/**
 * Display labels for the code-defined profile catalogs, in the viewer's locale.
 *
 * The catalogs (`industries.ts`, `interests.ts`, `interest-categories.ts`, `languages.ts`) store
 * stable slugs in `profiles.*` and keep the English `label` only as the source/fallback. What a
 * person SEES is resolved here:
 *   - industries / interests / interest categories: the `catalog.*` namespace of
 *     `messages/{locale}.json` (pass the translator from `useTranslations('catalog')` /
 *     `getTranslations('catalog')`);
 *   - languages: the static `LANGUAGE_NAMES` table below, by ISO code, with the English
 *     `label` as fallback.
 *
 * Nothing here changes what is stored — only how a slug is rendered.
 */
import { INDUSTRIES } from '@/lib/constants/industries';
import { INTEREST_CATEGORY_KEY, type InterestCategory } from '@/lib/constants/interest-categories';
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages';

/** The translator of the `catalog` namespace (`useTranslations('catalog')`). */
export type CatalogTranslator = (key: string) => string;

export type CatalogOption = { value: string; label: string };

/**
 * Industry options with localized labels, sorted by the DISPLAYED label for `locale` (Release-1
 * E2: alphabetical, with `other` wherever "Other"/"Otro" falls). For English this reproduces the
 * catalog order exactly.
 */
export function getIndustryOptions(t: CatalogTranslator, locale: string): CatalogOption[] {
  return INDUSTRIES.map((industry) => ({
    value: industry.value,
    label: t(`industries.${industry.value}`),
  })).sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** Slug → localized industry label (for read-only views). Unknown slugs → `undefined`. */
export function getIndustryLabelMap(t: CatalogTranslator): Map<string, string> {
  return new Map(INDUSTRIES.map((industry) => [industry.value, t(`industries.${industry.value}`)]));
}

/** Localized name of an interest filter category (the catalog stores the English string). */
export function interestCategoryLabel(t: CatalogTranslator, category: InterestCategory): string {
  return t(`interestCategories.${INTEREST_CATEGORY_KEY[category]}`);
}

/** Localized interest label. */
export function interestLabel(t: CatalogTranslator, value: string): string {
  return t(`interests.${value}`);
}

/**
 * Language names per non-English locale, keyed by ISO 639-1 `code` (every row of
 * `SUPPORTED_LANGUAGES`). A STATIC table on purpose, not `Intl.DisplayNames` at render time: the
 * pickers are client components rendered on the server AND hydrated in the browser, and ICU data
 * differs between engines (Safari ships the system's ICU, Firefox its own) — a name that differs by
 * one word would be a hydration mismatch. Generated once from ICU 78 (Node, identical to Chromium
 * for all 77 codes on 2026-11-06), first letter capitalised, with `zh` hand-set to
 * "Chino mandarín" (ICU gives bare "chino"). A new catalog row needs its line here, or it falls
 * back to the English `label`.
 */
const LANGUAGE_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  es: {
    en: 'Inglés',
    es: 'Español',
    fr: 'Francés',
    de: 'Alemán',
    pt: 'Portugués',
    uk: 'Ucraniano',
    pl: 'Polaco',
    it: 'Italiano',
    ar: 'Árabe',
    zh: 'Chino mandarín',
    hi: 'Hindi',
    ru: 'Ruso',
    ja: 'Japonés',
    ko: 'Coreano',
    af: 'Afrikáans',
    sq: 'Albanés',
    am: 'Amárico',
    hy: 'Armenio',
    az: 'Azerbaiyano',
    eu: 'Euskera',
    be: 'Bielorruso',
    bn: 'Bengalí',
    bs: 'Bosnio',
    bg: 'Búlgaro',
    my: 'Birmano',
    ca: 'Catalán',
    hr: 'Croata',
    cs: 'Checo',
    da: 'Danés',
    nl: 'Neerlandés',
    et: 'Estonio',
    tl: 'Filipino',
    fi: 'Finés',
    gl: 'Gallego',
    ka: 'Georgiano',
    el: 'Griego',
    gu: 'Guyaratí',
    ha: 'Hausa',
    he: 'Hebreo',
    hu: 'Húngaro',
    is: 'Islandés',
    ig: 'Igbo',
    id: 'Indonesio',
    ga: 'Irlandés',
    kn: 'Canarés',
    kk: 'Kazajo',
    km: 'Jemer',
    lo: 'Lao',
    lv: 'Letón',
    lt: 'Lituano',
    mk: 'Macedonio',
    ms: 'Malayo',
    ml: 'Malayálam',
    mt: 'Maltés',
    mr: 'Maratí',
    mn: 'Mongol',
    ne: 'Nepalí',
    no: 'Noruego',
    fa: 'Persa',
    pa: 'Punyabí',
    ro: 'Rumano',
    sr: 'Serbio',
    si: 'Cingalés',
    sk: 'Eslovaco',
    sl: 'Esloveno',
    so: 'Somalí',
    sw: 'Suajili',
    sv: 'Sueco',
    ta: 'Tamil',
    te: 'Telugu',
    th: 'Tailandés',
    tr: 'Turco',
    ur: 'Urdu',
    uz: 'Uzbeko',
    vi: 'Vietnamita',
    yo: 'Yoruba',
    zu: 'Zulú',
  },
};

/** Language name for `code` in `locale`, or `englishLabel` (English, or a code with no entry). */
export function languageLabel(code: string, englishLabel: string, locale: string): string {
  if (locale === 'en') return englishLabel;
  return LANGUAGE_NAMES[locale]?.[code] ?? englishLabel;
}

/** Language picker options in catalog order, labelled for `locale`. */
export function getLanguageOptions(
  locale: string,
): { value: string; label: string; code: string; englishLabel: string }[] {
  return SUPPORTED_LANGUAGES.map((language) => ({
    value: language.value,
    label: languageLabel(language.code, language.label, locale),
    code: language.code,
    englishLabel: language.label,
  }));
}
