-- =============================================================================
-- Stage 1.7 — "I'm on the way" lead capture: full rework (supersedes 1.3)
-- =============================================================================
-- Stage 1.3 built a separate popup with its own Name + Email fields, firing an
-- open `leads` INSERT independent of the registration flow. Stage 1.7 replaces
-- that entirely: the visitor's email is captured straight from the homepage
-- hero field (`components/marketing/HeroEmailCta.tsx`) and the same `leads`
-- row is later flipped to `registered = true` server-side once the visitor
-- actually completes account registration — no separate popup/page, no `name`
-- or `source` fields anymore.
--
-- Rather than create a new table, the existing `leads` table
-- (20260714140052_leads.sql, 20260714150000_leads_source_length_check.sql) is
-- reworked in place:
--   * `name`/`source` are dropped (and their check constraints go with them).
--   * `registered boolean not null default false` is added — flips to `true`
--     only via the service-role client from the sign-up Server Action
--     (`app/[locale]/(auth)/actions.ts`), the same "server-only for the
--     sensitive field" posture CLAUDE.md mandates for money tables.
--   * `email` becomes unique — resubmitting the same email (e.g. retrying the
--     homepage field on a later visit) upserts the existing row instead of
--     creating duplicates.
--   * The public INSERT policy is narrowed from `with check (true)` to
--     `with check (registered = false)`: an anon/authenticated caller can
--     still capture a new lead (or, via upsert, touch their own unregistered
--     row), but can never set `registered = true` directly through
--     PostgREST — that flip is exclusively a service-role write.
-- UPDATE was already staff-only (`leads_update_staff`, unchanged here), so
-- anon/authenticated already had zero UPDATE access before this migration —
-- the service-role client bypasses RLS entirely for the `registered` flip.
-- =============================================================================

alter table leads
  drop column name,
  drop column source;

alter table leads
  add column registered boolean not null default false;

alter table leads
  add constraint leads_email_key unique (email);

comment on column leads.registered is
  'Set to false when the row is first captured (homepage hero email field, pre-registration). Flipped to true only by the service-role client from the sign-up Server Action after a successful auth.users account is created for this email — never client-writable (see leads_insert_public''s `with check`).';

comment on constraint leads_email_key on leads is
  'One row per email: resubmitting the homepage hero field (e.g. a repeat visit) upserts the existing row rather than creating a duplicate lead. The app always lowercases email before insert, so no separate `lower(email)` functional index is needed.';

-- Replace the public INSERT policy: still open to anon/authenticated (the
-- homepage hero field is unauthenticated), but a client can never set
-- `registered = true` directly — that flip only ever happens server-side via
-- the service-role client (bypasses RLS), called from the sign-up Server
-- Action after a successful account creation.
drop policy "leads_insert_public" on leads;

create policy "leads_insert_public" on leads
  for insert
  to anon, authenticated
  with check (registered = false);

comment on table leads is
  'Leads captured from the homepage hero email field (spec §5.2, reworked stage 1.7) before a visitor completes account registration: email only, no Supabase Auth account required at capture time. `registered` flips to true server-side once the same email completes sign-up. No owner column — submitters are frequently anonymous. Staff-read-only: anon/authenticated may INSERT (capture, `registered = false` only) but never SELECT/UPDATE/DELETE, so nobody can enumerate or tamper with other visitors'' leads.';
