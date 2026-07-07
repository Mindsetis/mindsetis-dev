-- =============================================================================
-- Member sign-up step 2/4 ("Member profile"): country/city split, about,
-- languages, and the "interests" multi-select (catalog + per-profile picks)
-- =============================================================================
-- This migration:
--   1. Splits profiles.location (unused — see confirmation below) into
--      profiles.country / profiles.city, and adds profiles.about (distinct
--      from the existing profiles.bio) and profiles.languages (simple
--      text[], not a catalog table — a controlled-but-not-catalog-heavy
--      "languages you speak" multi-select).
--   2. Adds `interests` — a staff-managed picklist catalog (category + label,
--      e.g. "Sports & Health" -> "Golf"), read-only for clients.
--   3. Adds `profile_interests` — the per-profile join table for the
--      multi-select, owner-writable (insert/delete only — it is a pure
--      picklist join, never updated in place), capped at 10 rows per profile
--      via trigger (Postgres has no native cross-row CHECK constraint).
--   4. Seeds `interests` with the canonical taxonomy confirmed by product:
--      five categories, but tag rows only for "Sports & Health" (the only
--      category with visible tag data in the current Figma export). The
--      other four categories intentionally have zero rows in this table for
--      now (see the seed section below for why "zero rows" is the correct
--      representation, not placeholder tags) — a follow-up migration will
--      add their tags once that part of the design is available.
--
-- `profiles.location` unused-usage check (per explicit instruction before
-- dropping it): grepped the full app/lib/components/supabase trees for
-- "location" — the only hits were its own column declaration in
-- 20260701100100_profiles.sql and an unrelated comment in
-- 20260701090000_enable_extensions.sql about pg_cron's install location.
-- No server action, query, seed script, or generated types reference it (no
-- profile UI/typed client exists yet). Safe to drop; profiles' RLS is
-- table-level (profiles_read / profiles_update_own / profiles_update_staff
-- from 20260701100100_profiles.sql), so removing a column needs no policy
-- change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles — country/city split, about, languages
-- -----------------------------------------------------------------------------
alter table profiles
  add column if not exists country   text,
  add column if not exists city      text,
  add column if not exists about     text,
  add column if not exists languages text[] default '{}',
  drop column if exists location;

comment on column profiles.country is
  'Free-text country, replacing the old combined `location` column (step 2/4 of sign-up).';
comment on column profiles.city is
  'Free-text city, replacing the old combined `location` column (step 2/4 of sign-up).';
comment on column profiles.about is
  'Longer "about me" field collected at sign-up step 2/4. Distinct from `bio` (a separate, pre-existing field) — not a duplicate.';
comment on column profiles.languages is
  'Multi-select "languages you speak". Plain text[] rather than a catalog table: a controlled but not catalog-heavy vocabulary.';

-- -----------------------------------------------------------------------------
-- 2. interests — staff-managed picklist catalog (category + label)
-- -----------------------------------------------------------------------------
create table if not exists interests (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,
  label      text not null,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint interests_category_label_key unique (category, label)
);

comment on table interests is
  'Picklist catalog for the profile "interests" multi-select (e.g. category "Sports & Health" -> label "Golf"). Reference/catalog data: readable by any authenticated caller, mutated only by staff (like other catalog data in this project).';

create index if not exists interests_category_idx on interests (category, sort_order);

alter table interests enable row level security;

create policy "interests_read" on interests
  for select
  to authenticated
  using (true);

