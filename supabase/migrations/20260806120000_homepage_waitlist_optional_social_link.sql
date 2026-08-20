-- =============================================================================
-- Stage 1.11 — Homepage waitlist: make `social_link` optional
-- =============================================================================
-- Product change: the "LinkedIn or Instagram" field on the coming-soon
-- homepage placeholder form is no longer required — visitors can join the
-- waitlist with just a first name + email. The original table
-- (20260805181705_homepage_waitlist.sql) declared the column `not null` with a
-- non-empty check, so both constraints have to relax together:
--
--   * `drop not null` — a submission without a link now stores SQL NULL (the
--     Server Action normalizes an omitted/blank value to null rather than to
--     an empty string, so "no link supplied" has exactly one representation).
--   * The length/non-empty check is replaced by a null-tolerant variant: when
--     a link IS present it must still be non-blank and <= 2048 chars (the
--     app's Zod schema remains the primary format gate, same as before); when
--     it's null the check passes. Postgres `check` constraints already treat a
--     NULL result as satisfied, but the predicate is rewritten explicitly so
--     the intent is readable rather than incidental.
--
-- No RLS change: the table still has no client-facing INSERT policy and all
-- writes still go through the service-role client (see the original
-- migration's header for that rationale).
-- =============================================================================

alter table homepage_waitlist
  alter column social_link drop not null;

alter table homepage_waitlist
  drop constraint homepage_waitlist_social_link_check;

alter table homepage_waitlist
  add constraint homepage_waitlist_social_link_check
  check (
    social_link is null
    or (char_length(trim(social_link)) > 0 and char_length(social_link) <= 2048)
  );

comment on column homepage_waitlist.social_link is
  'LinkedIn or Instagram profile URL supplied by the visitor. OPTIONAL (nullable) as of stage 1.11 — an omitted link is stored as NULL, never as an empty string. When present: non-empty + length-capped at the DB layer (no platform-specific regex), format validated by the app''s Zod schema.';

comment on constraint homepage_waitlist_social_link_check on homepage_waitlist is
  'Null-tolerant guard: the column is optional, but a link that IS supplied must be non-blank and at most 2048 characters.';
