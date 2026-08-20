#!/usr/bin/env node
/**
 * Seed the geo reference tables (geo_countries / geo_admin1 / geo_cities) from
 * the GeoNames public dumps.
 *
 * Source: https://download.geonames.org/export/dump/  (CC BY 4.0)
 *   * countryInfo.txt       — ISO 3166-1 country list
 *   * admin1CodesASCII.txt  — first-level subdivisions (US states, …)
 *   * cities1000.zip        — ~150k settlements with population >= 1000
 *
 * Idempotent: every write is an upsert on the natural key, and NOTHING is ever
 * deleted. profiles.city_geoname_id / profiles.country_code point at these
 * rows, so a re-seed must never orphan a member's location.
 *
 * Usage:
 *   npm run db:seed:geo              # uses the cached dumps if present
 *   npm run db:seed:geo -- --refresh # re-download the dumps first
 *
 * Env (process.env first, then .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *
 * Service role is required: geo_* tables deliberately have no client write
 * policy (reference data, staff/service only).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, '.geonames-cache');
const BASE_URL = 'https://download.geonames.org/export/dump';

const REFRESH = process.argv.slice(2).includes('--refresh');

// -----------------------------------------------------------------------------
// env
// -----------------------------------------------------------------------------
/** Minimal .env parser (KEY="value" / KEY=value), no interpolation. */
function loadEnvLocal() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvLocal();
const env = (k) => process.env[k] ?? fileEnv[k] ?? '';

function die(msg) {
  console.error(`\n✖ seed-geo aborted — ${msg}\n`);
  process.exit(1);
}

const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');

