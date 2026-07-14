# Mindsetis Community — Development Roadmap / TODO

> Single source of progress. Foundation stage, detailed from `docs/mindsetis-mvp-tz.md`
> (§2 architecture, §3 data model, §4 RLS, §6 integrations, §7 non-functional).
> Managed by the `todo-jobs` skill / subagent. **Do not delete completed items** — they
> stay checked as a record.

## Status legend

- Stage `**Status:**` field → `⬜ Not started` | `🔄 In progress` | `✅ Done`
- Item checkboxes:
  - `- [ ]` — todo
  - `- [~]` — in progress
  - `- [x]` — done
- When a stage is taken into development, set `**Status:** 🔄 In progress` + `**Started:** YYYY-MM-DD`.
  When every item is `- [x]`, set `✅ Done` + `**Completed:** YYYY-MM-DD`.

---

## Stage 0 — Foundation / Setup

Base environment, infrastructure, and app skeleton that all feature stages build on.

### 0.1 — Development environment
**Status:** 🔄 In progress
**Started:** 2026-07-01

Repository, branching model, code quality tooling, and dev/staging environments so the
team ships consistently.

- [x] Git repository initialized (`.gitignore` for Next.js / env / node_modules)
- [x] Branching model: `main` (prod) + `develop`/feature branches; PR-based flow _(documented in README)_
- [x] TypeScript **strict** config (per §2.2) _(`tsconfig.json` + typed env in `types/env.d.ts`)_
- [x] ESLint + Prettier (lint/format), consistent import order, editorconfig
- [x] Pre-commit hooks (lint + typecheck) — e.g. husky + lint-staged
- [x] `.env.example` documenting all required env vars (Supabase, Stripe, Resend, OpenAI, Redis, Google)
- [~] Environments: local **dev** + **staging** (separate Supabase project + Vercel preview) vs prod _(Supabase dev/staging strategy documented; Vercel preview deferred by request)_
- [x] README with setup / run / migrate instructions

### 0.2 — Infrastructure
**Status:** 🔄 In progress
**Started:** 2026-07-01

Domain, hosting, database, file storage, and CDN/edge per §2.1/§2.3.

- [ ] Domain registered + DNS configured _(deferred by request — later)_
- [ ] Hosting on **Vercel** (Next.js), project linked, env vars set per environment _(deferred by request — later)_
- [x] **Supabase** project (Postgres + Auth + Storage + Edge Functions + Realtime); pgvector & pg_cron enabled _(migration `…_enable_extensions.sql` + `config.toml`; run `npm run db:push` against your project)_
- [x] File storage: Supabase **Storage** buckets (avatars, covers) with **signed URLs** + access policies _(migration `…_storage_buckets.sql`)_
- [ ] **Cloudflare** in front (DNS/CDN, caching, TLS, WAF/rate protection) _(deferred by request — later)_
- [ ] Upstash **Redis** provisioned (cache / rate-limit) — connection wired for later use _(deferred by request — later)_
- [x] Secrets stored in env per environment; never in client bundle (§7) _(`.env.example`, `.gitignore`, `docs/SUPABASE_SETUP.md`)_

### 0.3 — App skeleton
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Next.js 15 App Router structure, routing, base layout/navigation, error boundaries, 404.

- [x] Next.js 15 App Router project (React 19, TS strict), Tailwind configured _(next 15.5, react 19.2, tailwind v4)_
- [x] Directory layout per `CLAUDE.md` (`app/[locale]/…`, `lib/…`, `components/ui/…`, `supabase/…`, `messages/…`)
- [x] Localized routing shell `app/[locale]/layout.tsx` + middleware _(next-intl + Supabase session refresh composed)_
- [x] Base layout: header/footer, primary navigation, dark Masterclass/Netflix theme shell
- [x] `error.tsx` error boundary + `loading.tsx` states
- [x] `not-found.tsx` (404 skeleton) + generic error page
- [x] Four Supabase client helpers (browser / server / middleware / service) scaffolded _(service.ts `server-only`; no secret leak — QA verified)_

### 0.4 — Data model & DB schema
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Core schema and migrations for users, profiles, sessions, events, with relations (§3).
Use the `new-migration` skill / `supabase-expert` subagent.

