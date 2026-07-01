// =============================================================================
// process-email-queue — Mindsetis' first Supabase Edge Function (Deno)
// =============================================================================
// Stage 0.9 (notifications infrastructure). Drains `email_messages`
// (supabase/migrations/20260701110000_email_queue.sql) by sending due,
// already-rendered emails through Resend. Triggered every minute by the
// `process-email-queue` pg_cron job via pg_net
// (supabase/migrations/20260701110100_email_queue_cron.sql), but can also be
// invoked manually (e.g. `supabase functions invoke process-email-queue`) for
// local testing as long as the shared-secret header is supplied.
//
// This function does NOT render templates or know about i18n/locale content —
// it only ever sends the subject/html_body/text_body already stored on the
// row. Template rendering is owned by the Next.js app (lib/email/, built by
// another agent), which enqueues fully-rendered rows.
//
// Security:
//   - Requires the `x-queue-secret` header to match QUEUE_TRIGGER_SECRET
//     (an Edge Function secret, set via `supabase secrets set
//     QUEUE_TRIGGER_SECRET=...`, distinct from Next.js env). Any other caller
//     gets 401. This is what stops an arbitrary internet request from
//     draining the queue / burning Resend send volume.
//   - Talks to Postgres using the SERVICE ROLE key (auto-injected by the
//     platform as SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars on every
//     Edge Function) so it can bypass RLS on email_messages/email_events,
//     which intentionally have no client write policies.
//
// Resilience:
//   - Graceful no-op (200, not an error) if RESEND_API_KEY / RESEND_FROM_EMAIL
//     are not yet configured, mirroring the "inert until configured" posture
//     used for Upstash rate-limiting and this same queue's pg_cron trigger.
//   - Claims the whole batch atomically via the `claim_due_email_messages`
//     Postgres RPC (see supabase/migrations/20260701110000_email_queue.sql):
//     `attempts < max_attempts` compares two COLUMNS, which PostgREST's
//     query-string filters cannot express (they only compare a column to a
//     literal), so the claim + drain predicate lives in SQL, using
//     `FOR UPDATE SKIP LOCKED` so two overlapping invocations can never
//     claim/double-send the same message.
//   - Per-message try/catch: one bad row (bad payload, Resend outage, etc.)
//     is logged and retried/failed on its own; it never aborts the batch.
//   - Every PATCH/POST this function issues to email_messages/email_events is
//     response-checked (`logIfNotOk`): a failed status write is logged
//     (message id + HTTP status + truncated response body — never request
//     bodies/email content/secrets) instead of silently leaving a row stuck
//     at status='sending'. The other half of that recovery — reclaiming rows
//     that stayed stuck anyway (e.g. the Edge Function crashed before this
//     code even ran) — lives in `claim_due_email_messages`
//     (20260701110200_email_queue_stale_reclaim.sql), which also claims
//     status='sending' rows stale by more than 10 minutes.
//   - Every Resend send carries an `Idempotency-Key` derived from the
//     message's stable `id` (see sendViaResend), so re-sending the same row
//     — whether via normal retry or the stale-reclaim path above — can never
//     result in Resend actually delivering a duplicate email.
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const QUEUE_TRIGGER_SECRET = Deno.env.get('QUEUE_TRIGGER_SECRET');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL');

const BATCH_SIZE = 20;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

interface EmailMessageRow {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  html_body: string;
  text_body: string | null;
  attempts: number;
  max_attempts: number;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Minimal typed wrapper around PostgREST (service role) — no supabase-js
 * dependency needed for the handful of calls this function makes, keeping
 * the Edge Function's cold start small and its data access explicit. */
async function postgrest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY!);
  headers.set('authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set('content-type', 'application/json');
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
}

/** Atomically claims up to BATCH_SIZE due, pending, not-yet-exhausted
 * messages via the `claim_due_email_messages` SQL function (see
 * 20260701110000_email_queue.sql) and flips them to 'sending' server-side in
 * one statement (`FOR UPDATE SKIP LOCKED`) — this is what prevents two
 * overlapping invocations from double-sending the same message, and is the
 * only correct way to express the `attempts < max_attempts` column-to-column
 * comparison (PostgREST's own query filters cannot express that). */
