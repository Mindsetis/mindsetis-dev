/**
 * Shared rule for when a subdivision name is worth showing next to a city.
 *
 * Deliberately NOT in `lib/geo/countries.ts` — that module is `server-only`, and this rule is
 * needed on both sides: the city picker (`components/geo/CityCombobox.tsx`, a client
 * component) and the profile views (server components).
 */

/**
 * Does appending `regionName` to `name` actually tell the reader something new?
 *
 * Very often it does not, because administrative units are named after their capital: Lviv
 * sits in Lviv oblast, Kyiv in "Kyiv City", São Paulo in São Paulo state, Berlin in "State of
 * Berlin". Appending blindly produced "Lviv, Lviv" — which reads as two places rather than
 * one disambiguated one. So a region is suppressed whenever either name CONTAINS the other;
 * "Springfield, Illinois" — where the two are unrelated, and where roughly thirty US
 * Springfields make the distinction essential — is kept.
 *
 * Containment rather than a prefix check on purpose: "State of Berlin" does not *start* with
 * "Berlin", so a prefix rule let "Berlin, State of Berlin" through. The looser test also
 * quietly does the right thing for "Oklahoma City, Oklahoma" and "New York, New York".
 */
export function regionAddsInformation(name: string, regionName: string | null): boolean {
  if (!regionName) return false;
  const city = name.toLocaleLowerCase();
  const region = regionName.toLocaleLowerCase();
  return !city.includes(region) && !region.includes(city);
}
