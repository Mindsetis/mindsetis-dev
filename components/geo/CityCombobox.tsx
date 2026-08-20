'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CitySearchResult } from '@/app/api/geo/cities/route';
import { Combobox } from '@/components/ui/combobox';
import { regionAddsInformation } from '@/lib/geo/region-label';

export type CitySelection = {
  geonameId: number;
  name: string;
  regionCode: string | null;
  regionName: string | null;
  countryCode: string;
  timezone: string | null;
};

type CityComboboxProps = {
  /** ISO 3166-1 alpha-2 of the country picked in the sibling field. Empty → the field is
   * disabled: an unscoped search over 170k rows is both slow and useless as a UX. */
  countryCode: string;
  value: CitySelection | null;
  onChange: (city: CitySelection | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  loadingLabel: string;
  disabledLabel: string;
  invalid?: boolean;
};

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

/**
 * City autocomplete backed by `/api/geo/cities` (→ the `search_cities` RPC).
 *
 * WHY THE REGION IS NOT ITS OWN FIELD
 *   A Country → State → City cascade is wrong for most of the world (Germany's
 *   Bundesländer, France's départements and the UK's counties are never spoken aloud;
 *   Singapore and Monaco are country == city), but the US, Canada, Brazil, Australia and
 *   India genuinely need it because city names repeat — Springfield exists in ~30 US states.
 *   So the region rides along with the chosen city and is surfaced ONLY as a disambiguator:
 *   it is appended to an option's label exactly when another option in the same result set
 *   carries the same city name. Typing "springfield" in the US shows six labelled options;
 *   typing "berlin" in Germany shows a plain "Berlin" with no redundant "State of Berlin".
 *
 * Changing the country must discard the chosen city ("Lviv" is not a Spanish city). That is
 * handled by the PARENT keying this component on `countryCode` — remounting resets `query`
 * and the cached results for free, without an effect that reaches back into props. The
 * Server Action independently re-checks that the city belongs to the submitted country, so
 * a crafted request cannot bypass the UI-level rule.
 */
export function CityCombobox({
  countryCode,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  loadingLabel,
  disabledLabel,
  invalid,
}: CityComboboxProps) {
  const [query, setQuery] = useState('');

  // Results are stored together with the term they answer, so "is a search in flight?" and
  // "are these rows still relevant?" are DERIVED at render rather than tracked as extra state
  // that an effect has to keep clearing. Besides satisfying react-hooks/set-state-in-effect,
  // this removes the flash of a previous term's cities under a newer query.
  const [answered, setAnswered] = useState<{ term: string; cities: CitySearchResult[] } | null>(
    null,
  );

  // Guards against out-of-order responses: a slow "l" resolving after a fast "lviv" would
  // otherwise overwrite the newer, narrower result set with stale rows.
  const requestIdRef = useRef(0);

  const term = query.trim();
  const canSearch = Boolean(countryCode) && term.length >= MIN_QUERY_LENGTH;
  const isAnswered = answered?.term === term;
  const isLoading = canSearch && !isAnswered;
  const results = useMemo(
    () => (canSearch && isAnswered ? (answered?.cities ?? []) : []),
    [canSearch, isAnswered, answered],
  );

  useEffect(() => {
    if (!canSearch) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      let cities: CitySearchResult[] = [];
      try {
        const params = new URLSearchParams({ q: term, country: countryCode });
        const res = await fetch(`/api/geo/cities?${params}`, { signal: controller.signal });
        const json: { cities?: CitySearchResult[] } = await res.json();
        cities = json.cities ?? [];
      } catch {
        // AbortError on every keystroke is the normal path, and a genuine network failure
        // should read as "no matches" rather than break the form — either way, an empty list.
        cities = [];
      }
      if (requestId === requestIdRef.current) setAnswered({ term, cities });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, countryCode, canSearch]);

  const options = useMemo(() => {
    // Only names that actually collide within this result set get a region suffix.
    const nameCounts = new Map<string, number>();
    for (const city of results) {
      nameCounts.set(city.name, (nameCounts.get(city.name) ?? 0) + 1);
    }

    return results.map((city) => {
      // Two conditions, both required: the name must actually collide inside this result
      // set, AND the region must add information (see `regionAddsInformation`).
      const needsRegion =
        (nameCounts.get(city.name) ?? 0) > 1 && regionAddsInformation(city.name, city.regionName);
      return {
        value: String(city.geonameId),
        label: needsRegion ? `${city.name}, ${city.regionName}` : city.name,
      };
    });
  }, [results]);

  // The selected city must stay visible in the trigger after the result list is discarded
  // (popover closed, query cleared), so it is merged into `options` when absent.
  const selectedValue = value ? String(value.geonameId) : '';
  const optionsWithSelection = useMemo(() => {
    if (!value || options.some((option) => option.value === selectedValue)) return options;
    return [
      {
        value: selectedValue,
        // The trigger has no sibling options to collide with, so the "duplicate name" half
        // of the list rule doesn't apply — but `regionAddsInformation` still does. Without
        // it this line rendered the selected Lviv as "Lviv, Lviv".
        label: regionAddsInformation(value.name, value.regionName)
          ? `${value.name}, ${value.regionName}`
          : value.name,
      },
      ...options,
    ];
  }, [options, value, selectedValue]);

  return (
    <Combobox
      value={selectedValue}
      onChange={(next) => {
        const picked = results.find((city) => String(city.geonameId) === next);
        if (!picked) return;
        onChange({
          geonameId: picked.geonameId,
          name: picked.name,
          regionCode: picked.regionCode,
          regionName: picked.regionName,
          countryCode: picked.countryCode,
          timezone: picked.timezone,
        });
      }}
      options={optionsWithSelection}
      placeholder={countryCode ? placeholder : disabledLabel}
      searchPlaceholder={searchPlaceholder}
      emptyLabel={term.length < MIN_QUERY_LENGTH ? searchPlaceholder : emptyLabel}
      loadingLabel={loadingLabel}
      isLoading={isLoading}
      disabled={!countryCode}
      invalid={invalid}
      searchable
      shouldFilter={false}
      searchValue={query}
      onSearchValueChange={setQuery}
    />
  );
}
