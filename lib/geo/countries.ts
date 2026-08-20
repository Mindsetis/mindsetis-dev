import 'server-only';

import { createClient } from '@/lib/supabase/server';

export type CountryOption = {
  /** ISO 3166-1 alpha-2 — the value stored in `profiles.country_code`. */
  code: string;
  name: string;
  /** Localized spellings the option should also match while typing (never displayed). */
  searchNames: string[];
};

/**
 * Locales whose country spellings are accepted as search input.
 *
 * `es` because the release is EN/ES and a Spanish speaker types "España", not "Spain".
 * `uk`/`ru` because the team and a large share of early members are Ukrainian-speaking —
 * "Україна" finding nothing was the exact bug this fixes. Display stays English; these are
 * match-only aliases.
 */
const ALIAS_LOCALES = ['es', 'uk', 'ru'] as const;

/** Strip combining diacritics so "Espana" matches "España" (cmdk matches literally). */
const foldDiacritics = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Localized country names, straight from the ICU data bundled with Node — no extra dataset,
 * no download, no licence obligation, and nothing to keep in sync. `Intl.DisplayNames` maps
 * an ISO 3166-1 alpha-2 code to its name in any locale, which is exactly the alias list a
 * search box needs.
 */
function buildCountryAliases(code: string, iso3: string | null, englishName: string): string[] {
  // The ISO codes themselves: people type "USA", "UK", "ESP" far more often than they scroll.
  // They matter more here than under cmdk's old fuzzy matcher, because the keyword-aware
  // filter is prefix/substring based and would otherwise miss "usa" against "United States".
  const aliases = new Set<string>([code]);
  if (iso3) aliases.add(iso3);

  for (const locale of ALIAS_LOCALES) {
    let localized: string | undefined;
    try {
      localized = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
    } catch {
      // Unknown/withdrawn ISO code — GeoNames lists a few ICU doesn't. Skip it; the
      // English name still matches.
      continue;
    }
    // ICU echoes the input code back when it has no name for it.
    if (!localized || localized === code || localized === englishName) continue;
    aliases.add(localized);
    const folded = foldDiacritics(localized);
    if (folded !== localized) aliases.add(folded);
  }

  const foldedEnglish = foldDiacritics(englishName);
  if (foldedEnglish !== englishName) aliases.add(foldedEnglish);

  return [...aliases];
}

/**
 * The full `geo_countries` list, alphabetical, for the country `<Combobox>`.
 *
 * Loaded in the RSC page and passed down as a prop rather than fetched from the client:
 * it is ~250 rows of stable reference data, so one server query beats an extra client
 * round-trip on every render of the profile step. Cities are the opposite case — 170k rows
 * that can only ever be a remote search (`CityCombobox` → `/api/geo/cities`).
 *
 * Reads through the anon-key server client: `geo_countries` grants `anon, authenticated`
 * SELECT (see `supabase/migrations/20260805100500_geo_reference.sql`), so this deliberately
 * does NOT need the service role.
 */
export async function listCountries(): Promise<CountryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('geo_countries')
    .select('iso2, iso3, name')
    .order('name');

  if (error) {
    // A profile step that renders with an empty country list is bad, but a hard 500 on the
    // whole page is worse — surface it in the logs and let the form show "no options".
    console.error('[geo] listCountries failed:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    code: row.iso2,
    name: row.name,
    searchNames: buildCountryAliases(row.iso2, row.iso3, row.name),
  }));
}