async function claimDueMessages(): Promise<EmailMessageRow[]> {
  const res = await postgrest('rpc/claim_due_email_messages', {
    method: 'POST',
    body: JSON.stringify({ p_limit: BATCH_SIZE }),
  });
  if (!res.ok) {
    throw new Error(`claim_due_email_messages failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as EmailMessageRow[];
}

/** Best-effort response check shared by every write to email_messages/
 * email_events: logs the message id, HTTP status, and a truncated response
 * body (our OWN PostgREST error text — never request bodies/email content/
 * secrets) so a failed status write is observable instead of silently
 * leaving a row stuck (the exact bug this rework fixes). Never throws —
 * callers must not let a failed *status write* crash the batch on top of
 * whatever already happened with the send itself. */
async function logIfNotOk(res: Response, context: string): Promise<void> {
  if (res.ok) return;
  const bodySnippet = await res.text().catch(() => '');
  console.error(`${context} failed: ${res.status} ${bodySnippet.slice(0, 200)}`);
}

async function logEvent(
  messageId: string,
  event: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    const res = await postgrest('email_events', {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, event, detail }),
    });
    await logIfNotOk(res, `email_events insert for ${messageId}/${event}`);
  } catch (err) {
    // Observability is best-effort: never let a logging failure affect the
    // send/retry outcome for the message itself.
    console.error(`logEvent failed for ${messageId}/${event}:`, err);
  }
}

async function markSent(id: string, providerMessageId: string | null): Promise<void> {
  // The Resend send already succeeded by the time this runs — if THIS write
  // fails, the row is left at status='sending' with no other signal that
  // anything went wrong (claim_due_email_messages only drains 'pending', so
  // it would otherwise sit stuck forever). Checking the response is what
  // makes that failure observable; the stale-reclaim clause added to
  // claim_due_email_messages in 20260701110200 is what actually recovers the
  // row on a later drain (made safe to resend by the Resend
  // Idempotency-Key — see sendViaResend).
  const res = await postgrest(`email_messages?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'sent',
      provider_message_id: providerMessageId,
      last_error: null,
    }),
  });
  await logIfNotOk(res, `markSent PATCH for email_messages.id=${id}`);
  await logEvent(id, 'sent', { provider_message_id: providerMessageId });
}

/** Exponential backoff: 1min * 2^attempts (attempts already incremented),
 * e.g. 2min, 4min, 8min, 16min for attempts 1..4 before max_attempts=5 hits
 * 'failed'. */
function nextAttemptDelayMs(attempts: number): number {
  return 60_000 * Math.pow(2, attempts);
}

async function markRetryOrFailed(row: EmailMessageRow, errorMessage: string): Promise<void> {
  const attempts = row.attempts + 1;
  if (attempts >= row.max_attempts) {
    const res = await postgrest(`email_messages?id=eq.${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'failed',
        attempts,
        last_error: errorMessage,
      }),
    });
    await logIfNotOk(res, `markRetryOrFailed(failed) PATCH for email_messages.id=${row.id}`);
    await logEvent(row.id, 'failed', { attempts, error: errorMessage });
    return;
  }

  const nextAttemptAt = new Date(Date.now() + nextAttemptDelayMs(attempts)).toISOString();
  const res = await postgrest(`email_messages?id=eq.${row.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'pending',
      attempts,
      next_attempt_at: nextAttemptAt,
      last_error: errorMessage,
    }),
  });
  await logIfNotOk(res, `markRetryOrFailed(retry) PATCH for email_messages.id=${row.id}`);
  await logEvent(row.id, 'retry_scheduled', {
    attempts,
    next_attempt_at: nextAttemptAt,
    error: errorMessage,
  });
}

async function sendViaResend(row: EmailMessageRow): Promise<string | null> {
  const to = row.to_name ? `${row.to_name} <${row.to_email}>` : row.to_email;
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
      // Stable per email_messages row across EVERY retry of the SAME
      // message (deliberately NOT including `attempts`, which would defeat
      // idempotency across retries). If Resend already accepted+sent this
      // message on a prior attempt but we never saw the response (network
      // blip, timeout, or a stale row reclaimed by
      // 20260701110200_email_queue_stale_reclaim.sql), Resend recognizes the
      // duplicate key and returns the original send's result instead of
      // sending the email a second time.
      'idempotency-key': row.id,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: row.subject,
      html: row.html_body,
      text: row.text_body ?? undefined,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return (payload as { id?: string }).id ?? null;
}

async function processOne(row: EmailMessageRow): Promise<void> {
  try {
    const providerMessageId = await sendViaResend(row);
    await markSent(row.id, providerMessageId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`send failed for email_messages.id=${row.id}:`, message);
    await markRetryOrFailed(row, message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  // Shared-secret guard: only pg_cron (via pg_net, configured with this
  // header in trigger_email_queue_processing()) or an operator manually
  // testing with the same secret may invoke this function.
  if (!QUEUE_TRIGGER_SECRET || req.headers.get('x-queue-secret') !== QUEUE_TRIGGER_SECRET) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('process-email-queue: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse({ ok: false, note: 'supabase_env_not_configured' }, 200);
  }

  // Graceful no-op until Resend is configured (mirrors the "inert until
  // configured" posture used elsewhere, e.g. Upstash rate-limiting) — do NOT
  // throw just because an operator hasn't finished setup yet.
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.log('process-email-queue: RESEND_API_KEY/RESEND_FROM_EMAIL not set — no-op');
    return jsonResponse({ ok: true, note: 'resend_not_configured', processed: 0 }, 200);
  }

  let claimed: EmailMessageRow[];
  try {
    claimed = await claimDueMessages();
  } catch (err) {
    console.error('process-email-queue: failed to claim due messages:', err);
    return jsonResponse({ ok: false, error: 'claim_failed' }, 500);
  }

  let processed = 0;
  for (const row of claimed) {
    try {
      await processOne(row);
    } catch (err) {
      // Defense in depth: processOne already catches send/retry errors
      // internally, but never let one row's unexpected failure abort the
      // rest of the batch.
      console.error(`process-email-queue: unexpected error for id=${row.id}:`, err);
    }
    processed += 1;
  }

  return jsonResponse({ ok: true, processed });
});
