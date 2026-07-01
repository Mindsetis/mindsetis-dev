-- =============================================================================
-- Newsletter subscriptions: footer signup form
-- =============================================================================
-- Captures email addresses submitted through the footer newsletter form on the
-- marketing/landing pages. The submitter is frequently anonymous (not signed
-- in), so both `anon` and `authenticated` may INSERT — but nobody except staff
-- may ever read, edit or delete a row, since this is unauthenticated PII with
-- no owner concept to scope a "read own" policy to (spec §4 staff-only access
-- pattern, same shape as email_messages/email_events in
-- 20260701110000_email_queue.sql).
-- =============================================================================

create table newsletter_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null
               check (
                 char_length(email) <= 254
                 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
               ),
  -- Locale the visitor subscribed from (e.g. 'en', 'es'), for segmenting
  -- future newsletter sends by language. Nullable: not every call site is
  -- guaranteed to know/pass a locale.
  locale     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table newsletter_emails is
  'Email addresses captured via the footer newsletter signup form (marketing pages). No owner column — subscribers are frequently anonymous. Staff-read-only: anon/authenticated may INSERT (subscribe) but never SELECT/UPDATE/DELETE, so nobody can enumerate or tamper with other visitors'' subscriptions.';

comment on column newsletter_emails.locale is
  'Locale the visitor subscribed from (e.g. ''en''/''es''), for future segmented sends. Nullable when the caller does not supply one.';

comment on constraint newsletter_emails_email_check on newsletter_emails is
  'DB-level guard against malformed/empty/oversized email values: the INSERT policy below is intentionally open (`with check (true)`) to anon/authenticated so PostgREST callers can reach this table directly, bypassing the app''s Zod validation — so "email is a plausible address" must be enforced here, not only in lib/validation/. The regex is deliberately permissive (RFC-strict validation belongs to the app layer / actual send attempt); this only rejects obvious junk (missing @, missing domain dot, embedded whitespace) and caps length to match common email column limits.';

-- Case-insensitive uniqueness: 'A@x.com' and 'a@x.com' must not both subscribe.
create unique index newsletter_emails_email_lower_uidx
  on newsletter_emails (lower(email));

alter table newsletter_emails enable row level security;

-- Public subscribe: anyone (logged in or not) can submit the footer form.
-- `with check (true)` is safe here precisely because there is no SELECT policy
-- granting anon/authenticated read access — an inserter can't read back their
-- own row (or anyone else's) through PostgREST.
create policy "newsletter_emails_insert_public" on newsletter_emails
  for insert
  to anon, authenticated
  with check (true);

-- Staff-only read/update/delete. No client (anon or authenticated) may ever
-- read, edit, or remove a subscription — this mirrors the money-table posture
-- (no client write beyond the narrow public insert above) plus a staff-only
-- read, per CLAUDE.md "Staff access via is_staff(uuid)".
create policy "newsletter_emails_select_staff" on newsletter_emails
  for select
  using (is_staff(auth.uid()));

create policy "newsletter_emails_update_staff" on newsletter_emails
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create policy "newsletter_emails_delete_staff" on newsletter_emails
  for delete
  using (is_staff(auth.uid()));

create trigger set_newsletter_emails_updated_at
  before update on newsletter_emails
  for each row execute function public.set_updated_at();
