import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types.gen';

/**
 * `createClient()` is not (yet) parameterised with `Database` — see the note in
 * `lib/supabase/server.ts` — so `.rpc()` resolves to `any`. Pulling the row shape straight
 * out of the generated types keeps this handler honest without widening the shared client's
 * typing, which would ripple through every existing call site.
 */
type SearchCitiesRow = Database['public']['Functions']['search_cities']['Returns'][number];

/**
 * City autocomplete for the profile location picker (`CityCombobox`).
 *
 * WHY A ROUTE HANDLER AND NOT A SERVER ACTION
 *   The project default is RSC + Server Actions, and that default is right for
 *   mutations. This is neither a mutation nor private: `geo_cities` grants
 *   anon/authenticated SELECT (see 20260805100500_geo_reference.sql), so a
 *   typeahead over it is a read-only reference lookup. A GET handler gives it
 *   an HTTP cache (a Server Action is POST and uncacheable), which matters for
 *   a field that fires a request every few keystrokes.
 *
 * The heavy lifting lives in the `search_cities` RPC — prefix matching over
 * ascii-folded aliases, ranked exact-then-population, capped at 50 rows in SQL
 * so this endpoint cannot be turned into a bulk export of the whole table.
 */

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CitySearchResult = {
  geonameId: number;
  name: string;
  regionCode: string | null;
  regionName: string | null;
  countryCode: string;
  countryName: string;
  timezone: string | null;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const parsed = querySchema.safeParse({
    q: params.get('q') ?? '',
    country: params.get('country') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });

  // A too-short/blank query is the normal state of an empty input, not an
  // error worth surfacing — answer with an empty list rather than a 400 the
  // combobox would have to special-case.
  if (!parsed.success) {
    return NextResponse.json({ cities: [] satisfies CitySearchResult[] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_cities', {
    p_query: parsed.data.q,
    p_country: parsed.data.country ?? undefined,
    p_limit: parsed.data.limit,
  });

  if (error) {
    console.error('[geo/cities] search_cities failed:', error);
    return NextResponse.json({ cities: [] satisfies CitySearchResult[] }, { status: 500 });
  }

  const cities: CitySearchResult[] = ((data ?? []) as SearchCitiesRow[]).map((row) => ({
    geonameId: row.geoname_id,
    name: row.name,
    regionCode: row.region_code,
    regionName: row.region_name,
    countryCode: row.country_code,
    countryName: row.country_name,
    timezone: row.timezone,
  }));

  return NextResponse.json(
    { cities },
    {
      // Reference data that changes at most once a year (a GeoNames re-seed).
      // Cached at the edge, revalidated in the background — repeated prefixes
      // ("l", "lv", "lvi" typed by many users) mostly never reach Postgres.
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
