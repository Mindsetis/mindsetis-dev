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

- **Site URL:** `http://localhost:3000` (dev) / your staging URL.
- **Redirect URLs:** add `http://localhost:3000/**` (and the staging equivalent).

### Google OAuth (via Supabase)

Google sign-in is handled by **Supabase Auth** — you do **not** put Google creds in the
app `.env`. When you enable it:

1. **Dashboard → Authentication → Providers → Google** → toggle **Enabled**.
2. Paste the **Client ID / Client Secret** from Google Cloud Console **into that Supabase
   form** (they live in Supabase, not in the app).
3. In Google Cloud Console, add Supabase's callback URL
   (`https://<ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.

The app just calls `signInWithOAuth({ provider: 'google' })` — no app-side secret needed.
Until then the provider stays disabled (`enable = false` in `supabase/config.toml`).

---

## 4. Local stack (optional — needs Docker)

To develop fully offline against a local Supabase (config in `supabase/config.toml`):

```bash
npm run db:start     # Postgres :54322 · API :54321 · Studio :54323 · Mail :54324
npm run db:reset     # apply all migrations to the local DB
npm run db:stop
```

Local anon/service keys are printed by `supabase start` — use those in a local `.env.local`
if you point the app at the local stack.

---

## 5. Environments

| Env         | Supabase project      | Notes                                        |
| ----------- | --------------------- | -------------------------------------------- |
| **dev**     | project #1            | your day-to-day work                         |
| **staging** | project #2 (separate) | mirrors prod; deploy previews later          |
| **prod**    | project #3 (later)    | created at launch; Vercel wiring is deferred |

Keep each project's keys in that environment's own secret store — never share a service
role key across environments, never commit any of them.
