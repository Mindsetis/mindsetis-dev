-- =============================================================================
-- Stage 0.9 follow-up — Reclaim stale 'sending' rows in claim_due_email_messages
-- =============================================================================
-- Code-review finding: process-email-queue's markSent/markRetryOrFailed PATCH
-- the row's status via PostgREST but historically never checked the response.
-- If Resend accepts+sends an email but the SUBSEQUENT PATCH to email_messages
-- fails (network blip, PostgREST hiccup, etc.), the row is stuck at
-- status='sending' forever: claim_due_email_messages (20260701110000) only
-- ever claims status='pending' rows, so a 'sending' row is invisible to every
-- future drain — no error is logged anywhere and the message is silently
-- never retried nor marked failed.
--
-- The Edge Function fix (checking every PATCH response and logging failures)
-- makes the failure OBSERVABLE, but observability alone does not un-stick an
-- already-stuck row. This migration adds the other half: the claim predicate
-- now ALSO reclaims rows that have been sitting in 'sending' for longer than
-- a generous processing window (10 minutes — this Edge Function's per-row
-- work, a single Resend POST, completes in low single-digit seconds, so 10
-- minutes stale is unambiguously abandoned, never a row genuinely still being
-- processed) and have not yet exhausted their attempts. Reclaiming re-flips
-- the row back to 'sending' (extending its updated_at via the
-- set_email_messages_updated_at trigger) and hands it to the caller exactly
-- like a fresh pending claim — processOne() will send it again via Resend.
--
-- This is intentionally NOT a data-loss risk: worst case, a message that
-- actually sent successfully but whose status-write failed gets re-sent once
-- more. That is exactly why the OTHER half of this rework (Idempotency-Key on
-- the Resend call, keyed on email_messages.id) exists — Resend will
-- recognize the retried call as a duplicate of the same message id and return
-- the original response instead of sending twice. The two fixes are
-- deliberately complementary: this migration guarantees a stuck row is always
-- eventually retried; the Idempotency-Key guarantees that retry can never
-- cause a duplicate email to actually land in anyone's inbox.
--
-- Signature/return type are unchanged (`claim_due_email_messages(p_limit int
-- default 20) returns setof email_messages`), so `create or replace function`
-- below is a valid, non-breaking replace of the 20260701110000 definition —
-- PostgREST callers (the Edge Function's `rpc/claim_due_email_messages`) need
-- no changes.
-- =============================================================================

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
    where attempts < max_attempts
      and (
        -- Fresh claim: due, still-pending rows (unchanged from 20260701110000).
        (status = 'pending' and next_attempt_at <= now())
        -- Stale reclaim: rows abandoned mid-send (Edge Function crashed,
        -- timed out, or its post-send status PATCH failed) — see the
        -- migration header above for why 10 minutes is a safe, generous
        -- threshold for a single Resend POST.
        or (status = 'sending' and updated_at < now() - interval '10 minutes')
      )
    order by next_attempt_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

comment on function public.claim_due_email_messages(int) is
  'Atomically claims up to p_limit email_messages rows that are either due-and-pending OR stuck in status=''sending'' for >10 minutes (abandoned mid-send; see 20260701110200), as long as attempts < max_attempts, flips them to ''sending'', and returns them for the process-email-queue Edge Function to send via Resend. FOR UPDATE SKIP LOCKED makes concurrent invocations safe (never double-claims a row). security definer since the calling role (the Edge Function''s service-role PostgREST session) must be able to both read AND write email_messages here regardless of RLS/grants; EXECUTE is revoked from anon/authenticated below (service_role keeps it, which is how the Edge Function invokes this over PostgREST RPC) — never meant to be reachable by an ordinary client, since it exposes full email content (subject/html_body) and performs a write.';

-- Same lesson as 20260701100600_lockdown_expire_unverified_fn.sql: CREATE OR
-- REPLACE FUNCTION re-applies the project's ALTER DEFAULT PRIVILEGES template
-- (direct EXECUTE grants to anon/authenticated), so the revoke from
-- 20260701110000 must be re-asserted here too. Idempotent either way (REVOKE
-- of an absent privilege is a documented no-op), so this is safe regardless
-- of whether CREATE OR REPLACE actually re-grants anything.
revoke execute on function public.claim_due_email_messages(int)
  from public, anon, authenticated;
