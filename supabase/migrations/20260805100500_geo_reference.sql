-- =============================================================================
-- Geo reference data: countries / admin1 (state-province) / cities
-- =============================================================================
-- Replaces the free-text `profiles.country` + `profiles.city` inputs (added in
-- 20260707141211_profile_step2_interests.sql) with a searchable, code-backed
-- picker sourced from GeoNames (https://download.geonames.org, CC BY 4.0).
--
-- WHY CODES INSTEAD OF FREE TEXT
--   Free text produces "Kyiv" / "Kiev" / "Київ" / "kyiv " as four distinct
--   values, which silently breaks catalog filtering and will later poison the
--   pgvector semantic search (§3.7). Stable identifiers fix that at the source.
--
-- WHY NO SEPARATE "STATE" INPUT (product decision)
--   A universal Country -> State -> City cascade is wrong for most of the
--   world: Germany/France/UK have level-1 subdivisions nobody says out loud,
--   and Singapore/Monaco/Hong Kong are country == city. But the US, Canada,
--   Brazil, Australia and India genuinely need it, because city names repeat
--   (Springfield exists in ~30 US states).
--   Resolution: the UI collects TWO fields (country, city). The region is
--   carried by the chosen city row and shown in the option label only when it
--   disambiguates ("Springfield, Illinois"). `region_code` / `region_name` on
--   profiles are therefore derived, never user-entered, and nullable.
--
-- TIMEZONE
--   GeoNames ships an IANA timezone per city. Capturing it here is what makes
--   cross-timezone 1:1 booking (§2.3 availability slots) tractable later —
--   without it every slot render has to guess the counterparty's offset.
--
-- CONVENTION DEVIATION (deliberate, see CLAUDE.md "DB table conventions")
--   These three tables do NOT get `id uuid primary key default
--   gen_random_uuid()`. They are externally-sourced reference data whose rows
--   already carry stable upstream identifiers (ISO 3166-1 alpha-2, GeoNames
--   admin1 code, GeoNames id). Minting a surrogate uuid for ~150k city rows
--   would add an index and a join key that nothing can ever reference more
--   reliably than the natural key, and would break the idempotent re-seed
--   (`on conflict (geoname_id) do update`) that keeps yearly GeoNames refreshes
--   non-destructive. `created_at` / `updated_at` and RLS are kept as normal.
--
-- ADMIN1 IS NOT ISO 3166-2 (honest limitation)
--   GeoNames' admin1 code equals the ISO 3166-2 subdivision part for US/CA/AU
--   and several others, but for a number of countries it is an upstream
--   numeric code with no ISO equivalent. This migration stores the GeoNames
--   code plus its human-readable name and does NOT claim ISO 3166-2
--   conformance for `region_code`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
-- unaccent: fold the *query* side so typing "Malaga" finds "Málaga" and vice
-- versa. Only ever applied to the search argument, never inside an index —
-- unaccent() is STABLE (dictionary-dependent), not IMMUTABLE, so it cannot be
-- indexed without an unsafe IMMUTABLE wrapper. We avoid that entirely by
-- matching against GeoNames' pre-folded `ascii_name`.
-- Both go into the `extensions` schema (where hosted Supabase already keeps
-- pgcrypto / uuid-ossp) rather than `public`: anything landing in `public`
-- gets published by PostgREST as a callable RPC, and neither of these should
-- be part of the platform's HTTP surface.
create extension if not exists unaccent with schema extensions;

-- pg_trgm: GIN index backing the "no country picked yet" global city search,
-- which cannot use a plain prefix btree.
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. geo_countries — ISO 3166-1 country list
-- -----------------------------------------------------------------------------
create table if not exists geo_countries (
  iso2       char(2) primary key,
  iso3       char(3),
  name       text not null,
  continent  char(2),
  phone_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table geo_countries is
  'ISO 3166-1 country reference data, seeded from GeoNames countryInfo.txt (CC BY 4.0) by scripts/seed-geo.mjs. Public read-only reference data: no client write policy, mutated only by staff/service role. Political listing follows ISO 3166 / GeoNames upstream verbatim — entries are deliberately not hand-edited.';

comment on column geo_countries.iso2 is
  'ISO 3166-1 alpha-2 code — the natural primary key and the value stored in profiles.country_code.';

create index if not exists geo_countries_name_idx on geo_countries (name);

alter table geo_countries enable row level security;

-- Readable by anon as well as authenticated: the public Mindsetter profile
-- page and the (anon-visible) catalog need to render/filter locations without
-- a session — mirrors the anon read grants in
-- 20260720184218_public_mindsetter_profile_anon_read.sql.
create policy "geo_countries_read" on geo_countries
  for select
  to anon, authenticated
  using (true);

create policy "geo_countries_write_staff" on geo_countries
  for all
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create trigger set_geo_countries_updated_at
  before update on geo_countries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. geo_admin1 — first-level subdivisions (US states, CA provinces, …)
-- -----------------------------------------------------------------------------
create table if not exists geo_admin1 (
  country_code char(2) not null references geo_countries(iso2) on delete cascade,
  admin1_code  text not null,
  name         text not null,
  geoname_id   bigint,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (country_code, admin1_code)
);

comment on table geo_admin1 is
  'First-level administrative subdivisions (US states, Canadian provinces, Brazilian states, Ukrainian oblasts, …), seeded from GeoNames admin1CodesASCII.txt. Used ONLY to label a city option ("Springfield, Illinois") and to fill profiles.region_name — never presented as its own form field. NOTE: admin1_code is GeoNames'' code, which coincides with the ISO 3166-2 subdivision part for some countries but not all.';

alter table geo_admin1 enable row level security;

create policy "geo_admin1_read" on geo_admin1
  for select
  to anon, authenticated
  using (true);

create policy "geo_admin1_write_staff" on geo_admin1
  for all
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create trigger set_geo_admin1_updated_at
  before update on geo_admin1
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. geo_cities — the searchable city list (GeoNames cities1000)
-- -----------------------------------------------------------------------------
create table if not exists geo_cities (
  geoname_id   bigint primary key,
  name         text not null,
  ascii_name   text not null,
  country_code char(2) not null references geo_countries(iso2) on delete cascade,
  admin1_code  text,
  population   bigint not null default 0,
  timezone     text,
  -- Lower-cased, ASCII-folded search aliases (the city's own ascii name plus
  -- the Latin/Cyrillic subset of GeoNames' alternatenames). Lets a Ukrainian
  -- or Spanish speaker find a city by the spelling they actually type
  -- ("Киев", "Kiev", "Kyiv" -> one row) while the release stays EN/ES.
  search_names text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table geo_cities is
  'City reference data seeded from the GeoNames cities1000 dump (~150k settlements, population >= 1000) by scripts/seed-geo.mjs. Chosen over cities5000/cities15000 so that ordinary towns (Irpin, Brovary, small EU/US towns) are findable and the "my city is not listed" dead end effectively disappears. Re-seeding is upsert-only (never delete) so profiles.city_geoname_id references stay valid across yearly refreshes.';

comment on column geo_cities.search_names is
  'Lower-cased ASCII-folded aliases used by search_cities(). Restricted to Latin/Cyrillic scripts and capped per row by the seed script — storing every GeoNames alternate name (Arabic/CJK/…) would multiply table size for scripts this EN/ES release cannot surface.';

comment on column geo_cities.timezone is
  'IANA timezone (e.g. "America/Chicago") for this city. Copied onto profiles.timezone at selection time so 1:1 session slots can be rendered in each party''s local time.';

-- Primary access path: the UI always picks a country first, so nearly every
-- search is "this country, name starts with X, most populous first".
create index if not exists geo_cities_country_population_idx
  on geo_cities (country_code, population desc);

-- Fallback path: global (no country chosen) fuzzy search needs trigrams,
-- since a leading-wildcard/ILIKE scan over 150k rows has no btree to use.
create index if not exists geo_cities_ascii_name_trgm_idx
  on geo_cities using gin (ascii_name extensions.gin_trgm_ops);

create index if not exists geo_cities_admin1_idx
  on geo_cities (country_code, admin1_code);

alter table geo_cities enable row level security;

create policy "geo_cities_read" on geo_cities
  for select
  to anon, authenticated
  using (true);

create policy "geo_cities_write_staff" on geo_cities
  for all
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create trigger set_geo_cities_updated_at
  before update on geo_cities
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. search_cities() — the RPC the city combobox calls
-- -----------------------------------------------------------------------------
-- Plain STABLE sql function (NOT security definer): geo_* already grant anon
-- and authenticated SELECT, so the caller's own privileges are sufficient and
-- adding definer rights here would only widen the blast radius for nothing.
--
-- Ranking: exact name match first, then prefix matches, then substring, each
-- tier ordered by population — so "york" surfaces New York before York, and
-- "san" surfaces San Antonio before San Andrés Cholula.
create or replace function public.search_cities(
  p_query   text,
  p_country char(2) default null,
  p_limit   int default 20
)
returns table (
  geoname_id   bigint,
  name         text,
  region_code  text,
  region_name  text,
  country_code char(2),
  country_name text,
  timezone     text,
  population   bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select lower(unaccent(btrim(coalesce(p_query, '')))) as term
  )
  select
    c.geoname_id,
    c.name,
    c.admin1_code as region_code,
    a.name        as region_name,
    c.country_code,
    co.name       as country_name,
    c.timezone,
    c.population
  from geo_cities c
  cross join q
  join geo_countries co on co.iso2 = c.country_code
  left join geo_admin1 a
    on a.country_code = c.country_code
   and a.admin1_code  = c.admin1_code
  where q.term <> ''
    and (p_country is null or c.country_code = p_country)
    and exists (
      select 1 from unnest(c.search_names) sn where sn like q.term || '%'
    )
  order by
    (exists (select 1 from unnest(c.search_names) sn where sn = q.term)) desc,
    c.population desc,
    c.name
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.search_cities(text, char, int) is
  'City autocomplete for the profile location picker. Matches the query as a prefix against geo_cities.search_names (ascii-folded aliases), optionally scoped to one country, ranked exact-match-then-population. Returns at most 50 rows. Intentionally NOT security definer — geo_* tables grant anon/authenticated SELECT directly. Empty/blank query returns zero rows rather than the whole table.';

-- -----------------------------------------------------------------------------
-- 5. profiles — code-backed location columns
-- -----------------------------------------------------------------------------
-- `country` and `city` are KEPT, repurposed from user input to denormalized
-- display snapshots. Two reasons: every existing read path
-- (MemberProfileView, MindsetterProfileView, members/[username],
-- mindsetters/[username]) renders those strings and needs no change, and a
-- snapshot keeps a profile's location readable even if a GeoNames refresh
-- renames or reclassifies the underlying row. The codes below are the source
-- of truth for filtering; the strings are for display only.
alter table profiles
  add column if not exists country_code       char(2) references geo_countries(iso2) on delete set null,
  add column if not exists region_code        text,
  add column if not exists region_name        text,
  add column if not exists city_geoname_id    bigint references geo_cities(geoname_id) on delete set null,
  add column if not exists timezone           text,
  add column if not exists is_location_remote boolean not null default false;

comment on column profiles.country is
  'Denormalized country display name, snapshotted from geo_countries at selection time. Display only — profiles.country_code is the filterable source of truth. (Was free-text user input before 20260805100500_geo_reference.sql.)';
comment on column profiles.city is
  'Denormalized city display name, snapshotted from geo_cities at selection time. Display only — profiles.city_geoname_id is the filterable source of truth. (Was free-text user input before 20260805100500_geo_reference.sql.)';
comment on column profiles.country_code is
  'ISO 3166-1 alpha-2 of the selected country. ON DELETE SET NULL rather than CASCADE: a country disappearing from a GeoNames refresh must never delete a member profile.';
comment on column profiles.region_code is
  'GeoNames admin1 code of the selected city''s subdivision (e.g. "IL"). DERIVED from the city choice — never a user-facing form field. Null for the many countries where a level-1 subdivision is not meaningful. Not guaranteed to be ISO 3166-2.';
comment on column profiles.region_name is
  'Denormalized subdivision display name (e.g. "Illinois"), used to disambiguate repeated city names. Derived, display only.';
comment on column profiles.city_geoname_id is
  'GeoNames id of the selected city — the stable identifier behind catalog filtering and (later) semantic search. ON DELETE SET NULL so a reference-data refresh degrades a profile to its display snapshot instead of destroying it.';
comment on column profiles.timezone is
  'IANA timezone copied from the selected city. Populated automatically; needed to render 1:1 session slots in each party''s local time.';
comment on column profiles.is_location_remote is
  'True when the member declares themselves location-independent ("Remote / Nomad") instead of picking a city. Without an explicit option these users type junk into the city field, which is exactly what the code-backed picker exists to prevent. Country may still be set alongside this.';

create index if not exists profiles_country_code_idx on profiles (country_code);
create index if not exists profiles_city_geoname_id_idx on profiles (city_geoname_id);
