-- =============================================================================
-- Stage 1.11 — Homepage placeholder ("Заглушка") waitlist form
-- =============================================================================
-- Captures the "Apply to Join" form on the coming-soon homepage placeholder:
-- First name + Email + LinkedIn-or-Instagram URL, submitted by anonymous
-- (unauthenticated) site visitors. This is a DIFFERENT, distinct capture from
-- `leads` (20260714140052_leads.sql, reworked 20260716185041): `leads` is
-- email-only and tracks homepage-hero-field -> registration conversion via a
-- `registered` flag; this table has three required fields and no conversion
-- concept — it is a one-shot "notify me at launch" application.
--
-- Unlike `leads`/`newsletter_emails` (which grant `anon, authenticated` an open
-- `for insert with check (true)` policy), this table has **no client-facing
-- INSERT policy at all**. Stage 1.7 (see ROADMAP.md) found live, against the
-- hosted project, that `leads_insert_public` combined with an `ON CONFLICT`
-- upsert from the anon client fails RLS (`42501`) because Postgres needs
-- SELECT-visibility into any potentially-conflicting row to evaluate
-- `ON CONFLICT` at all, and anon/authenticated has zero SELECT there. This
-- table sidesteps that whole class of bug by never accepting client writes in
-- the first place: the Server Action inserts (never upserts) via the
-- **service-role client** (`lib/supabase/service.ts`, bypasses RLS entirely)
-- and catches the unique-violation (Postgres error `23505`) to surface a
-- "this email was already submitted" error to the visitor. Consequently:
--   * anon/authenticated get NO insert/update/delete policy whatsoever — a
--     direct PostgREST insert attempt from the browser correctly fails RLS
--     (`42501`), which is intentional, not a bug, since all inserts route
--     through the service-role client.
--   * Staff get a read policy (back-office submissions list, spec §5.14) and a
--     delete policy (cleanup) via `is_staff(auth.uid())`.
--   * No UPDATE policy at all: rows are immutable once created. The
--     service-role client can still write via its own RLS bypass if ever
--     needed, but there is no client-facing UPDATE surface.
-- =============================================================================

create table homepage_waitlist (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null
                 check (char_length(trim(first_name)) > 0 and char_length(first_name) <= 200),
  email        text not null
                 check (
                   char_length(email) <= 254
                   and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                 ),
  -- LinkedIn or Instagram profile URL. Freeform text (the app's Zod schema is
  -- the primary format gate); only a non-empty/length guard at the DB layer,
  -- matching the `leads.name` precedent for freeform required text fields.
  social_link  text not null
                 check (char_length(trim(social_link)) > 0 and char_length(social_link) <= 2048),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table homepage_waitlist is
  'Submissions from the "Apply to Join" form on the coming-soon homepage placeholder (spec, stage 1.11 / Figma "Заглушка"): first name + email + LinkedIn-or-Instagram URL, submitted by anonymous visitors. Distinct from `leads` (email-only, tracks signup conversion) — this is a one-shot application with no conversion tracking. No client-facing INSERT policy: the Server Action writes exclusively via the service-role client and rejects duplicate emails with a 23505 unique-violation rather than upserting. Staff-read-only beyond that (SELECT + DELETE via is_staff()); no UPDATE policy — rows are immutable once created.';

comment on column homepage_waitlist.first_name is
  'Freeform first name the visitor typed in. Required; only non-empty + length-capped at the DB layer, format validated by the app''s Zod schema.';

comment on column homepage_waitlist.social_link is
  'LinkedIn or Instagram profile URL supplied by the visitor. Required; only non-empty + length-capped at the DB layer (no platform-specific regex), format validated by the app''s Zod schema.';

comment on constraint homepage_waitlist_email_check on homepage_waitlist is
  'DB-level guard against malformed/empty/oversized email values, defense-in-depth alongside the app''s Zod validation. Unlike `leads`/`newsletter_emails`, this table has no client-writable INSERT policy (writes are service-role only), so this constraint is not the only thing standing between a browser and a malformed row — but it still protects against bugs in the Server Action or any future direct service-role script.';

-- Case-insensitive uniqueness: 'Foo@x.com' and 'foo@x.com' are the same
-- submission. Hard product requirement — a visitor can NOT submit the same
-- email twice; the Server Action inserts (never upserts) and surfaces the
-- resulting 23505 unique-violation as a "this email was already submitted"
-- error rather than merging/updating the existing row.
create unique index homepage_waitlist_email_lower_uidx
  on homepage_waitlist (lower(email));

alter table homepage_waitlist enable row level security;

-- No INSERT/UPDATE policy for anon/authenticated at all: the Server Action
-- writes exclusively through the service-role client (bypasses RLS), so a
-- direct anon/authenticated INSERT attempt via PostgREST is expected to fail
-- RLS (42501) — this is intentional, not a gap.

-- Staff-only read: back-office submissions list (spec §5.14, deferred UI).
create policy "homepage_waitlist_select_staff" on homepage_waitlist
  for select
  using (is_staff(auth.uid()));

-- Staff-only delete: cleanup. No UPDATE policy at all (rows are immutable
-- once created; the service role can still write via its own RLS bypass if
-- ever needed, but there is no client-facing UPDATE surface).
create policy "homepage_waitlist_delete_staff" on homepage_waitlist
  for delete
  using (is_staff(auth.uid()));

create trigger set_homepage_waitlist_updated_at
  before update on homepage_waitlist
  for each row execute function public.set_updated_at();