> Reviewed by `security-auditor` (3 critical privilege-escalations found & fixed:
> profiles self-verify, events self-publish, event_participants self-confirm) + `code-reviewer`,
> then live RLS negative tests via `qa` — all abuse cases blocked/coerced on the dev DB.
> Permission-matrix RLS gating (verified-member / mindsetter) deferred to **0.7** on purpose.

- [x] `is_staff(uuid)` helper + `set_updated_at()` trigger function
- [x] `profiles` (1:1 with `auth.users`) + `staff_roles` + `mindsetter_profiles` (§3.1)
- [x] `sessions` domain: `session_settings`, `availability_slots`, `sessions` (§3.3)
- [x] `events` domain: `events`, `event_participants` (§3.4)
- [x] Relations / FKs (`on delete cascade` where per spec) + indexes
- [x] RLS enabled on **every** table + baseline policies (§4); money tables service-role write only _(+ column-guard triggers for staff-only mutations)_
- [x] Standard columns everywhere (`id`, `created_at`, `updated_at`) + `updated_at` triggers
- [x] Migrations committed under `supabase/migrations/`, applied to dev + staging _(dev applied + QA-verified; staging project deferred with infra)_

### 0.5 — API layer & conventions
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Server Actions / Route Handlers conventions, validation, and error handling (§2.2, §7).

> Reviewed by `code-reviewer` + `security-auditor` + `qa` (build green, no secret leak,
> service-role client never bundled). Rework applied: single `safeRedirectPath` helper,
> per-account (per-email) rate-limit ceiling, `NEXT_PUBLIC_SITE_URL` fail-fast.
> ⚠️ Rate limiter fails **open** until Upstash env is set — configure Upstash before any
> public deployment of auth (documented go-live gate in `docs/API_CONVENTIONS.md`).

- [x] RSC + **Server Actions** as default; Route Handlers (`app/api/…`) for webhooks _(`createAction` wrapper + `app/api/auth/confirm`)_
- [x] **Zod** validation at every boundary; shared schemas in `lib/validation/`
- [x] Standard result/error shape + typed errors; consistent error handling helper _(`lib/api`: `ActionResult`, `ok`/`err`, `ActionError`)_
- [x] Auth/permission guard pattern for actions (server-side gates) _(`lib/auth/guards.ts`; full matrix in 0.7)_
- [x] Correct Supabase client per context; service role never client-side _(QA + security-auditor verified)_
- [x] Redis rate-limit helper wired for sensitive endpoints _(`lib/rate-limit.ts`; graceful no-op until Upstash)_
- [x] Convention doc / examples for adding a new action (feeds `scaffold-feature`) _(`docs/API_CONVENTIONS.md`)_

### 0.6 — Auth & sessions
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Supabase Auth with **email + password only** at this stage. Email confirmation required.

> Note: **Google OAuth ("Continue with Google") is deferred** — not part of this stage.
> Keep the code structured so the Google provider can be added later without rework.
>
> Reviewed by `code-reviewer` + `security-auditor` + `qa`. QA applied the signup trigger to
> the dev DB and verified live: profile auto-created with `verification_deadline ≈ now()+14d`,
> unique username, and RLS negative tests blocking self-verify / self-promote. One High
> finding fixed (reset-password now signs out so the success flow is reachable).

- [x] Supabase Auth: email + password sign-up / sign-in _(`app/[locale]/(auth)` actions + forms)_
- [x] **Email confirmation** flow (verify link) before full access _(`/api/auth/confirm`: verifyOtp + PKCE)_
- [x] Session handling via `@supabase/ssr` + middleware session refresh
- [x] Password reset flow _(request email → recovery session → set new password → sign out)_
- [x] Protected routes / redirect logic for unauthenticated users _(middleware prefix gating; expands in 0.7)_
- [x] Every user starts as **Member** (`account_type = 'member'`); `verification_deadline = now() + 14 days` _(`handle_new_user` trigger, QA-verified on dev DB)_

### 0.7 — Roles & permissions (RBAC)
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Base permission matrix Member / Verified Member / Mindsetter + access middleware (§3.2).

