-- =============================================================================
-- Stage 0.9 — Notifications infrastructure: transactional email queue
-- =============================================================================
-- Builds the Resend-backed queue/retry pipeline for Mindsetis' OWN transactional
-- emails (future reminders/notifications, §6). This does NOT touch Supabase's
-- built-in auth mailer (verification / password reset) — those stay exactly as
-- they are (spec decision for Stage 0.9).
--
-- Pipeline shape (see 20260701110100_email_queue_cron.sql for the scheduler
-- half, and supabase/functions/process-email-queue for the sender half):
--
--   caller (Server Action / future feature code, via lib/supabase/service.ts)
--     -> INSERT into email_messages (status='pending')
--   pg_cron (every 1 min)
--     -> pg_net POST to the process-email-queue Edge Function
--   Edge Function (service role)
--     -> claims a batch of due rows, calls Resend, updates status/attempts,
--        appends an email_events row per transition.
--
-- Security posture (CLAUDE.md "Money is server-only" + spec §4): this queue
-- carries recipient PII and outbound send authority, so it is treated with the
-- SAME posture as `transactions`/`payouts` — RLS enabled, a staff-only SELECT
-- policy, and DELIBERATELY NO client INSERT/UPDATE/DELETE policy at all.
-- Only the service role (which bypasses RLS entirely) may write these tables:
-- the Next.js server (lib/supabase/service.ts, future email-sending lib) when
-- it enqueues a message, and the process-email-queue Edge Function when it
-- claims/updates/logs. No client (anon or authenticated) can ever read another
-- user's email content or forge/tamper with the queue.
-- =============================================================================

-- pg_net: lets Postgres (pg_cron jobs, in this case) issue outbound HTTP calls
-- to invoke the process-email-queue Edge Function. Needed starting this stage;
-- vector/pg_cron were already enabled in 20260701090000_enable_extensions.sql.
create extension if not exists pg_net;

