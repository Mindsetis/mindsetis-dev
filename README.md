# Mindsetis Community

Member-first community platform: catalog of Members / Mindsetters, free & paid 1:1
sessions, group events, light verification, AI semantic search, and an admin back-office.
Payments via Stripe Connect.

> **Spec (source of truth):** [`docs/mindsetis-mvp-tz.md`](docs/mindsetis-mvp-tz.md)
> **Project rules:** [`CLAUDE.md`](CLAUDE.md) · **Progress:** [`ROADMAP.md`](ROADMAP.md)

## Tech stack

Next.js 15 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind + shadcn/ui ·
next-intl · React Hook Form + Zod · Supabase (Postgres + RLS, Auth, Storage, Edge
Functions) · Stripe Connect · pgvector · Upstash Redis · Resend.

## Prerequisites

- **Node.js ≥ 20.9** (repo pins **22** via [`.nvmrc`](.nvmrc) — run `nvm use`)
- **npm 11+**
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** (bundled as a dev dependency — use `npx supabase …`)

> **Hosted Supabase only.** This project runs exclusively against the cloud (hosted)
> Supabase project — there is no local Supabase stack (no `supabase start`/`stop`/
> `db reset`, no Docker, no local Postgres/Studio/Inbucket). Migrations are applied to the
> hosted project via the guarded `npm run db:push`; see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

## Setup

```bash
nvm use                      # Node 22
npm install                  # installs deps + sets up husky pre-commit hooks
cp .env.example .env.local   # then fill in the values (see below)
```

### Environment variables

All variables are documented in [`.env.example`](.env.example). For **Stage 0.1/0.2**
you only need the **Supabase** block to be filled — Stripe / Resend / OpenAI / Redis /
Vercel come in later stages. See **[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)**
for exactly which keys to copy from the Supabase dashboard and where.

> ⚠️ Only `NEXT_PUBLIC_*` variables reach the browser bundle. `SUPABASE_SERVICE_ROLE_KEY`
> and all other secrets are **server-only** — never import them into client components.

## Database & migrations

Migrations live in [`supabase/migrations/`](supabase/migrations/) and are applied **only**
to the hosted Supabase project — there is no local Supabase stack in this project.

```bash
npx supabase login                              # once, with a personal access token
npm run db:push                                 # guarded: links to SUPABASE_PROJECT_REF
                                                 # and pushes pending migrations to it only
```

`npm run db:push` runs [`scripts/db-push.mjs`](scripts/db-push.mjs), which reads
`SUPABASE_PROJECT_REF` from `.env.local`, aborts if the CLI is linked to a _different_
project, and only ever applies pending forward migrations (`supabase db push --linked`) —
never a reset. See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the full setup.

Generate typed DB bindings after schema changes (also hosted, via `--linked`):

```bash
npm run db:types        # supabase gen types typescript --linked > lib/supabase/types.gen.ts
```

## Quality gates

```bash
npm run typecheck       # tsc --noEmit (strict)
npm run lint            # ESLint 9 (flat config)
npm run format          # Prettier write  (format:check to verify)
npm run check           # all of the above
```

A **husky** pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files) and a
full `typecheck` before every commit.

## Branching model

- **`main`** — production. Protected; only updated via reviewed PRs.
- **`develop`** — integration branch for in-flight work (optional but recommended).
- **`feature/<short-name>`**, **`fix/<short-name>`** — branch off `develop` (or `main`),
  open a PR, get review + green checks, then squash-merge.

Every PR must pass `npm run check` (enforced locally by the pre-commit hook; wire the same
in CI later). Do not commit secrets — only `.env.example` is tracked.

## Project layout

See [`CLAUDE.md`](CLAUDE.md#directory-conventions) for the full directory conventions
(`app/[locale]/…`, `lib/supabase/{browser,server,middleware,service}.ts`, `lib/stripe/`,
`lib/validation/`, `supabase/migrations/`, `messages/…`). The app skeleton itself is
**Stage 0.3**.

## Further reading

- [`docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md) — Server Actions, `ActionResult`,
  auth guards, rate limiting (Stage 0.5).
- [`docs/RBAC.md`](docs/RBAC.md) — permission matrix, 14-day verification flag, staff roles,
  `/admin` gate (Stage 0.7).
- [`docs/UI_KIT.md`](docs/UI_KIT.md) — design tokens, component inventory, Form primitives
  (Stage 0.8).

## Roadmap status

Current focus: **Stage 0 — Foundation**. Track progress in [`ROADMAP.md`](ROADMAP.md).