if (!SUPABASE_URL) die('NEXT_PUBLIC_SUPABASE_URL is not set.');
if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY is not set.');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------------------------
// download + unzip
// -----------------------------------------------------------------------------
async function download(fileName) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const dest = join(CACHE_DIR, fileName);
  if (existsSync(dest) && !REFRESH) {
    console.log(`  · ${fileName} — cached`);
    return dest;
  }
  process.stdout.write(`  · ${fileName} — downloading… `);
  const res = await fetch(`${BASE_URL}/${fileName}`);
  if (!res.ok) die(`GET ${BASE_URL}/${fileName} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  return dest;
}

/**
 * Extract a single entry from a ZIP archive.
 *
 * Deliberately hand-rolled rather than shelling out to `tar`/`unzip`: the GNU
 * tar that ships with Git Bash on Windows cannot read ZIP at all (only the
 * bsdtar in native Windows can), and `unzip` is not guaranteed anywhere. The
 * GeoNames archives are single-entry, non-encrypted, non-ZIP64 deflate — the
 * narrow case this reader handles, and it fails loudly on anything else.
 */
function extractFromZip(zipPath, entryName) {
  const buf = readFileSync(zipPath);

  // Locate the End Of Central Directory record (scan back from the tail; the
  // trailing comment is at most 64 KB).
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) die(`${zipPath} — no ZIP end-of-central-directory record found.`);

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) die(`${zipPath} — corrupt central directory.`);
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    if (name === entryName) {
      if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
        die(`${zipPath} — corrupt local header for ${entryName}.`);
      }
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return data.toString('utf8');
      if (method === 8) return inflateRawSync(data).toString('utf8');
      die(`${zipPath} — unsupported ZIP compression method ${method}.`);
    }

    ptr += 46 + nameLen + extraLen + commentLen;
  }

  die(`${zipPath} — entry "${entryName}" not found.`);
}

// -----------------------------------------------------------------------------
// parsing helpers
// -----------------------------------------------------------------------------
const tsvRows = (text) =>
  text
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/\r$/, '').split('\t'));

/**
 * Lower-case + strip diacritics, mirroring the SQL side's lower(unaccent(…)).
 *
 * CRITICAL: the mark is stripped ONLY when it modifies a Latin base letter.
 * Postgres' unaccent leaves Cyrillic untouched (verified: unaccent('Київ')
 * returns 'Київ'), so a naive `.replace(/\p{Diacritic}/gu, '')` would fold
 * Ukrainian "ї" -> "і" here and store "киів" while the RPC searches for
 * "київ" — the two sides would never match and Cyrillic search would silently
 * return nothing.
 */
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/(\p{Script=Latin})\p{Mark}+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .trim();

// Search aliases are restricted to Latin/Cyrillic. Storing every GeoNames
// alternate name (Arabic, CJK, Devanagari, …) would multiply table size for
// scripts an EN/ES release cannot surface, and the cities1000 alternatenames
// column is by far the biggest field in the dump.
const ALIAS_OK =
  /^[\p{Script=Latin}\p{Script=Cyrillic}0-9][\p{Script=Latin}\p{Script=Cyrillic}0-9 '’\-.()]*$/u;
const HAS_CYRILLIC = /\p{Script=Cyrillic}/u;

/**
 * Cyrillic aliases are NOT capped, on purpose.
 *
 * An earlier cap of 6 silently broke Lviv: GeoNames lists its Cyrillic forms as
 * "Лавов, Лвов, Львив, Львов, Львов ош, Львоў, Львів" — the actual Ukrainian
 * name is SEVENTH, so the cap cut off the one spelling a Ukrainian member would
 * ever type. Because the source order carries no notion of importance, any cap
 * is a lottery, and this was the second time the same lottery lost (Kyiv's
 * Latin list did it first).
 *
 * Measured against the real dump, uncapping costs essentially nothing: of
 * 170,570 cities, 118,115 have zero Cyrillic aliases and only 509 have more
 * than six (the single worst row has ~20). Latin aliases still need a cap —
 * that list is where the long tail of medieval exonyms lives.
 */
const MAX_LATIN_ALIASES = 8;

/**
 * Build the ascii-folded alias list a city is findable by.
 *
 * The alternatenames column is NOT ordered by usefulness — Kyiv's begins with
 * "Chijv", "Chiovia", "Kaenugardur". Taking the first N therefore fills the
 * budget with medieval exonyms and drops "Київ"/"Киев"/"Kiev" entirely, which
 * is exactly what a Ukrainian- or Spanish-speaking member types. So aliases
 * are PRIORITISED, not truncated in source order:
 *   1. the city's own ascii + local name (never dropped),
 *   2. EVERY Cyrillic form, uncapped (see MAX_LATIN_ALIASES above for why
 *      capping this list is a lottery that has already lost twice),
 *   3. Latin forms that share a first letter with the ascii name — real
 *      spelling variants ("Kiev" for "Kyiv") rather than unrelated exonyms.
 */
function buildSearchNames(asciiName, name, alternatenames) {
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    if (!raw) return false;
    const trimmed = raw.trim();
    if (!ALIAS_OK.test(trimmed)) return false;
    const v = fold(trimmed);
    if (!v || v.length > 80 || seen.has(v)) return false;
    seen.add(v);
    out.push(v);
    return true;
  };

  push(asciiName);
  push(name);

  const alts = (alternatenames || '').split(',');
  const firstLetter = fold(asciiName).charAt(0);

  for (const alt of alts) {
    if (HAS_CYRILLIC.test(alt)) push(alt);
  }

  let latin = 0;
  for (const alt of alts) {
    if (latin >= MAX_LATIN_ALIASES) break;
    if (HAS_CYRILLIC.test(alt)) continue;
    if (fold(alt).charAt(0) !== firstLetter) continue;
    if (push(alt)) latin++;
  }

  return out;
}

// -----------------------------------------------------------------------------
// batched upsert
// -----------------------------------------------------------------------------
const BATCH = 1000;

async function upsertAll(table, rows, onConflict) {
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) die(`${table} upsert failed at row ${i}: ${error.message}`);
    done += chunk.length;
    process.stdout.write(`\r  · ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write(`\r  · ${table}: ${done}/${rows.length} ✔\n`);
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
console.log(`\n🌍 Seeding geo reference data into ${SUPABASE_URL}`);
console.log(`\nDownloading GeoNames dumps${REFRESH ? ' (--refresh)' : ''}:`);

const countryPath = await download('countryInfo.txt');
const admin1Path = await download('admin1CodesASCII.txt');
const citiesZipPath = await download('cities1000.zip');

// --- countries ---------------------------------------------------------------
// countryInfo.txt: ISO, ISO3, ISO-Numeric, fips, Country, Capital, Area,
// Population, Continent, tld, CurrencyCode, CurrencyName, Phone, …
console.log('\nParsing:');
const countries = tsvRows(readFileSync(countryPath, 'utf8'))
  .filter((c) => c[0] && c[0].length === 2 && c[4])
  .map((c) => ({
    iso2: c[0],
    iso3: c[1] || null,
    name: c[4],
    continent: c[8] || null,
    phone_code: c[12] || null,
  }));
const knownCountries = new Set(countries.map((c) => c.iso2));
console.log(`  · countries: ${countries.length}`);

// --- admin1 ------------------------------------------------------------------
// admin1CodesASCII.txt: "US.IL\tIllinois\tIllinois\t4896861"
const admin1 = [];
for (const row of tsvRows(readFileSync(admin1Path, 'utf8'))) {
  const [key, name, , geonameId] = row;
  if (!key || !name) continue;
  const dot = key.indexOf('.');
  if (dot === -1) continue;
  const country = key.slice(0, dot);
  const code = key.slice(dot + 1);
  // FK to geo_countries — skip subdivisions of codes GeoNames lists but
  // countryInfo.txt does not (deprecated/disputed entries).
  if (!code || !knownCountries.has(country)) continue;
  admin1.push({
    country_code: country,
    admin1_code: code,
    name,
    geoname_id: geonameId ? Number(geonameId) : null,
  });
}
console.log(`  · admin1 subdivisions: ${admin1.length}`);

// --- cities ------------------------------------------------------------------
// cities1000.txt columns: 0 geonameid, 1 name, 2 asciiname, 3 alternatenames,
// … 8 country code, 10 admin1 code, 14 population, 17 timezone
const citiesText = extractFromZip(citiesZipPath, 'cities1000.txt');
const cities = [];
for (const row of tsvRows(citiesText)) {
  const geonameId = Number(row[0]);
  const country = row[8];
  if (!geonameId || !row[1] || !knownCountries.has(country)) continue;
  const asciiName = row[2] || row[1];
  cities.push({
    geoname_id: geonameId,
    name: row[1],
    ascii_name: asciiName,
    country_code: country,
    admin1_code: row[10] || null,
    population: Number(row[14]) || 0,
    timezone: row[17] || null,
    search_names: buildSearchNames(asciiName, row[1], row[3]),
  });
}
console.log(`  · cities: ${cities.length}`);

// --- write -------------------------------------------------------------------
// Order matters: geo_cities.country_code and geo_admin1.country_code are FKs
// onto geo_countries.
console.log('\nUpserting (never deletes — profiles reference these rows):');
await upsertAll('geo_countries', countries, 'iso2');
await upsertAll('geo_admin1', admin1, 'country_code,admin1_code');
await upsertAll('geo_cities', cities, 'geoname_id');

console.log('\n✔ Geo reference data seeded.\n');