> Implemented the **strict** permission matrix — only `verification_status = 'verified'`
> (not merely unverified-within-window) may book 1:1 / create events / send Invite;
> open-own-1:1 & public profile require mindsetter **and** verified. Added
> `profiles.access_restricted` flag, enforced staff/service-only via a column-guard
> trigger; SQL helpers `is_verified_member` / `is_mindsetter`; tightened RLS on
> `events` / `session_settings` / `availability_slots` inserts (+ `events` update).
> `pg_cron` daily `expire-unverified-access` sweep flags expired-unverified accounts —
> never deletes. Server layer: `resolvePermissions` resolver +
> `requireVerifiedMember` / `requireMindsetter` / `requireStaff` /
> `getEffectivePermissions` guards, role Zod enums, and an `/admin` staff-gate
> middleware (defense-in-depth). Reviewed by `security-auditor` (clean) +
> `code-reviewer` + `qa` (live RLS negative/positive tests all pass). One QA-caught
> issue fixed: `expire_unverified_access()` EXECUTE explicitly revoked from
> anon/authenticated in follow-up migration `20260701100600` (Supabase
> ALTER DEFAULT PRIVILEGES trap — REVOKE FROM PUBLIC alone was insufficient).

- [x] Permission matrix implemented: browse (all), book 1:1 / create events / send Invite (Verified+), open own 1:1 (Mindsetter)
- [x] Staff roles (`admin` / `moderator`) via `staff_roles`, separate from `account_type`
- [x] Access **middleware** + server-side permission checks (RLS is the base line)
- [x] Verification status & role changes are **staff-only**
- [x] 14-day rule enforced as a **permission flag** (never data deletion), checked server-side
- [x] Helper(s) to resolve current user's effective permissions

### 0.8 — UI Kit / design system
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Design tokens + base components (§5.11), dark Masterclass/Netflix theme.

> Design tokens pulled from the real Figma design source of truth — brand accent is
> **cyan `#79b9e3`** (not the earlier placeholder Netflix-red), surfaces `#1a1a1a` on
> `#000`, Cal Sans (display) + Manrope (body) via `next/font`. Tailwind v4 `@theme`
> token rewrite (color/type/spacing scales; radius scale synthesized — no Figma radius
> tokens found, flagged for a design back-check). shadcn-style UI Kit added in
> `components/ui`: button (primary/secondary/outline/tertiary/ghost/link/nav variants +
> loading state), input, textarea, select, card, badge, avatar, dialog, sonner/toast,
> label, skeleton, alert, React Hook Form primitives, and a sticky mobile CTA pattern.
> Auth forms migrated onto the new Form primitives (presentation-only change; superseded
> `AuthField`/`FormBanner` removed). Reviewed by `code-reviewer` + `qa` (build green, 16
> routes prerender, secret-leak clean, route smoke pass); rework applied — raw
> `bg-accent` CTAs replaced with `Button` primary, dead code removed.

- [x] Tokens: typography scale, color palette (dark theme, black background), spacing, radius
- [x] Tailwind theme configured from tokens; shadcn/ui (Radix) initialized
- [x] Base components: Button, Input, Textarea, Select, Card, Badge, Avatar, Dialog, Toast
- [x] Component states (default/hover/focus/disabled/error/loading)
- [x] Responsive primitives + **sticky mobile CTA** pattern
- [x] Form primitives wired to React Hook Form + Zod

### 0.9 — Notifications infrastructure (email)
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

Transactional email service, templates, and queue (§6 Resend, §5.14 templates).