-- -----------------------------------------------------------------------------
-- email_messages — the queue + current-state table (one row per email)
-- -----------------------------------------------------------------------------
create table email_messages (
  id                   uuid primary key default gen_random_uuid(),
  to_email             text not null,
  to_name              text,
  -- Identifies which template rendered this email (e.g. 'verification',
  -- 'password_reset', 'generic', future 'session_reminder_24h', ...). Not a
  -- foreign key yet — templates are admin-manageable content (spec §5.14),
  -- modeled elsewhere; this column exists so the queue/log stays filterable
  -- and future admin tooling can report send volume per template.
  template_key         text not null,
  locale               text not null default 'en',
  -- Fully rendered content: the Edge Function is a dumb sender, never a
  -- template engine. Whatever lib/email/ (or future feature code) renders is
  -- exactly what gets queued and exactly what gets sent.
  subject              text not null,
  html_body            text not null,
  text_body            text,
  status               text not null default 'pending'
                       check (status in ('pending', 'sending', 'sent', 'failed', 'canceled')),
  attempts             int not null default 0,
  max_attempts         int not null default 5,
  next_attempt_at      timestamptz not null default now(),
  last_error           text,
  provider_message_id  text,
  -- Optional idempotency key (e.g. 'session_reminder_24h:<session_id>') so a
  -- caller can safely re-enqueue without risking a duplicate send; enforced by
  -- the partial unique index below (NULL dedup_key never collides).
  dedup_key            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table email_messages is
  'Transactional email queue for Mindsetis'' OWN emails (Resend-backed, spec §6). Supabase''s built-in auth mailer (verification/password reset) is untouched by this table. SERVICE-ROLE-WRITE-ONLY: no client INSERT/UPDATE/DELETE policy exists (same posture as transactions/payouts) — only lib/supabase/service.ts callers and the process-email-queue Edge Function ever write rows. Staff may SELECT for observability.';

comment on column email_messages.dedup_key is
  'Optional caller-supplied idempotency key. NULL is allowed and never collides (partial unique index below only enforces uniqueness when non-null), so most one-off emails can simply omit it.';

-- Partial unique index: only enforce uniqueness when a caller opted into
-- dedup by supplying a key; rows with dedup_key IS NULL never collide.
create unique index email_messages_dedup_key_uidx
  on email_messages (dedup_key)
  where dedup_key is not null;

-- Drives the Edge Function's drain query: `status = 'pending' AND
-- next_attempt_at <= now() AND attempts < max_attempts`.
create index email_messages_drain_idx
  on email_messages (status, next_attempt_at);

alter table email_messages enable row level security;

-- Staff-only read (observability, spec §7). No owner concept here — these are
-- system-originated emails, not user-authored content.
create policy "email_messages_read_staff" on email_messages
  for select
  using (is_staff(auth.uid()));

-- Intentionally NO INSERT/UPDATE/DELETE policy on email_messages: enqueueing,
-- claiming, status transitions and retry bookkeeping are exclusively
-- service-role operations (lib/supabase/service.ts server code and the
-- process-email-queue Edge Function, both of which use the service-role key
-- and therefore bypass RLS). This mirrors the `sessions`/`transactions`/
-- `payouts` posture in CLAUDE.md — never grant client write access here.

create trigger set_email_messages_updated_at
  before update on email_messages
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- claim_due_email_messages(p_limit) — atomic batch-claim RPC for the drain
-- -----------------------------------------------------------------------------
-- The drain predicate is `status = 'pending' AND next_attempt_at <= now() AND
-- attempts < max_attempts` — the last clause compares two COLUMNS, which
-- PostgREST's query-string filters cannot express (its filters only compare a
-- column to a literal value/param, never to another column). A SQL function
-- is the correct way to express this and to make the "claim" atomic: `FOR
-- UPDATE SKIP LOCKED` lets two overlapping process-email-queue invocations
-- (e.g. a slow run overlapping the next minute's cron tick) safely run
-- concurrently — each only ever claims rows the other hasn't already locked,
-- so no message is ever claimed/sent twice. The `RETURNING *` combined with
-- `status = 'pending'` in the same statement is the atomic "claim": a row is
-- flipped to 'sending' and handed to the caller in one indivisible operation.
create or replace function public.claim_due_email_messages(p_limit int default 20)
returns setof email_messages
language sql
security definer
set search_path = public
as $$
  update email_messages
  set status = 'sending'
  where id in (
    select id
    from email_messages
    where status = 'pending'
      and next_attempt_at <= now()
      and attempts < max_attempts
    order by next_attempt_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

comment on function public.claim_due_email_messages(int) is
  'Atomically claims up to p_limit due, pending, not-yet-exhausted email_messages rows (status -> ''sending'') and returns them, for the process-email-queue Edge Function to send via Resend. FOR UPDATE SKIP LOCKED makes concurrent invocations safe (never double-claims a row). security definer since the calling role (the Edge Function''s service-role PostgREST session) must be able to both read AND write email_messages here regardless of RLS/grants; EXECUTE is revoked from anon/authenticated below (service_role keeps it, which is how the Edge Function invokes this over PostgREST RPC) — never meant to be reachable by an ordinary client, since it exposes full email content (subject/html_body) and performs a write.';

-- Same lesson as 20260701100600_lockdown_expire_unverified_fn.sql, plus one
-- more layer: a newly CREATEd function also grants EXECUTE to the PUBLIC
-- pseudo-role by ordinary Postgres default (separate from Supabase's own
-- default-privileges template that explicitly grants anon/authenticated/
-- service_role) — and every role implicitly holds whatever PUBLIC holds, so
-- anon/authenticated would still be able to call this via PostgREST even
-- after revoking only their own direct grants. All three (public, anon,
-- authenticated) must therefore be named explicitly to actually close the
-- hole. service_role is intentionally left alone — it is exactly how the
-- process-email-queue Edge Function calls this RPC (via
-- `${SUPABASE_URL}/rest/v1/rpc/claim_due_email_messages` with the
-- service-role key).
revoke execute on function public.claim_due_email_messages(int)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- email_events — append-only observability log (spec §7) for each message
-- -----------------------------------------------------------------------------
create table email_events (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references email_messages(id) on delete cascade,
  -- e.g. 'queued', 'claimed', 'sent', 'failed', 'retry_scheduled'.
  event      text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

comment on table email_events is
  'Append-only send/retry event log per email_messages row (spec §7 observability). SERVICE-ROLE-WRITE-ONLY, same posture as email_messages: no client INSERT/UPDATE/DELETE policy. Deliberately has no updated_at/trigger — rows are immutable log entries, never updated after insert, so a "touch updated_at on update" trigger would never fire and would only add noise; this is an intentional, narrow deviation from the CLAUDE.md standard-columns convention for this one append-only audit-log table.';

create index email_events_message_id_idx on email_events (message_id);

alter table email_events enable row level security;

create policy "email_events_read_staff" on email_events
  for select
  using (is_staff(auth.uid()));

-- Intentionally NO INSERT/UPDATE/DELETE policy: only the process-email-queue
-- Edge Function (service role) ever appends rows. Same rationale as
-- email_messages above.
