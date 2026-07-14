-- =============================================================================
-- Stage 1.3 — "I'm on the way" lead capture
-- =============================================================================
-- Escape-hatch from spec §5.2 ("«I'm on the way» → запис у `leads` одразу
-- (навіть якщо далі не пройде), передається команді"): visitors who are not
-- ready to complete the full registration wizard can leave just a name +
-- email, with no Supabase Auth account created. The submitter is frequently
-- anonymous (not signed in) and there is no owner concept once submitted, so
-- this follows the exact same "staff-read-only, public-insert-only" shape as
-- `newsletter_emails` (20260701195644_newsletter_emails.sql) and
-- email_messages/email_events (20260701110000_email_queue.sql):
--   * anon + authenticated may INSERT (capture a lead) — no auth required.
--   * nobody except staff may ever SELECT/UPDATE/DELETE a row — this is
--     unauthenticated PII (name + email of a visitor), not owned data a
--     "read own" policy could scope to.
-- Staff-facing lead list/queue UI is out of scope here (deferred to the
-- admin-panel stage, spec §5.14) — this migration only captures and stores.
-- =============================================================================

create table leads (
  id         uuid primary key default gen_random_uuid(),
  -- Freeform "ім'я" the visitor typed in — required per spec ("ім'я + email"),
  -- short freeform text, no format constraint beyond non-empty.
  name       text not null
               check (char_length(trim(name)) > 0 and char_length(name) <= 200),
  email      text not null
               check (
                 char_length(email) <= 254
                 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
               ),
  -- Which page/flow captured this lead (e.g. 'onboarding-tour-intro'),
  -- freeform for now — no enum at this stage, nullable when unknown/not
  -- passed by a call site.
  source     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leads is
  'Leads captured via the "I''m on the way" escape hatch (spec §5.2) for visitors not completing the full registration wizard: name + email only, no Supabase Auth account. No owner column — submitters are frequently anonymous. Staff-read-only: anon/authenticated may INSERT (capture) but never SELECT/UPDATE/DELETE, so nobody can enumerate or tamper with other visitors'' leads.';

comment on column leads.name is
  'Freeform name the visitor typed in. Required (spec: "ім''я + email"); only constrained to be non-empty and length-capped, no further format validation at the DB layer.';

comment on column leads.source is
  'Freeform label for which page/flow captured this lead (e.g. ''onboarding-tour-intro''). Nullable when the caller does not supply one; no enum yet at this stage.';

comment on constraint leads_email_check on leads is
  'DB-level guard against malformed/empty/oversized email values: the INSERT policy below is intentionally open (`with check (true)`) to anon/authenticated so PostgREST callers can reach this table directly, bypassing the app''s Zod validation — so "email is a plausible address" must be enforced here, not only in lib/validation/. The regex is deliberately permissive (RFC-strict validation belongs to the app layer / actual send attempt); this only rejects obvious junk (missing @, missing domain dot, embedded whitespace) and caps length to match common email column limits.';

-- No uniqueness constraint on email: unlike newsletter_emails (one active
-- subscription per address), a visitor may legitimately submit "I'm on the
-- way" more than once (retrying the wizard on different days) and each
-- attempt is a useful signal for the team's manual follow-up queue.

alter table leads enable row level security;

-- Public capture: anyone (logged in or not) can submit the "I'm on the way"
-- form. `with check (true)` is safe here precisely because there is no
-- SELECT policy granting anon/authenticated read access — an inserter can't
-- read back their own row (or anyone else's) through PostgREST.
create policy "leads_insert_public" on leads
  for insert
  to anon, authenticated
  with check (true);

-- Staff-only read/update/delete. No client (anon or authenticated) may ever
-- read, edit, or remove a lead — this mirrors the money-table posture (no
-- client write beyond the narrow public insert above) plus a staff-only
-- read, per CLAUDE.md "Staff access via is_staff(uuid)".
create policy "leads_select_staff" on leads
  for select
  using (is_staff(auth.uid()));

create policy "leads_update_staff" on leads
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create policy "leads_delete_staff" on leads
  for delete
  using (is_staff(auth.uid()));

-- updated_at is kept (matches repo-wide standard columns convention) so a
-- future staff annotation/status feature (out of scope here — admin-panel
-- stage) can update a row without a separate migration to add the column
-- and trigger later.
create trigger set_leads_updated_at
  before update on leads
  for each row execute function public.set_updated_at();