-- Intentionally no client INSERT/UPDATE/DELETE policy: this is reference/
-- catalog data, curated by staff/service role only (mirrors the "no client
-- write policy" treatment other catalog-style tables get in this project).
create policy "interests_write_staff" on interests
  for all
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create trigger set_interests_updated_at
  before update on interests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. profile_interests — per-profile picks (max 10), owner-writable
-- -----------------------------------------------------------------------------
create table if not exists profile_interests (
  profile_id  uuid not null references profiles(id) on delete cascade,
  interest_id uuid not null references interests(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (profile_id, interest_id)
);

comment on table profile_interests is
  'Join table for a profile''s chosen interests (max 10 per profile, enforced by enforce_profile_interests_limit()). Pure picklist selection — no updated_at, rows are only ever inserted or deleted, never mutated in place.';

create index if not exists profile_interests_interest_id_idx on profile_interests (interest_id);

alter table profile_interests enable row level security;

create policy "profile_interests_read" on profile_interests
  for select
  using (auth.uid() = profile_id or is_staff(auth.uid()));

create policy "profile_interests_insert" on profile_interests
  for insert
  with check (auth.uid() = profile_id or is_staff(auth.uid()));

create policy "profile_interests_delete" on profile_interests
  for delete
  using (auth.uid() = profile_id or is_staff(auth.uid()));

-- No UPDATE policy: selections are added/removed, never edited in place.

-- Max-10-per-profile guard. Postgres has no native "check across rows"
-- constraint, so this needs a trigger. Implemented as an AFTER INSERT FOR
-- EACH STATEMENT trigger over a transition table (`new_rows`), rather than a
-- naive BEFORE INSERT FOR EACH ROW count, because a BEFORE ROW trigger's
-- `select count(*) from profile_interests where profile_id = ...` does NOT
-- see sibling rows from the SAME multi-row INSERT statement (they share one
-- query snapshot), so a single batched `insert ... values (...), (...), ...`
-- of, say, 12 rows for one profile could slip past a naive per-row check.
-- The AFTER STATEMENT + transition-table form runs once per statement, after
-- all of that statement's rows are physically present, so a single count(*)
-- per affected profile_id is correct regardless of whether the client inserts
-- one row at a time or in a batch. Raising inside the trigger rolls back the
-- whole statement (and, if the caller wraps it in one, the whole
-- transaction), so the picklist is never left over-limit.
create or replace function public.enforce_profile_interests_limit()
returns trigger
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select profile_id, count(*) as total
    from public.profile_interests
    where profile_id in (select distinct profile_id from new_rows)
    group by profile_id
  loop
    if r.total > 10 then
      raise exception 'A profile may have at most 10 interests (profile % would have %)',
        r.profile_id, r.total;
    end if;
  end loop;

  return null;
end;
$$;

comment on function public.enforce_profile_interests_limit() is
  'AFTER INSERT FOR EACH STATEMENT trigger on profile_interests (via the new_rows transition table): raises if any affected profile would end up with more than 10 interest rows. Statement-level (not row-level) so it is correct for both single-row and batched multi-row inserts within one statement — see the long comment above the trigger for why a naive BEFORE INSERT FOR EACH ROW count is not batch-safe.';

create trigger enforce_profile_interests_limit
  after insert on profile_interests
  referencing new table as new_rows
  for each statement
  execute function public.enforce_profile_interests_limit();

-- -----------------------------------------------------------------------------
-- 4. Seed data — canonical taxonomy confirmed by product
-- -----------------------------------------------------------------------------
-- Tags seeded only for "Sports & Health" (the one category with visible tag
-- data across both the mobile and desktop Figma frames; near-duplicates like
-- separate "Skiing" / "Snowboarding" chips are unified into one
-- "Skiing & Snowboarding" tag). The other four categories — "Travel &
-- Outdoors", "Gastronomy", "Culture & Art", "Social & Impact" — are
-- deliberately seeded with ZERO rows here: this table has no separate
-- "categories" relation (a row IS a category+label tag), so "a category with
-- no tags yet" has no placeholder-free representation as a row; inventing
-- one would mean fabricating a fake label, which was explicitly rejected.
-- The frontend can still render those four category chips from a static
-- list until a follow-up migration adds their real tag rows.
insert into interests (category, label, sort_order) values
  ('Sports & Health', 'Golf',                    10),
  ('Sports & Health', 'Tennis',                  20),
  ('Sports & Health', 'Padel',                   30),
  ('Sports & Health', 'Skiing & Snowboarding',   40),
  ('Sports & Health', 'Running',                 50),
  ('Sports & Health', 'Cycling',                 60),
  ('Sports & Health', 'Swimming',                70),
  ('Sports & Health', 'Football',                80),
  ('Sports & Health', 'Basketball',               90),
  ('Sports & Health', 'Boxing',                  100),
  ('Sports & Health', 'Bouldering',               110),
  ('Sports & Health', 'Gym & Fitness',           120),
  ('Sports & Health', 'Yoga',                    130)
on conflict (category, label) do nothing;
