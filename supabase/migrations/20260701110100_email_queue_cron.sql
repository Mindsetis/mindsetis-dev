-- =============================================================================
-- Stage 0.9 — Notifications infrastructure: pg_cron -> pg_net -> Edge Function
-- =============================================================================
-- Schedules the drain trigger for the email queue created in
-- 20260701110000_email_queue.sql. pg_cron cannot reach the public internet by
-- itself, so it calls pg_net (`net.http_post`, fire-and-forget/async) to POST
-- to the `process-email-queue` Edge Function, which does the actual claiming
-- and Resend sending (supabase/functions/process-email-queue/index.ts).
--
-- This migration is DEFERRED-INFRA-FRIENDLY, matching how CLAUDE.md documents
-- Upstash rate-limiting: the pg_cron job is created now and runs every
-- minute from day one, but `trigger_email_queue_processing()` is a graceful
-- no-op until an operator finishes two one-time setup steps post-deploy:
--
--   1. `supabase functions deploy process-email-queue`
--      `supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=... \
--         QUEUE_TRIGGER_SECRET=...`
--      (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
--      Edge Function by the platform — no need to set those explicitly.)
--   2. Populate this migration's `email_queue_settings` table with the
--      deployed function's URL and the SAME shared secret, e.g. via the
--      Studio SQL editor (which runs as the `postgres` owner role and so is
--      not blocked by this table having no client write policy):
--        insert into email_queue_settings (key, value) values
--          ('edge_function_url',
--           'https://<project-ref>.functions.supabase.co/process-email-queue'),
--          ('trigger_secret', '<same value as QUEUE_TRIGGER_SECRET>')
--        on conflict (key) do update set value = excluded.value;
--
-- Until step 2 is done, `edge_function_url` reads as NULL and
-- trigger_email_queue_processing() returns immediately without calling
-- net.http_post or raising — the cron job ticks harmlessly every minute with
-- nothing to fail. No secret, project ref, or URL is hardcoded anywhere in
-- this migration.
--
-- Why a settings table instead of `current_setting('app.settings.*')` /
-- `alter database ... set ...`: those GUC-based approaches require a
-- superuser session-level ALTER DATABASE outside of what a migration file run
-- via `supabase db push` can reliably perform, and they are awkward to
-- inspect/update later. A small table is queryable, editable via ordinary SQL,
-- and (like every other table here) RLS-gated. Supabase Vault
-- (`vault.create_secret` / `vault.decrypted_secrets`) is a stronger
-- alternative worth adopting later for the secret specifically; this table is
-- an intentionally simple first cut, isolated to this one cron job so it
-- cannot be confused with a future general-purpose admin "feature flags /
-- platform settings" table (spec §5.14 "Togglable modules"), which is a
-- separate concern to be designed in its own stage.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- email_queue_settings — tiny key/value config for THIS cron job only
-- -----------------------------------------------------------------------------
create table email_queue_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  value      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table email_queue_settings is
  'Operator-configured URL + shared secret used by trigger_email_queue_processing() to reach the process-email-queue Edge Function via pg_net. Expected keys: ''edge_function_url'', ''trigger_secret''. Holds a live shared secret, so unlike every other table in this schema it has NO staff SELECT policy either — not even staff should be able to read it over PostgREST/the anon or authenticated roles. Only the service role / the postgres owner (e.g. via the Studio SQL editor, or the security definer trigger_email_queue_processing() function below) can read or write it. Scoped narrowly to this one cron job; NOT a general admin settings/feature-flags table (that is a separate, later concern — spec §5.14).';

alter table email_queue_settings enable row level security;

-- Deliberately NO policies at all (not even a staff SELECT): this table holds
-- a live secret used to authenticate calls into the Edge Function, so no
-- PostgREST-reachable role (anon, authenticated — including staff accounts)
-- gets any access to it. The owning `postgres` role (Studio SQL editor,
-- migrations, the service role) always bypasses RLS regardless of policies,
-- which is sufficient for the one-time operator setup described above and for
-- trigger_email_queue_processing() (security definer, owned by the migration
-- role) to read it internally.

create trigger set_email_queue_settings_updated_at
  before update on email_queue_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- trigger_email_queue_processing() — pg_cron target; fires the Edge Function
-- -----------------------------------------------------------------------------
-- security definer + pinned search_path (mirrors expire_unverified_access()
-- in 20260701100500_rbac.sql) so it can read email_queue_settings regardless
-- of caller and cannot be hijacked via search_path. EXECUTE is revoked from
-- PUBLIC/anon/authenticated below, in the SAME migration that creates it
-- (learned from the 20260701100600 follow-up: Supabase's default-privileges
-- template grants EXECUTE to anon/authenticated at CREATE FUNCTION time, so
-- `revoke ... from public` alone is not enough — anon/authenticated must be
-- named explicitly, and doing it up front avoids ever shipping the gap).
create or replace function public.trigger_email_queue_processing()
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url
  from public.email_queue_settings
  where key = 'edge_function_url';

  -- Not configured yet (pre-deploy / pre-setup): no-op, on purpose. This is
  -- the "graceful until configured" behavior — never raise from a pg_cron
  -- job target, since an unhandled exception here would only spam the
  -- cron.job_run_details error log every minute for a known, expected state.
  if v_url is null or v_url = '' then
    return;
  end if;

  select value into v_secret
  from public.email_queue_settings
  where key = 'trigger_secret';

  -- Fire-and-forget: net.http_post queues the request and returns a request
  -- id immediately (pg_net's background worker performs the actual HTTP call
  -- and records the response asynchronously) — this keeps the cron job fast
  -- and never blocks on the Edge Function's execution time.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-queue-secret', coalesce(v_secret, '')
    ),
    body    := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_email_queue_processing() is
  'pg_cron target (job "process-email-queue"): POSTs (via pg_net, async) to the process-email-queue Edge Function URL configured in email_queue_settings, with the configured shared secret in the x-queue-secret header. No-ops gracefully (returns without calling net.http_post) if edge_function_url is not yet configured, so this job is safe to ship and schedule before the Edge Function is deployed/configured. security definer + pinned search_path so it can read email_queue_settings (which has no policies reachable by anon/authenticated) regardless of caller, mirroring expire_unverified_access(). EXECUTE is revoked from public/anon/authenticated in this same migration — this is a cron-only trigger, never meant to be client-callable via PostgREST RPC.';

revoke execute on function public.trigger_email_queue_processing()
  from public, anon, authenticated;

-- Idempotent (re-)scheduling: drop any existing job with this name before
-- scheduling, so re-running this migration (e.g. `supabase db push` retries)
-- never creates duplicate cron jobs. Mirrors the guard pattern used for
-- 'expire-unverified-access' in 20260701100500_rbac.sql.
select cron.unschedule(jobid) from cron.job where jobname = 'process-email-queue';

-- Every minute — the queue's own next_attempt_at/attempts/max_attempts drive
-- actual send timing and backoff; this cadence just keeps latency low for
-- newly-enqueued and newly-due-for-retry messages.
select cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$ select public.trigger_email_queue_processing(); $$
);
