# Mindsetis Community — Project Rules

> Source of truth: `docs/mindsetis-mvp-tz.md` (Technical Spec v1.0). When the spec and
> this file disagree, the spec wins — but keep this file updated to match.

## Overview

Mindsetis Community is a member-first community platform: a catalog of users
(**Members** / **Mindsetters**), free & paid 1:1 sessions, group formats (events), light
verification, AI semantic search, and a full admin back-office. Payments & payouts run
through Stripe Connect.

**Roles**
- **Member** — base user after signup. A **Verified Member** may book sessions, create
  events, and send Invites.
- **Mindsetter** — extended profile, opens own 1:1 sessions, public page (after verification).
- **Admin / Moderator** — Mindsetis team (back-office); stored in `staff_roles`, separate
  from `account_type`.

**Out of MVP scope (Phase 2+)** — do NOT build unless asked, but leave neutral extension
points: Communities (business), BUILT NOT BURN, gamification (coins), LinkedIn OAuth,
push notifications, advanced analytics/referrals.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS; shadcn/ui (Radix) + custom UI Kit; dark Masterclass/Netflix theme |
| Forms | React Hook Form + Zod |
| Client state | TanStack Query (only when needed); otherwise RSC + Server Actions |
| i18n | next-intl (`[locale]` segment) + Google Translate widget |
| DB / Auth / Storage | Supabase (Postgres + RLS, Auth email+Google OAuth, Storage signed URLs) |
| Server logic | Server Actions + Route Handlers; Supabase Edge Functions (Deno) for webhooks/cron |
| Scheduler | `pg_cron` (reminders, hold release, re-indexing) |
| Cache / rate-limit | Upstash Redis |
| Email | Resend (transactional + reminders) |
| Payments | Stripe Connect (destination charges, delayed transfers) |
| Video | Google Calendar API → auto Google Meet links |
| Hosting | Vercel (Next.js) + Supabase Cloud |
| AI search | OpenAI embeddings + pgvector cosine search + LLM interpretation |

## Directory conventions

```
app/[locale]/...                 # localized routes (RSC by default)
app/api/...                      # Route Handlers (webhooks that must live in Next)
lib/supabase/browser.ts          # anon client, client components
lib/supabase/server.ts           # anon client, RSC/Server Actions (cookies)
lib/supabase/middleware.ts       # session refresh in middleware
lib/supabase/service.ts          # SERVICE ROLE — server-only, never imported client-side
lib/stripe/                      # Stripe Connect helpers (server-only)
lib/validation/                  # shared Zod schemas
supabase/migrations/             # timestamped SQL migrations
supabase/functions/              # Edge Functions (Stripe webhooks, cron)
messages/en.json                 # i18n source (English-first)
messages/es.json                 # readiness for Spanish
components/ui/                    # shadcn/ui + UI Kit
```

## Architecture rules (MUST)

- **RSC + Server Actions by default.** Reach for TanStack Query / client components only
  when genuine client interactivity/state is required.
- **Zod at every boundary** — forms, Server Actions, Route Handlers, and webhook payloads
  are validated before use.
- **Four separate Supabase clients** (browser / server / middleware / service). The
  service-role client is server-only and must NEVER end up in a client bundle.

## Security rules (MUST — critical)

- **Money is server-only.** `transactions`, `payouts`, hold, and split are written **only**
  by the service role (Edge Functions / Server Actions). Clients have **no** INSERT/UPDATE
  on money tables — enforce via RLS (no client write policy) AND server logic.
- **RLS on every table** (`enable row level security`). Use the `is_staff(auth.uid())` SQL
  helper for staff access. Verification statuses and roles are mutated **only** by staff.
- **Validate Stripe webhook signatures** before trusting any event. Handlers are
  idempotent.
- **Secrets in env only** — never in the client bundle, never committed.

## Session lifecycle (1:1)

`scheduled` → (after meeting time) mutual confirmation → `completed_pending` → `held`
(`hold_until = now() + 48h`) → no complaint / on confirmation → `paid_out`.
A complaint within the 48h window → `disputed` (manual admin review).

> Google Meet does **NOT** confirm completion — only mutual in-app confirmation
> (`confirmed_by_mindsetter` AND `confirmed_by_booker`) does.

## 14-day verification rule

On signup set `verification_deadline = now() + interval '14 days'`. `pg_cron` checks daily;
expired `unverified` users lose the right to book sessions / create events (viewing stays).
Implement as a **permission flag in access checks — never delete data.** Enforce with
`pg_cron` + server-side checks.

## Permission matrix (enforce in RLS + server)

| Action | Member (unverified) | Verified Member | Mindsetter |
|---|---|---|---|
| Browse platform/catalog | ✅ | ✅ | ✅ |
| Public profile | — | — | ✅ |
| Book 1:1 | ❌ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ |
| Send Invite | ❌ | ✅ | ✅ |
| Open own 1:1 sessions | ❌ | ❌ | ✅ |

## i18n

English-first: all UI, texts, and emails go through next-intl dictionaries with `[locale]`
routing, so new languages need no rework. Profile content stays in the author's
`content_locale` (not auto-translated in storage). Google Translate widget is client-side
and styled for the dark theme.

## Togglable modules

Payments and AI-search must be switchable from the admin settings **without a redeploy**.
Gate their entry points on an admin-controlled flag.

## DB table conventions

Every table has: `id uuid primary key default gen_random_uuid()` (except `profiles`, which
is `1:1` with `auth.users`), `created_at timestamptz default now()`,
`updated_at timestamptz default now()`, and `enable row level security`.

## Do / Don't

**Do**
- Keep financial/Stripe logic server-only; verify webhook signatures; make handlers idempotent.
- Add RLS + policies in the same migration that creates a table.
- Add i18n keys to `messages/en.json` (source) for any user-facing string.
- Reuse existing Zod schemas and Supabase client helpers.

**Don't**
- Import `lib/supabase/service.ts` (or any secret) into client components.
- Write to `transactions`/`payouts` from the client or grant client write policies on them.
- Change verification status / staff roles from non-staff paths.
- Build Phase 2+ features (Communities, gamification, etc.) unprompted.

## Progress tracking

`ROADMAP.md` (repo root) is the single source of development progress (stages from spec §8).
Update it via the `todo-jobs` skill/subagent: when the user takes a stage into development
set it `🔄 In progress`, and mark items/stages `✅ Done` when finished. Never delete
completed items.

## Skills & subagents

- Skills: `new-migration`, `scaffold-feature`, `add-i18n-keys`, `stripe-flow`, `todo-jobs`.
- Subagents: `supabase-expert`, `nextjs-frontend`, `security-auditor`, `stripe-payments`,
  `code-reviewer`, `qa`, `todo-jobs`.
- Review loop: after a builder subagent finishes a stage, run `code-reviewer` (correctness/
  conventions) + `security-auditor` (RLS/money/auth) + `qa` (build, migrations, live RLS
  negative tests, secret-leak). They report findings and hand work back for rework; only
  commit after a clean pass.
