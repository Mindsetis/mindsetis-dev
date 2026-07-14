-- =============================================================================
-- Collapse the `interests` catalog table + `profile_interests` join table into
-- a single `profiles.interests text[]` column, mirroring `profiles.languages`.
-- =============================================================================
-- Why: the interests taxonomy (category -> label) is moving to a static,
-- code-defined catalog owned by the frontend (a parallel task), not
-- staff-editable DB data. Once the catalog itself no longer lives in
-- Postgres, there is nothing left for `interests` (the catalog table),
-- `profile_interests` (the join table), `replace_profile_interests()` (the
-- atomic-replace RPC), or `enforce_profile_interests_limit()` (the max-10
-- trigger) to do — a profile's *selected* interests are just a flat list of
-- stable string slugs (e.g. "golf", "tea-coffee-culture"), exactly like
-- `profiles.languages` already is: plain `text[]`, no DB-level catalog table,
-- no CHECK/enum constraint, no cross-row cap trigger. The allowed-values
-- vocabulary and the max-10 selection cap are enforced purely in Zod
-- (client + server action), the same way `languages`' `LANGUAGE_VALUES` enum
-- + `.max()` already work today with zero DB-level enforcement — see
-- `profiles.languages`' comment in 20260707141211_profile_step2_interests.sql.
--
-- This migration:
--   1. Adds `profiles.interests text[] default '{}'` — same shape as
--      `profiles.languages`.
--   2. Backfills the (small, real — 3 rows at the time of writing, all under
--      one profile) existing `profile_interests` picks into the new column,
--      converting each `(category, label)` pair to its new stable slug via an
--      explicit mapping table, `array_agg(distinct ...)`'d per profile (the
--      `distinct` also naturally dedupes "Yoga", which existed under two
--      categories — "Sports & Health" and "Culture & Art" — mapping to the
--      same `yoga` slug; that collapse is intentional, not data loss).
--   3. Drops the now-superseded objects, in dependency order: the max-10
--      trigger + its function, `profile_interests` itself, the
--      `replace_profile_interests()` RPC, then the `interests` catalog table.
--
-- This drop was explicitly confirmed by the user (via an in-app confirmation
-- prompt) after being shown this exact plan — including that it is
-- irreversible schema surgery on live data — and is proceeding only because
-- step 2 backfills every existing selection into `profiles.interests` first,
-- so no user-facing data is lost, only its storage shape changes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles.interests — plain text[], mirroring profiles.languages
-- -----------------------------------------------------------------------------
alter table profiles
  add column if not exists interests text[] default '{}';

comment on column profiles.interests is
  'Multi-select "interests" (max 10, category chips in the UI). Plain text[] of stable code-defined slugs (e.g. "golf", "tea-coffee-culture") rather than a catalog table, same treatment as `languages` — allowed values and the 10-item cap are enforced in Zod only, not the DB.';

-- -----------------------------------------------------------------------------
-- 2. Backfill existing profile_interests picks into profiles.interests
-- -----------------------------------------------------------------------------
-- Explicit (category, label) -> slug mapping, matching the frontend's static
-- catalog exactly. A `(values ...)` table joined against `interests`/
-- `profile_interests`, not per-row hand-written UPDATEs, so this is correct
-- regardless of exactly which rows exist at push time.
with slug_map (category, label, slug) as (
  values
    ('Sports & Health',   'Golf',                    'golf'),
    ('Sports & Health',   'Tennis',                  'tennis'),
    ('Sports & Health',   'Padel',                   'padel'),
    ('Sports & Health',   'Skiing & Snowboarding',   'skiing-snowboarding'),
    ('Sports & Health',   'Running',                 'running'),
    ('Sports & Health',   'Cycling',                 'cycling'),
    ('Sports & Health',   'Swimming',                'swimming'),
    ('Sports & Health',   'Football',                'football'),
    ('Sports & Health',   'Basketball',              'basketball'),
    ('Sports & Health',   'Boxing',                  'boxing'),
    ('Sports & Health',   'Bouldering',              'bouldering'),
    ('Sports & Health',   'Gym & Fitness',           'gym-fitness'),
    ('Sports & Health',   'Yoga',                    'yoga'),
    ('Travel & Outdoors', 'Travel',                  'travel'),
    ('Travel & Outdoors', 'Hiking',                  'hiking'),
    ('Travel & Outdoors', 'Yachting',                'yachting'),
    ('Travel & Outdoors', 'Road Trips',              'road-trips'),
    ('Travel & Outdoors', 'Motorcycles',             'motorcycles'),
    ('Gastronomy',        'Wine & Spirits',          'wine-spirits'),
    ('Gastronomy',        'Fine Dining',             'fine-dining'),
    ('Gastronomy',        'Cooking',                 'cooking'),
    ('Gastronomy',        'Tea/Coffee Culture',      'tea-coffee-culture'),
    ('Culture & Art',     'Art & Collecting',        'art-collecting'),
    ('Culture & Art',     'Books',                   'books'),
    ('Culture & Art',     'Chess',                   'chess'),
    ('Culture & Art',     'Theater',                 'theater'),
    ('Culture & Art',     'Cinema',                  'cinema'),
    ('Culture & Art',     'Yoga',                    'yoga'),
    ('Culture & Art',     'Dance',                   'dance'),
    ('Culture & Art',     'Mindfulness',             'mindfulness'),
    ('Social & Impact',   'Charity',                 'charity'),
    ('Social & Impact',   'Volunteering',            'volunteering'),
    ('Social & Impact',   'Investing',               'investing'),
    ('Social & Impact',   'Mentorship',              'mentorship'),
    ('Social & Impact',   'Podcasting',               'podcasting'),
    ('Social & Impact',   'Public Speaking',         'public-speaking')
),
backfill as (
  select
    pi.profile_id,
    array_agg(distinct sm.slug order by sm.slug) as slugs
  from profile_interests pi
  join interests i on i.id = pi.interest_id
  join slug_map sm on sm.category = i.category and sm.label = i.label
  group by pi.profile_id
)
update profiles p
set interests = backfill.slugs
from backfill
where backfill.profile_id = p.id;

-- -----------------------------------------------------------------------------
-- 3. Drop the now-superseded catalog + join-table + trigger + RPC
-- -----------------------------------------------------------------------------
-- User-confirmed after the safe backfill above — proceeding without a
-- separate data-loss safeguard beyond the backfill itself, per instruction.
drop trigger if exists enforce_profile_interests_limit on profile_interests;
drop function if exists public.enforce_profile_interests_limit();
drop table if exists profile_interests;
drop function if exists public.replace_profile_interests(uuid, uuid[]);
drop table if exists interests;