> Auth emails (verification / password reset) intentionally **stay on Supabase's built-in
> mailer** (it owns the OTP tokens); this stage builds the Resend-backed pipeline for our
> **own** transactional emails (future reminders/notifications). Architecture: `lib/email`
> (server-only) renders React Email templates (dark theme, cyan `#79b9e3`; BaseLayout +
> Verification + PasswordReset + generic) to subject/html/text and **enqueues** a row into
> `email_messages` via the service-role client (Zod-validated envelope + per-template props;
> `dedup_key` idempotency on 23505). The project's **first Supabase Edge Function**
> `process-email-queue` (Deno) drains the queue — atomic claim via `claim_due_email_messages`
> (`FOR UPDATE SKIP LOCKED`), sends via Resend with an `Idempotency-Key`, exponential backoff,
> terminal `failed` state, and **stale-`sending` reclaim** (rows stuck >10 min are re-claimed).
> Triggered by `pg_cron` → `pg_net` (`trigger_email_queue_processing`, secret + URL from
> `email_queue_settings`), guarded by an `x-queue-secret` shared secret (fail-closed).
> `email_events` is the append-only send log (§7 observability). RLS mirrors the money-table
> posture: staff-only SELECT, **no client writes**, `email_queue_settings` has zero policies.
> Reviewed by `code-reviewer` (2 High fixed: stuck-`sending` reclaim + Resend Idempotency-Key)
> + `security-auditor` (clean; 1 Low fixed: `actionUrl` restricted to http(s)) + `qa`
> (build green, 16 routes, secret-leak clean, render smoke en/es, migrations statically
> validated — live apply deferred: Supabase CLI absent in env) + `browser-tester` (i18n).
> ⚠️ **Go-live gate:** delivery is gracefully **inert** until an operator deploys the Edge
> Function, sets its secrets (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `QUEUE_TRIGGER_SECRET`),
> and inserts the function URL + secret into `email_queue_settings` — documented in
> `docs/SUPABASE_SETUP.md` §5. Verified sending domain in Resend is an operator step.

- [x] **Resend** integration (server-only) + verified sending domain _(pipeline built; domain/keys are operator go-live steps, documented)_
- [x] Base email templates (verification, password reset) — layout ready for later types _(React Email: BaseLayout + Verification + PasswordReset + generic)_
- [x] Templates structured to be **admin-manageable** later (§5.14) and i18n-aware _(`registry.tsx` template_key indirection; `createTranslator` via `use-intl/core`)_
- [x] Sending abstraction + **queue / retry** (pg_cron / Edge Function) for reminders later _(`email_messages` queue + `process-email-queue` Edge Function; backoff + stale-reclaim + Idempotency-Key)_
- [x] Logging of sends for observability (§7) _(`email_events` append-only log; PATCH failures logged)_

### 0.10 — i18n infrastructure
**Status:** ✅ Done
**Started:** 2026-07-01
**Completed:** 2026-07-01

next-intl library, dictionaries, and language routing (§5.12), English-first.

> Most infra pre-existed (next-intl plugin, `[locale]` routing, request config, middleware
> composition, provider, RSC+client helpers). This stage closed the gaps: added a
> `LocaleSwitcher` (client, UI Kit `Select`, `aria-label`, preserves path via
> `@/i18n/navigation`, persists via `NEXT_LOCALE` + URL, hardened against stuck `isPending`
> with a safety timeout) wired into the Header; made routing intent explicit
> (`localePrefix: 'always'`, `localeDetection: false` for a deterministic **English-first**
> default — bare paths always resolve to `en`); **fully translated `es.json` to real
> Spanish** (was English placeholders) keeping it structurally identical to the `en` source;
> and documented the conventions in `docs/I18N.md` (no hardcoded strings → `add-i18n-keys`;
> profile/author content stays in `content_locale`, never run through UI dictionaries). No
> profile UI exists yet to wire `content_locale` at the app level — captured as a convention.
> Reviewed by `code-reviewer` + `qa` + `browser-tester` (live switch en↔es, path preserved,
> cookie set, strings change; the earlier "es shows English" was fixed in rework).

- [x] **next-intl** configured with `[locale]` segment routing + middleware _(pre-existing; made explicit)_
- [x] `messages/en.json` (source) + `messages/es.json` (readiness), structurally identical _(es fully translated to real Spanish; 90 keys, identical paths/order)_
- [x] Locale detection / switch; default English-first _(`LocaleSwitcher` in Header; `localeDetection: false`)_
- [x] Translation helpers for RSC (`getTranslations`) and client (`useTranslations`) _(pre-existing, in use)_
- [x] Convention: no hardcoded UI strings; use `add-i18n-keys` skill _(documented in `docs/I18N.md`)_
- [x] Profile content stays in author's `content_locale` (not run through UI dictionaries) _(convention documented; `content_locale` in DB schema/trigger; no profile UI yet)_

