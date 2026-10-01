-- =============================================================================
-- Release 1 — profiles: DB-enforced industry catalog membership + custom/other consistency
-- =============================================================================
-- Context: `profiles.industries` (text[], <=3 slugs) and `profiles.industry_custom` (free
-- text for "Other") are validated by the app's Zod schema
-- (lib/validation/build-profile.ts, refineIndustryCustom) against the catalog in
-- lib/constants/industries.ts (INDUSTRY_VALUES / OTHER_INDUSTRY_VALUE = 'other'). The
-- existing DB constraints from 20260920093000_profiles_multi_industry.sql
-- (profiles_industries_valid / industries_valid()) only check shape (<=3 items, no
-- null/blank elements, no duplicates) — they do NOT check that each element is actually one
-- of the catalog slugs, and nothing stops `industry_custom` being set while 'other' is absent
-- from `industries`.
--
-- A live probe against the hosted project confirmed both gaps are real: a row's own owner,
-- writing with their own key (RLS-scoped, not service role), can `update profiles set
-- industries = array['not-a-real']` and get a 204, and can set `industry_custom` without
-- 'other' in `industries`. The app's form never produces such a row, but the form is not the
-- only writer of this table (Server Actions call `.update()` on user input that only Zod
-- gates; anything bypassing the form — a bug, a future API, a manual fix, a future public
-- write path — is only one missed `if` away from writing garbage). Once a catalog/search
-- filter over `industries` exists, an out-of-catalog slug would silently never match any
-- filter option, and an orphaned `industry_custom` would imply "Other" was picked when it
-- wasn't. This migration closes both gaps in the database itself, not just in the form.
--
-- Hosted data was checked before writing this migration (13 profiles rows total; 8 with a
-- non-empty `industries`, 1 with a non-empty `industry_custom`): zero rows had an
-- out-of-catalog `industries` value, zero rows had `industry_custom` set without 'other' in
-- `industries`. Both new rules apply cleanly to 100% of existing rows — no backfill/cleanup
-- needed.
--
-- MAINTENANCE NOTE: the catalog list hardcoded into industries_valid() below must be kept in
-- sync with `INDUSTRY_VALUES` in lib/constants/industries.ts by hand. Adding, renaming, or
-- removing an industry slug in that file requires a follow-up migration that
-- `create or replace function`s industries_valid() with the new list (existing rows are
-- re-checked against CHECK constraints only on write, not retroactively, so a slug rename
-- also needs a data backfill migration if any row already uses the old slug).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Rule (a): every element of `industries` must be a known catalog slug.
--    Folded into the existing industries_valid() helper (create or replace, same
--    signature) rather than a new function, so the single existing CHECK constraint
--    (profiles_industries_valid, added in 20260920093000_profiles_multi_industry.sql)
--    picks up the new rule automatically — no constraint rename/drop needed.
-- -----------------------------------------------------------------------------
create or replace function public.industries_valid(arr text[])
returns boolean
language sql
immutable
as $$
  select
    arr is not null
    and cardinality(arr) <= 3
    -- no null / empty / whitespace-only elements
    and not exists (
      select 1 from unnest(arr) v where v is null or btrim(v) = ''
    )
    -- no duplicates within the array
    and cardinality(arr) = (select count(distinct v) from unnest(arr) v)
    -- every element is one of lib/constants/industries.ts's INDUSTRY_VALUES — see the
    -- MAINTENANCE NOTE above for what to do when that file's catalog changes.
    and arr <@ array[
      'consulting', 'cybersecurity', 'e-commerce', 'education', 'events', 'fashion',
      'finance', 'healthcare', 'hospitality', 'investments', 'logistics',
      'manufacturing', 'marketing', 'media-entertainment', 'non-profit', 'other',
      'real-estate', 'retail', 'technology'
    ]::text[];
$$;

comment on function public.industries_valid(text[]) is
  'CHECK-constraint helper for profiles.industries: array is non-null, has at most 3 elements, no null/blank elements, no duplicate elements, and every element is one of the catalog slugs mirrored here from lib/constants/industries.ts INDUSTRY_VALUES (keep in sync by hand — see MAINTENANCE NOTE in 20260930070635_profiles_industries_catalog_guard.sql). Called from profiles_industries_valid so the CHECK expression itself stays subquery-free.';

-- -----------------------------------------------------------------------------
-- 2. Rule (b): `industry_custom` may only be set when 'other' is one of the selected
--    `industries` slugs. Mirrors the app: BuildProfileForm/MemberProfileForm write
--    `industry_custom: input.industryCustom?.trim() || null` and clear the field
--    (`form.setValue('industryCustom', '')`) whenever 'other' is deselected — the form
--    never produces `industry_custom <> null` with 'other' absent from `industries`. The
--    reverse (`'other'` selected but `industry_custom` still null) is intentionally NOT
--    rejected here: that is a form-only "required while visible" rule
--    (refineIndustryCustom's industryCustomRequired), not a data-integrity invariant — a
--    profile mid-edit, or written by a future trusted server path, may legitimately have
--    'other' selected with no custom text yet.
-- -----------------------------------------------------------------------------
alter table profiles
  add constraint profiles_industry_custom_requires_other
    check (industry_custom is null or 'other' = any(industries));

comment on constraint profiles_industry_custom_requires_other on profiles is
  'industry_custom may only be non-null when "other" is present in industries — mirrors how the app clears industry_custom to null whenever "other" is deselected (BuildProfileForm/MemberProfileForm). Does not require the reverse (other selected => custom present); that stays a form-only rule.';
