# Supabase setup — connection, keys & migrations

Everything you need to connect the app to your **already-created** Supabase project and
apply the Stage 0.2 infrastructure. Do this once per environment (**dev** and **staging**
should be _separate_ Supabase projects; `main`/prod is a third one later).

---

## 1. Where to get each key

Open your project at **https://supabase.com/dashboard** → pick the project.

### A. API keys → `.env.local`

**Dashboard → Project Settings → API**

| Dashboard field                           | Env variable                    | Exposed to browser?             |
| ----------------------------------------- | ------------------------------- | ------------------------------- |
| Project URL (`https://<ref>.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL`      | ✅ yes                          |
| Project API keys → **anon / public**      | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ yes (safe — RLS guards data) |
| Project API keys → **service_role**       | `SUPABASE_SERVICE_ROLE_KEY`     | ❌ **NEVER** — server-only      |

> The **service_role** key bypasses RLS. It is used only by `lib/supabase/service.ts`
> (Server Actions / Edge Functions) for money writes & admin tasks. If it ever appears in
> a client bundle, rotate it immediately (Settings → API → _Reset_).

### B. CLI / migration credentials → `.env.local`

**Dashboard → Project Settings → General** → copy **Reference ID**:

```
SUPABASE_PROJECT_REF="<your-ref>"
```

**Dashboard → Project Settings → Database** → **Database password** (the one you set when
creating the project; reset it there if unknown):

```
SUPABASE_DB_PASSWORD="<db-password>"
```

### C. Fill in `.env.local`

```bash
cp .env.example .env.local
# then paste the 5 Supabase values above
```

Only the **Supabase** block is required now. Stripe / Resend / OpenAI / Redis stay blank
until their stages.

---

## 2. Enable extensions & apply migrations

The repo ships two infra migrations in `supabase/migrations/`:

- `…_enable_extensions.sql` — enables **pgvector** (AI search, §3.7) and **pg_cron**
  (scheduler for reminders / 48h hold release / re-indexing, §2.3).
- `…_storage_buckets.sql` — creates private **`avatars`** and **`covers`** Storage buckets
  (signed-URL access) + owner-scoped RLS policies.

Apply them to your hosted project. `npm run db:push` runs a **guarded** script
(`scripts/db-push.mjs`) that links to `SUPABASE_PROJECT_REF` and pushes **only** pending
forward migrations to **that** project — it aborts if the CLI is linked to a different
ref, and never resets/drops.

```bash
# Option A — no browser: set a Personal Access Token (Account → Access Tokens)
#            as SUPABASE_ACCESS_TOKEN in .env.local, then just:
npm run db:push

# Option B — interactive login instead of a token:
npx supabase login
npm run db:push
```

> If `pg_cron` fails to create via migration on your plan, enable it once in
> **Dashboard → Database → Extensions** (search `pg_cron`, toggle on), then re-run
> `npm run db:push`. `pgvector` (`vector`) can be toggled there the same way.

Verify in **Dashboard → Database → Extensions** that `vector` and `pg_cron` are **enabled**,
and in **Dashboard → Storage** that the `avatars` and `covers` buckets exist.

---

## 3. Auth configuration (in the dashboard)

At this stage auth is **email + password with email confirmation** (Stage 0.6).

**Dashboard → Authentication → Providers → Email**: enable, keep **Confirm email** ON.

**Dashboard → Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (dev) / your staging URL. Must match
  `NEXT_PUBLIC_SITE_URL` in `.env.local` — the app builds email-redirect links from it.
- **Redirect URLs:** add `http://localhost:3000/**` (and the staging equivalent).

### Email confirmation & password-reset links

The app handles both email links at **`/api/auth/confirm`** (a Route Handler, outside the
i18n middleware). It accepts either Supabase link style:

- `?token_hash=…&type=…` → `verifyOtp` — **recommended**, and
- `?code=…` → `exchangeCodeForSession` (PKCE / default `ConfirmationURL`) — also supported,

so the **default email templates work out of the box**. For the cleaner token-hash flow,
edit **Dashboard → Authentication → Email Templates** and point the link at:

```
{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/
```

(and `type=recovery&next=/reset-password` for the "Reset Password" template). On success the
handler redirects into the localized app; on an invalid/expired link it redirects to
`/{locale}/login?error=invalid_link`.

### 3a. Auth emails (built-in Supabase) + Custom SMTP

**All auth emails (confirm signup, reset password, change email, magic link, invite) are
sent by Supabase Auth's own built-in mailer using the standard Supabase email templates —
never by the `lib/email/` Resend-queue pipeline.** That pipeline (§5 below) is a separate,
Mindsetis-originated system for booking/verification/reminder notifications; it never
touches auth flows. Do not build custom Resend templates for sign-up confirmation, password
reset, etc. — customize copy only via **Dashboard → Authentication → Emails → Templates**
for the hosted project, not via `lib/email/`.

**The problem:** Supabase's default shared email sender enforces a strict rate limit and
returns `over_email_send_rate_limit` (HTTP 429) once you exceed a few emails per hour — too
low for real sign-up/password-reset traffic. **The fix:** point Supabase Auth at your own
SMTP relay (Resend) so it keeps sending its own standard templates, just through a transport
with your account's higher limits.

**Dashboard → Authentication → Emails → SMTP Settings** (hosted project — this is the
only place custom SMTP is configured; this project has no local Supabase stack, so
`supabase/config.toml`'s `[auth.email.smtp]` block is not used):

1. Toggle **Enable Custom SMTP**.
2. **Sender email** — an address on your **verified** Resend domain (Resend → Domains must
   show the domain as verified before Supabase can send through it), e.g.
   `no-reply@yourdomain.com`.
3. **Sender name** — `Mindsetis` (or `Mindsetis Community`).
4. **Host** — `smtp.resend.com`.
5. **Port** — `465` (implicit TLS) or `587` (STARTTLS) — either works with Resend.
6. **Username** — the literal string `resend` (not your Resend account email).
7. **Password** — your Resend API key (`re_...`) — the same value as `RESEND_API_KEY`, or a
   separate key scoped only to SMTP if you want to rotate/limit it independently.
8. Save. Send a test email from the same screen to confirm delivery before relying on it.

**Confirm email is ON:** **Dashboard → Authentication → Providers → Email** → **Confirm
email** must stay enabled (this is already the default per §3 above) — this is what makes
Supabase send the "Confirm signup" template on `auth.signUp()`.

**Standard templates in play** (edit subject/body for the hosted project in
**Dashboard → Authentication → Emails → Templates** — the `[auth.email.template.*]` block
in `supabase/config.toml` is not read, since this project has no local Supabase stack):

| Template                 | Triggered by                            | App entry point                                                 |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------- |
| **Confirm signup**       | `supabase.auth.signUp()`                | `signUp` action, `app/[locale]/(auth)/actions.ts`               |
| **Reset password**       | `supabase.auth.resetPasswordForEmail()` | `requestPasswordReset` action, same file                        |
| **Change email address** | `supabase.auth.updateUser({ email })`   | not yet built in-app — no UI/action calls this today            |
| **Magic link**           | `supabase.auth.signInWithOtp()`         | not used — the app is email+password only, no passwordless flow |

For each template, make sure the confirmation link matches the token-hash style this app's
`/api/auth/confirm` route handler expects (see the snippet in §3 above) — e.g. for **Change
Email Address**: `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/`.

There is no local Inbucket/mail-testing inbox in this project — auth emails are always sent
(and tested) through the hosted project, either via Supabase's built-in shared sender or, once
configured, the custom SMTP relay above. Test by triggering the real flow (sign up / request a
password reset) against your hosted **dev** project and checking the inbox of a real address
you control.

**Env vars** — see `.env.example` (`SUPABASE_AUTH_SMTP_PASS`, `SUPABASE_AUTH_SMTP_SENDER_EMAIL`).
These are not read by the app at runtime — they exist only as a reminder of which values to
paste into the hosted project's **SMTP Settings** form in the Dashboard (Supabase does not read
your `.env.local` for hosted project settings).

### Google OAuth (via Supabase)

Google sign-in is handled by **Supabase Auth** — you do **not** put Google creds in the
app `.env`. When you enable it:

1. **Dashboard → Authentication → Providers → Google** → toggle **Enabled**.
2. Paste the **Client ID / Client Secret** from Google Cloud Console **into that Supabase
   form** (they live in Supabase, not in the app).
3. In Google Cloud Console, add Supabase's callback URL
   (`https://<ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.

The app just calls `signInWithOAuth({ provider: 'google' })` — no app-side secret needed.
Until then the provider stays disabled in **Dashboard → Authentication → Providers → Google**.

---

## 4. Hosted Supabase only — no local stack

This project works **exclusively against the hosted (cloud) Supabase project** — dev,
staging, and prod are each a separate hosted project (§6 below). There is **no local
Supabase stack**: do not run `supabase start`/`stop`/`db reset`, do not rely on Docker, and
there is no local Postgres/Studio/Inbucket to develop or test against.

- Migrations are applied to the hosted project only, via the guarded `npm run db:push`
  (§2 above) — never `supabase db reset`.
- Typed DB bindings are generated against the linked hosted project:
  `npm run db:types` (`supabase gen types typescript --linked`).
- `supabase/config.toml` still ships in the repo (the Supabase CLI requires a config file
  to run commands like `db push`/`db diff`/`gen types`), but its local-runtime sections
  (`[api]`, `[db]`, `[local_smtp]`, `[auth.email.smtp]` local override, etc.) describe a
  local stack this project never boots — ignore them when reasoning about actual behavior;
  the Dashboard is authoritative for the hosted project's real settings.

---

## 5. Email queue Edge Function (stage 0.9)

`supabase/functions/process-email-queue` is the first Edge Function, draining the
`email_messages` queue (`supabase/migrations/20260701110000_email_queue.sql`) through Resend.
It is triggered every minute by the `process-email-queue` pg_cron job via pg_net
(`supabase/migrations/20260701110100_email_queue_cron.sql`), and ships **inert until an
operator finishes setup** — same "off until configured" posture as Upstash rate-limiting.

**Edge Function secrets** (separate from `.env.local` — the Next.js app never reads these):

```bash
supabase secrets set \
  RESEND_API_KEY="..." \
  RESEND_FROM_EMAIL="Mindsetis <no-reply@example.com>" \
  QUEUE_TRIGGER_SECRET="$(openssl rand -hex 32)"
```

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into every Edge Function by
the platform — do not set those explicitly.)

**Deploy** (`--no-verify-jwt` since the function authenticates callers itself via
`x-queue-secret`, not a Supabase Auth JWT — pg_cron/pg_net has no end-user session):

```bash
supabase functions deploy process-email-queue --no-verify-jwt
```

**Point the cron job at the deployed function** — run once via the Studio SQL editor (or any
service-role connection; `email_queue_settings` has no client-reachable policies on purpose):

```sql
insert into email_queue_settings (key, value) values
  ('edge_function_url', 'https://<project-ref>.functions.supabase.co/process-email-queue'),
  ('trigger_secret', '<same value as QUEUE_TRIGGER_SECRET above>')
on conflict (key) do update set value = excluded.value;
```

Until that insert happens, `trigger_email_queue_processing()` no-ops every minute (no error) —
see the long comment at the top of `20260701110100_email_queue_cron.sql` for the full
rationale.

---

## 6. Environments

| Env         | Supabase project      | Notes                                        |
| ----------- | --------------------- | -------------------------------------------- |
| **dev**     | project #1            | your day-to-day work                         |
| **staging** | project #2 (separate) | mirrors prod; deploy previews later          |
| **prod**    | project #3 (later)    | created at launch; Vercel wiring is deferred |

Keep each project's keys in that environment's own secret store — never share a service
role key across environments, never commit any of them.