---

## Stage 1 — Onboarding & Profiles

Member/Mindsetter registration onboarding flow and profile data model, building on the
auth/RBAC/UI Kit foundation from Stage 0 (per `docs/mindsetis-mvp-tz.md` §5.2 "Реєстрація та
онбординг (member-first)", §5.5 "Профіль Member (короткий)", §8 stage 1.2).

### 1.1 — Member profile (onboarding step 2/4)
**Status:** 🔄 In progress
**Started:** 2026-07-07

Step 2 of the 4-step registration wizard (step 1 — sign-up form — done in Stage 0.6, with
i18n/email infra from 0.9–0.10). Collects username, country, city, languages spoken
(multi-select), bio (required, max 300 chars), about (optional, max 300 chars), profile
photo/avatar upload, interests (multi-select chips across categories, max 10), and social
links (LinkedIn required; Instagram/Facebook/TikTok/Threads/YouTube/Website optional) — all
persisted to the `profiles` table (plus new `interests`/`profile_interests` tables for the
interests multi-select).

- [ ] Migration: `profiles.country`/`profiles.city` (replacing single location field), `profiles.about`, `profiles.languages`, new `interests` + `profile_interests` tables with RLS
- [ ] Zod validation schema for the step-2 form (required vs optional fields per the asterisk fields on the Figma frame)
- [ ] Step-2 form component + page (reusing existing `RegistrationProgress` at step 2/4, page shell from step 1)
- [ ] New UI pieces: bold letter-spaced label variant, multi-select language control, interest chip/toggle component, avatar/photo upload control, taller BIO/About textarea
- [ ] Server Action to persist profile fields + interest selections + avatar upload to Storage
- [ ] i18n keys (`messages/en.json` source + `messages/es.json` mirror)
- [ ] Review loop (`code-reviewer`, `security-auditor` for new RLS, `qa`) + `browser-tester` smoke check

### 1.2 — Registration wizard: full 4-step reorder + Congrats screen (Figma alignment)
**Status:** 🔄 In progress
**Started:** 2026-07-14
_Code complete and reviewed (commit 0603854); live E2E re-check pending SUPABASE_SECRET_KEY + hosted "Confirm email" toggle._

Reorders the registration wizard to match the Figma "Registration" flow exactly (per §5.2 ТЗ
"Реєстрація та онбординг" + Figma frames `Registration 1/4` → `Member profile 2/4` →
`Member profile 3/4` → `Member profile 4/4` → `Congrats screen`). Steps 1 (sign-up, Stage 0.6)
and 2 (member-profile, Stage 1.1) exist but out of Figma order: email confirmation currently
fires right after Step 1 instead of being Step 4/4, there is no Step 3/4, and there is no
post-confirmation "Congrats screen" — confirming the email link today just redirects to `/`.

- [x] New Step 3/4 page "What do you build?" (Company, Role/Position, Industry) — new page + Server Action + Zod schema, `RegistrationProgress` step={3}; migration for the new profile columns with RLS
- [x] Move the "Check your inbox" email-confirmation screen to be Step 4/4 (currently shown right after Step 1) — `RegistrationProgress` step={4} on `/verify-email`
- [x] **Auth architecture (decided 2026-07-14):** implemented via service-role Admin API (`admin.createUser({ email_confirm: false })` + `signInWithPassword()`) rather than the originally-sketched `enable_confirmations=false` config approach — Steps 2–3 run as a logged-in-but-unconfirmed user; confirmation email still sent at Step 4. All confirmed/verified-only gates (booking, session creation, future profile publishing) check `email_confirmed_at` / `verification_status` / `is_public` flags directly — never session existence — consistent with the existing 14-day verification-flag pattern (§3.2).
- [x] New "Congrats screen" page shown after email confirmation (`/api/auth/confirm` should redirect here instead of `/`) — "You are now a member of the community" + CTAs (Find Mindsetter / Invite to event / Find event / "Find out who a Mindsetter is")
- [x] Update the `next` redirect param in `app/[locale]/(auth)/actions.ts` `signUp()` and the `/api/auth/confirm` route accordingly
- [x] i18n keys for the new Step 3/4 and Congrats screen copy (`messages/en.json` source + `messages/es.json` mirror)
- [x] Review loop (`code-reviewer`, `security-auditor` — this is an auth-flow change, `qa`) + `browser-tester` full walkthrough of Steps 1→2→3→4→confirm→Congrats

Out of scope for this stage (separate future stage per Figma): the "Find out who a Mindsetter is" fork into the 6-step extended Mindsetter wizard (Roles/Superpowers/Promo video/etc.), and the "I'm on the way" lead-capture flow from spec §5.2 (clarified 2026-07-14: a lightweight name+email capture for visitors not ready to register — written straight to a separate `leads` table, no Supabase Auth account created, passed to the team for manual follow-up; likely reuses the email field already on the first onboarding-tour slide in Figma, fired independently of whether the visitor completes the full wizard) — deferred to its own future stage, not built as part of 1.2.

### 1.3 — "I'm on the way" lead capture
**Status:** ✅ Done
**Started:** 2026-07-14
**Completed:** 2026-07-14

Lightweight escape-hatch from spec §5.2 ("«I'm on the way» → запис у `leads` одразу (навіть якщо
далі не пройде), передається команді") for visitors not ready to complete the full registration
wizard — name + email only, no Supabase Auth account created, stored separately, surfaced to the
team for manual follow-up. Not a numbered step in the 4-step wizard and has no dedicated Figma
frame (clarified 2026-07-14) — since there was no Figma frame to drive the placement, the
implementation made a deliberate product decision instead: a new, separate "I'm on the way"
trigger (a small dialog/modal with name+email fields) added to the landing page's `HeroSection`
component, right next to the existing `HeroEmailCta` (a different, unrelated, email-only feature
that routes into the full `/sign-up` flow), fired independently of whether the visitor continues
into the full wizard.

- [x] Migration: `leads` table (`name`, `email`, `source`, `created_at`) with RLS — anon/public INSERT allowed (no auth required), SELECT restricted to staff via `is_staff()`
- [x] Zod schema + rate-limited Server Action to capture a lead (name + email), independent of the sign-up flow
- [x] Wire the capture point into the onboarding-tour intro slide (or wherever product decides) — fire-and-forget, does not block or replace full registration
- [x] i18n keys (`messages/en.json` source + `messages/es.json` mirror)
- [ ] Staff-facing lead list/queue is OUT of scope here — deferred to the admin-panel stage (§5.14); this stage only captures and stores leads
- [x] Review loop (`code-reviewer`, `security-auditor` — public unauthenticated INSERT endpoint, `qa`) + `browser-tester` smoke check

### 1.4 — Registration steps: pixel-accurate styling from Figma
**Status:** 🔄 In progress
**Started:** 2026-07-14

Visual polish pass across the full registration wizard (Steps 1–4, `RegistrationProgress`
component, and the Step 3/4 + Congrats screen built in Stage 1.2) to match the Figma
"Registration" frames exactly — spacing, typography, colors, control states (focus/error/disabled),
and desktop (1440px) + mobile breakpoints per the corresponding Figma frames found during the
Stage 1.2 Figma audit (`Registration 1/4`, `Member profile 2/4`, `Member profile 3/4`,
`Member profile 4/4`, `Congrats screen`, plus their 1440px desktop variants). Functional
behavior stays as already implemented — this stage is styling/visual-fidelity only, not new
functionality.

- [ ] Diff each step's current implementation against its Figma frame (via `figma-designer`) and list concrete visual deltas per step
- [ ] Fix spacing/typography/color deltas in `/sign-up`, `/member-profile`, and the new Step 3/4 + Congrats screen from Stage 1.2
- [ ] Verify/fix the `RegistrationProgress` step-indicator styling (note: Stage 1.2's Figma audit found the progress badge text is inconsistently synced to step number in several Figma frames — use frame name + left-to-right order as ground truth, not the badge text)
- [ ] Verify responsive behavior at mobile + 1440px desktop breakpoints against the corresponding Figma frame variants
- [ ] `browser-tester` visual walkthrough of Steps 1→4 on both breakpoints
