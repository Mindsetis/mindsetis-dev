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
**Status:** ✅ Done
**Started:** 2026-07-14
**Completed:** 2026-07-14
_Live E2E passed against the hosted Supabase project (`browser-tester`): real signup through all 4 steps to `/welcome` confirmed working. Final commits on `feature/stage-1.4-registration-styling`: `0603854` (original 4-step build), `8fa3ff9` (auto-confirm rework + security fixes)._

Reorders the registration wizard to match the Figma "Registration" flow exactly (per §5.2 ТЗ
"Реєстрація та онбординг" + Figma frames `Registration 1/4` → `Member profile 2/4` →
`Member profile 3/4` → `Member profile 4/4` → `Congrats screen`). Steps 1 (sign-up, Stage 0.6)
and 2 (member-profile, Stage 1.1) exist but out of Figma order: email confirmation currently
fires right after Step 1 instead of being Step 4/4, there is no Step 3/4, and there is no
post-confirmation "Congrats screen" — confirming the email link today just redirects to `/`.

- [x] New Step 3/4 page "What do you build?" (Company, Role/Position, Industry) — new page + Server Action + Zod schema, `RegistrationProgress` step={3}; migration for the new profile columns with RLS
- [x] Move the "Check your inbox" email-confirmation screen to be Step 4/4 (currently shown right after Step 1) — `RegistrationProgress` step={4} on `/verify-email`
- [x] **Auth architecture (final, live-tested, decided/reworked 2026-07-14):** signup auto-confirms the user at creation via the service-role Admin API (`admin.createUser({ email_confirm: true })`), giving an immediate session with no confirmation gate at all. This replaces the originally-planned `email_confirm: false` + hosted "Confirm email" toggle-flip approach, which live testing proved infeasible: Supabase's `signInWithPassword()` unconditionally rejects an `email_confirm:false` user regardless of that project-level toggle. Step 4 ("Check your inbox") and its email are now purely informational — a "Welcome to Mindsetis" email sent via this project's own `email_messages` queue (not Supabase Auth's `resend()`) — with an always-available "Continue" button straight to `/welcome`, not a gate waiting for an email click. **Accepted tradeoff (product decision, recorded 2026-07-14):** since there is no email-ownership verification at signup anymore, someone could sign up with an email address they don't control ("email squatting"). Mitigation shipped: `updatePassword` resets the 14-day `verification_deadline` and clears `access_restricted` on a completed password-reset (strong proof of real ownership), so a legitimate owner reclaiming a squatted address isn't immediately access-restricted. Full email-ownership gating before session grant was considered and explicitly rejected as out of scope for MVP.
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
**Status:** ✅ Done
**Started:** 2026-07-14
**Completed:** 2026-07-14

Visual polish pass across the full registration wizard (Steps 1–4, `RegistrationProgress`
component, and the Step 3/4 + Congrats screen built in Stage 1.2) to match the Figma
"Registration" frames exactly — spacing, typography, colors, control states (focus/error/disabled),
and desktop (1440px) + mobile breakpoints per the corresponding Figma frames found during the
Stage 1.2 Figma audit (`Registration 1/4`, `Member profile 2/4`, `Member profile 3/4`,
`Member profile 4/4`, `Congrats screen`, plus their 1440px desktop variants). Functional
behavior stays as already implemented — this stage is styling/visual-fidelity only, not new
functionality.

**Scope expanded 2026-07-14:** a follow-up Figma audit found real content/functionality gaps
against the design (not just visual deltas) — missing copy, missing controls, a required-field
mismatch, and a missing progress indicator on the Congrats screen. Product decided to fold all
of this into 1.4 rather than defer it; the new items below (all to be implemented next) sit
alongside the original pure-styling checklist.

- [x] Diff each step's current implementation against its Figma frame (via `figma-designer`) and list concrete visual deltas per step
- [x] Fix spacing/typography/color deltas in `/sign-up`, `/member-profile`, and the new Step 3/4 + Congrats screen from Stage 1.2
- [x] Verify/fix the `RegistrationProgress` step-indicator styling (note: Stage 1.2's Figma audit found the progress badge text is inconsistently synced to step number in several Figma frames — use frame name + left-to-right order as ground truth, not the badge text)
- [x] Verify responsive behavior at mobile + 1440px desktop breakpoints against the corresponding Figma frame variants
- [x] `browser-tester` visual walkthrough of Steps 1→4 on both breakpoints
- [x] `RegistrationProgress` step-indicator: 3 visual states (done/current/future — Figma shows current step as a two-layer translucent glow, not solid fill like done), correct height (12px) and gap (4px)
- [x] Step 1 (`/sign-up`): add missing eyebrow text ("Let's start") + subtitle ("Your info is saved right away — even if you don't finish now.") per Figma, new i18n keys
- [x] Step 3 (`/build-profile`): mark Company/Role/Industry as required (asterisk + Zod validation) per Figma, matching label copy ("Your role" not "Role / Position"); change Industry from free-text input to a fixed-option select (code-defined array, following the same "code-defined list over DB table" precedent as the interests catalog refactor, not free text)
- [x] Step 4 (`/verify-email`): restructure copy (eyebrow = the email address, single subtitle without embedded email), add a "Resend email" button (new reusable Server Action, rate-limited) and a "Wrong email? Change it" link (back to `/sign-up` to restart with a corrected address)
- [x] Congrats screen (`/welcome`): add the `RegistrationProgress` step 4/4 indicator (present in Figma, currently missing from code)
- [x] Spacing/typography fixes: field-block-to-submit-button gap (16px not 24px), mobile H1 line-height (100% not 110%), remove `text-center` on `/verify-email` and `/welcome` to match the left-aligned pattern used by the other steps

### 1.5 — Real email verification, moved to step 2 (revert auto-confirm workaround)
**Status:** 🔄 In progress
**Started:** 2026-07-15

Implementation + Figma audit + full review loop (code-reviewer ×2, security-auditor, qa, browser-tester) complete and passing. Two follow-ups surfaced during review, both non-blocking and NOT part of this stage's original scope: (1) rate-limiting across the app (including the new `signUp()`/`resendConfirmationEmail` per-email buckets) is currently a no-op because `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are unset in this environment (pre-existing gap, tracked under stage 0.2's deferred Upstash infra) — real enforcement needs that provisioned; (2) `app/[locale]/build-profile/actions.ts` still hand-rolls its own per-email hash bucket instead of the new shared `emailBucket` helper (`lib/rate-limit.ts`) — harmless, optional cleanup. `browser-tester` could not observe the literal sign-up-submit→redirect live (blocked by Supabase's own strict built-in email-send quota during testing, not a code defect) — confirmed via source and direct navigation instead.

Follow-up live verification (2026-07-15): the user completed the last remaining checklist item (Supabase Dashboard → Email Templates → "Confirm signup" now points at `/api/auth/confirm?token_hash=...&type=email&next=/member-profile`) and configured Custom SMTP via Resend. A full live end-to-end test then found the code path itself is fully correct — verified by bypassing SMTP with the Admin API's `generate_link` to mint a real token, hitting `/api/auth/confirm` directly, and confirming it sets a real session cookie and lands on `/member-profile` (step 3) rendering the actual form, not a login bounce. However, an actual `signUp()` call still fails with a 500 (`Error sending confirmation email`) because Resend rejects the send: **the `mindsetis.com` sending domain is not yet verified in the Resend account** (`smtp_admin_email` is `no-reply@mindsetis.com`). GoTrue rolls back user creation entirely when the mailer fails, so this is safe (no orphaned/broken accounts), but real sign-up is non-functional until the domain is verified. Remaining step: verify `mindsetis.com` in the Resend dashboard (resend.com/domains → add the DNS records Resend provides), then re-run a real signup→email→click test to close this out.

Stage 1.2 replaced the planned email-confirmation gate with `admin.createUser({ email_confirm: true })` + immediate sign-in, because `signInWithPassword()` unconditionally rejects an `email_confirm:false` user regardless of the Supabase project's "Confirm email" toggle — that made the *original* placement (confirmation gate at step 4, after the profile is already filled while signed in) infeasible without either an unconfirmed session or losing the wizard's session mid-flow. Product now wants confirmation restored as a **real gate** — moved to **step 2** (right after sign-up, before any profile data is collected), so the session-before-confirmed conflict never arises: `verifyOtp()` (fired when the user clicks the email link) both confirms the account **and** establishes the session, so steps 3–4 proceed authenticated exactly as they do today. Steps 3 (member-profile) and 4 (build-profile) keep their current content/order, just renumbered.

- [x] `Dashboard → Authentication → Providers → Email` → turn **Confirm email** back ON (per `docs/SUPABASE_SETUP.md` §3 — believed disabled during the stage 1.2 workaround; verify current state on the hosted project first)
- [x] `signUp` (`app/[locale]/(auth)/actions.ts`): revert from `service.auth.admin.createUser({ email_confirm: true })` + follow-up `signInWithPassword()` back to a plain anon-client `supabase.auth.signUp()` (no immediate session — return `{ email }` only) so Supabase's own "Confirm signup" mailer fires (per `docs/SUPABASE_SETUP.md` §3a, already routed through the Resend SMTP relay — no `lib/email/` queue involved)
- [x] `SignUpForm.tsx`: redirect to `/verify-email?email=...` instead of `/member-profile` after successful sign-up
- [x] `/verify-email` page: renumber `RegistrationProgress` from `step={4}` to `step={2}`; back-link target `/build-profile` → `/sign-up`; remove the "Continue" button that currently skips straight to `/welcome` with no confirmation (this becomes a real blocking gate — no session, no bypass)
- [x] `/verify-email` resend action: swap `ResendWelcomeEmailButton`/`resendWelcomeEmail` (which requires a session and resends the informational welcome email) for a pre-session "resend confirmation email" action using `supabase.auth.resend({ type: 'signup', email })`, rate-limited the same way, keyed off the `?email=` param (no session exists yet at this step)
- [x] `/api/auth/confirm` route: currently documented as "NOT used by the sign-up wizard" — re-wire it into the wizard for `type=email`/`type=signup` confirmations, redirecting to `/member-profile` (step 3) on success instead of only serving the password-reset flow; update its doc comment
- [x] `Dashboard → Authentication → Email Templates` → "Confirm signup" template: point the link at `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/member-profile` (per `docs/SUPABASE_SETUP.md` §3, not yet done since the wizard didn't use this route)
- [x] `/member-profile` page: renumber `step={2}` → `step={3}`; back-link target `/sign-up` → `/verify-email`
- [x] `/build-profile` page: renumber `step={3}` → `step={4}`; back-link target stays `/member-profile` (unchanged, still the previous step)
- [x] `/welcome` (Congrats screen): no renumbering needed (`step={4}`/`total=4` already correct as the "wizard complete" state) — just re-verify it still reads right as the screen after step 4/build-profile
- [x] Re-review the "email squatting" mitigation from stage 1.2 (`updatePassword` resetting `verification_deadline`/`access_restricted`) — decide whether it's still needed now that email ownership is verified again before any session exists, or safe/harmless to leave as defense-in-depth
- [x] Update stale doc comments referencing the auto-confirm architecture: `(auth)/actions.ts#signUp`, `verify-email/actions.ts` (or its replacement), `verify-email/page.tsx`, `app/api/auth/confirm/route.ts`, and the ROADMAP 1.2 entry itself (add a note that it was superseded by 1.5, don't delete the historical record)
- [x] Migration/data check: any existing hosted-project users created via the auto-confirm path stay confirmed (no retroactive re-verification) — confirm this is fine as a one-time MVP-stage transition, not a live-migration concern
- [x] i18n: update `signUp.stepLabel`-driven copy if any step-specific strings (e.g. verify-email eyebrow/subtitle) assumed the old step-4 framing
- [x] Review loop (`code-reviewer`, `security-auditor` — this is an auth-flow change, `qa`) + `browser-tester` full walkthrough: sign-up → real inbox email → click confirm link → lands on member-profile with a session → steps 3–4 → Congrats; also test resend + wrong-email + expired/invalid link paths

### 1.6 — Registration wizard: copy/UI tweaks (Figma follow-ups)
**Status:** ✅ Done
**Started:** 2026-07-16
**Completed:** 2026-07-16

Batch of small copy and UI adjustments across the registration wizard, requested by the user
directly (not yet scoped/estimated). **Note:** every new/changed button below links to the
homepage for now — destinations are placeholders pending a product decision on real routes,
not final. The step-3 upload icon SVG is recorded verbatim below so implementation doesn't
need to ask again.

Implementation follow-up (2026-07-16, resolved 2026-07-16): the step-1 password-hint copy now
reads "At least 1 uppercase letter", but `passwordSchema` (`lib/validation/common.ts`) still
validated via `/[A-Za-z]/` (any-case letter) — a password with only lowercase letters
satisfied this requirement even though the UI claimed it needed an uppercase letter.
Decision: tightened the regex to `/[A-Z]/` to match the copy. Updated `SignUpForm.tsx`'s
local hint check (same regex) and removed the now-resolved JSDoc flag.

Implementation follow-up (2026-07-16): the step-4 "Industry" checklist item originally said
"reuse the existing country select used in step 3, made single-select" — turned out step 3's
Country field is a plain text `Input`, not a select, so that reference didn't exist. User
clarified (2026-07-16) the actual reference is step 3's **language** control — the
`LanguagesMultiSelect` combobox (`components/member-profile/LanguagesMultiSelect.tsx`:
Popover + searchable `Command` list, chevron trigger, checkbox-style selected indicator).
Industry currently uses a plain Radix `Select`/`SelectTrigger` (`BuildProfileForm.tsx`) — the
item now means: give Industry the same Popover+searchable-Command visual/interaction style as
`LanguagesMultiSelect`, but constrained to picking exactly one option (select closes the
popover and shows the single chosen label, no removable chips).

**Step 1 — account creation (name, password, email):**
- [x] Remove the "Let's start" text
- [x] Remove the "Your info is saved right away — even if you don't finish now." text
- [x] Change copy "Contains a letter" → "At least 1 uppercase letter"
- [x] Change copy "Contains a number" → "At least 1 number"
- [x] Change copy "Confirm password" → "Repeat Password"
- [x] Remove "Already have an account? Log in"

**Step 2 — email confirmation screen (`/verify-email`):**
- [x] Remove "Back to log in"

**Step 3 — additional profile data (`/member-profile`):**
- [x] Photo upload field: add an icon to the left of the upload button's text. Exact SVG
  (16×16, `viewBox="0 0 16 16"`, `fill="white"`) provided by the user:
  ```svg
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.9987 4.00004C8.46536 4.00004 7.9987 4.46671 7.9987 5.00004C7.9987 5.53337 8.46536 6.00004 8.9987 6.00004C9.53203 6.00004 9.9987 5.53337 9.9987 5.00004C9.9987 4.46671 9.53203 4.00004 8.9987 4.00004ZM12.6654 1.33337H3.33203C2.1987 1.33337 1.33203 2.20004 1.33203 3.33337V12.6667C1.33203 13.8 2.1987 14.6667 3.33203 14.6667H12.6654C13.7987 14.6667 14.6654 13.8 14.6654 12.6667V3.33337C14.6654 2.20004 13.7987 1.33337 12.6654 1.33337ZM13.332 9.26671L12.0654 8.00004C11.2654 7.26671 9.9987 7.26671 9.26536 8.00004L8.66536 8.60004L6.73203 6.66671C5.93203 5.93337 4.66536 5.93337 3.93203 6.66671L2.66536 7.93337V3.33337C2.66536 2.93337 2.93203 2.66671 3.33203 2.66671H12.6654C13.0654 2.66671 13.332 2.93337 13.332 3.33337V9.26671Z" fill="white" />
  </svg>
  ```
- [x] Hide the photo preview by default; only render it once the user has actually uploaded a photo

**Step 4 — company info (`/build-profile`):**
- [x] "Industry" select: replace the current plain Radix `Select`/`SelectTrigger` with the same
  Popover + searchable `Command` combobox visual/interaction style as
  `LanguagesMultiSelect` (`components/member-profile/LanguagesMultiSelect.tsx`), constrained to
  a single choice (closes on select, shows one chosen label, no removable chips) — see
  implementation follow-up note above for the clarified reference. Built as a new sibling
  component `components/build-profile/IndustryCombobox.tsx` (no generic combobox existed yet
  to reuse); wired into `BuildProfileForm.tsx` in place of the old `Select`.

**Step 5 — Welcome / Congrats screen (`/welcome`, last step):**
- [x] Remove the `lucide-circle-check` icon
- [x] Change text "Congrats!" → "Congratulations! You are now a member of the community."
- [x] Remove the separate "You are now a member of the community." line (merged into the
  heading above instead)
- [x] Remove the "Browse the community" button
- [x] Add a button: "Find Mindseter for me" (user's exact wording — likely typo for
  "Mindsetter"; confirm spelling with the user before implementing)
- [x] Add a button: "Invite on Mindsetis event"
- [x] Add a button: "Find Mindsetis event"
- [x] Add a button: "Find out who a Mindsetter is" — opens a "Who is Mindsetter?" popup/modal
  (already designed in Figma, in the frame directly below this last registration screen's
  frame). Inside the popup, a button "Understand, I want to be a Member" closes the popup AND
  swaps the "Find out who a Mindsetter is" button (same position) for a new button "See how
  looks my profile page"

**Before implementing:**
- [x] Check the Figma file (via `figma-designer`) for every changed/added element above —
  especially the new step-5 buttons and the step-4 single-select — for whether the design
  calls for an icon that isn't captured yet in this checklist; add it here if so

  Figma audit findings (2026-07-16): Step 3 upload button icon confirmed matching the recorded
  SVG (Figma's own asset there is a generic `scenery` picture-glyph, same concept). Step 4
  Industry select needs no new icon — Figma just shows the standard trailing chevron
  (`input drop-down`), same as any other select field; Figma's "Country" field itself is a
  plain text input with no chevron, so it isn't a real reference — the code's existing
  country-input styling is what actually exists to compare against (see the open Industry
  question below). Step 5 DOES need icons not yet in the checklist — added as new items below.

**Step 5 icons (added after Figma audit, 2026-07-16):**
- [x] "Find Mindseter for me" — leading search/magnifying-glass icon (`lucide-react` `Search`)
- [x] "Invite on Mindsetis event" — leading person+plus icon (Figma: `user-add-fill`; `lucide-react` `UserPlus`)
- [x] "Find Mindsetis event" — leading search/magnifying-glass icon (borderless/tertiary button style in Figma; `lucide-react` `Search`, `variant="ghost"`)
- [x] "Find out who a Mindsetter is" — trailing circular icon with an arrow (Figma: `arrow-left-long-line`, rendered pointing right; `lucide-react` ships this natively as `CircleArrowRight`, no custom wrapper needed)
- [x] "See how looks my profile page" (popup replacement button) — leading ID-card/profile icon (Figma: `account-pin-box-fill`; `lucide-react` `IdCard`)
- [x] Popup "Understand, I want to be a Member" — confirmed no icon in Figma, no change needed

**Review loop:**
- [x] `code-reviewer` + `security-auditor` (password-validation regex change touches auth) + `qa` review loop, then commit via `git-manager`
- [x] Follow-up review loop for the reopened "Who is Mindsetter?" popup expansion (`code-reviewer` + `qa`; no new auth/RLS/money surface, `security-auditor` not required this round), then commit via `git-manager`

`code-reviewer` (2026-07-16): one Medium must-fix — `IndustryCombobox` was wrapped in
`FormControl` in `BuildProfileForm.tsx`, breaking label/`aria-describedby` association (Radix
`Slot` merges those onto a single child, but `IndustryCombobox` doesn't forward them);
`LanguagesMultiSelect`'s established pattern in `MemberProfileForm.tsx` deliberately renders
outside `FormControl` for this reason. **Fixed:** removed the `FormControl` wrapper to match.
`typecheck`/`lint` re-verified clean after the fix. Everything else from that review was
optional/non-blocking (Dialog missing a `DialogDescription`, reset-password form lacking a
live password-hint checklist, a documented duplication between `LanguagesMultiSelect` and
`IndustryCombobox` worth a future shared-combobox extraction, and a request to double-check
the "Find Mindseter" spelling with the user before merge — see the step-5 checklist item,
already flagged there as the user's exact wording).
`security-auditor` (2026-07-16): clean, no Medium+ findings; confirmed the password-regex
tightening applies consistently to both sign-up and password-reset (shared `passwordSchema`),
no client/server validation drift, no secret/service-role leakage in new client components.
`qa` (2026-07-16): **PASSED** — typecheck/lint/build/secret-leak scan all green; live smoke
test against the hosted Supabase project covered all 5 wizard steps (real authenticated
session for steps 3–5 via the same Admin-API `generateLink` technique as stage 1.5, test user
cleaned up afterward). One pre-existing issue noted but not blocking: `npm run format:check`
fails on ~100 files even on a clean `HEAD` with none of this stage's changes — a repo-wide
`core.autocrlf`/Prettier line-ending mismatch, unrelated to stage 1.6, tracked separately
(needs a `.gitattributes` `eol=lf` or `core.autocrlf=input` fix at some point).

Implementation follow-up (2026-07-16, reopened): the "Who is Mindsetter?" popup was built as a
minimal placeholder (title + one button) because the full design wasn't available yet. The
user pointed to Figma Frame 267 (near the Congrats screen), which has the complete design.
Audit findings: the popup needs a description under the title; a dark checklist card labeled
"A MINDSETTER IS" with 3 checkmark bullets ("A business owner, founder or CEO", "Verified by
the Mindsetis team", "Ready to share real experience"); 3 feature callouts (heading + body
each) — "Your own personal site", "Earn from sessions" (mentions a 15%/85% platform/creator
split), "Build your personal brand"; TWO footer buttons instead of one — a new primary button
"Cool, I want to become a Mindsetter" (fixing the Figma source's "Mindseter" typo) alongside
the existing "Understand, I want to be a Member" secondary button; and a circular close (X)
button in the header. User decided: the new "Cool, I want to become a Mindsetter" button also
links to `/` as a placeholder (same as the rest of stage 1.6's new buttons — no real route
decided yet); and the non-standard circular close button + the "Understand..." button's
Figma resting-state style (white text on a grey border, which doesn't match any existing
`Button` variant exactly) should be built as new, purpose-built components for this popup
rather than reusing/overriding the shared `Button`/`Dialog` defaults. Figma also had a
hidden/clipped orphan sub-form (Title/Description/Link fields) accidentally nested inside the
checklist card in the design file — confirmed via screenshot it never renders, explicitly NOT
part of this popup, do not build it. Figma's 3-item checklist lays out vertically on mobile,
horizontally in one row on desktop (responsive difference, not a separate variant).

Popup expansion checklist:
- [x] Add popup description text under the title
- [x] Add the dark "A MINDSETTER IS" checklist card (3 checkmark bullets), responsive:
  vertical stack on mobile, single horizontal row on desktop
- [x] Add the 3 feature callouts (heading + body pairs): "Your own personal site", "Earn from
  sessions" (15%/85% split), "Build your personal brand"
- [x] Add second footer button "Cool, I want to become a Mindsetter" (placeholder link to `/`,
  same as other stage-1.6 buttons), positioned alongside the existing "Understand, I want to
  be a Member" button (stacked on mobile, side-by-side on desktop per Figma)
- [x] Build a custom circular close (X) button matching Figma (not the default Dialog close button)
- [x] Build/adjust button styling so "Understand, I want to be a Member" matches Figma's
  resting-state look (white text, grey border) as its own purpose-built style, not a
  shared-variant override
- [x] i18n keys for all new popup copy

Implemented (2026-07-16) as a new `components/auth/WhoIsMindsetterDialog.tsx` component
(swapped into `WelcomeCtas.tsx` in place of the inline placeholder). Close button: a plain
`&lt;button&gt;` inside `DialogClose asChild` with `showCloseButton={false}` on `DialogContent`
(32×32, `rounded-full border-border bg-background`, lucide `X`, sr-only label via new
`modal.close` i18n key). "Understand..." button: `variant="outline"` + a local
`className="text-foreground"` override (no changes to the shared `button.tsx` variants).
Breakpoint used for the mobile/desktop checklist-card and footer-button layout: `md:`
(matching `OAuthButtons.tsx`'s existing convention). `typecheck`/`lint`/`build` all clean.

### 1.7 — "I'm on the way" lead capture: full rework (supersedes 1.3's popup)
**Status:** ✅ Done
**Started:** 2026-07-16
**Completed:** 2026-07-16

Replaces stage 1.3's approach entirely (that section is left intact below as historical
record — not deleted, not rewritten). Stage 1.3 built a separate popup
(`LeadCaptureDialog.tsx`) with its own Name + Email fields, triggered by a standalone
"I'm on the way" link, writing to a `leads` table (`id`, `name`, `email`, `source`,
`created_at`, `updated_at`).

User's exact request (2026-07-16): no separate fields, popups, or pages at all. Only the
existing homepage hero email field + "Continue" button
(`components/marketing/HeroEmailCta.tsx` — already exists, currently just client-side
validates the email and routes to `/sign-up?email=...` with zero DB write) should write the
email to a table when the visitor submits it. Add a `registered` boolean column: when the
visitor enters their email on the homepage and proceeds to the first registration step, the
row is written with `registered = false`; if they go on to actually complete account
registration, the same row's `registered` flips to `true`; if they never complete
registration, it stays `false`.

User decision: reuse/rework the existing `leads` table rather than create a new one — drop
`name`/`source`, add `registered boolean not null default false`, add a uniqueness
constraint on `email` (resubmitting just upserts the existing row, no duplicates).

- [x] Migration: alter `leads` table — drop `name` and `source` columns, add
  `registered boolean not null default false`, add a unique constraint/index on `email`.
  Update RLS: keep public anon INSERT (homepage is unauthenticated) but constrain it so a
  client can never insert `registered = true` directly (e.g. `with check (registered = false)`);
  UPDATE must NOT be open to anon/authenticated at all — the `registered` flip only happens
  server-side via the service-role client from the sign-up Server Action, never from a
  client-writable policy (same "server-only for the sensitive field" precedent as money
  tables). Keep existing staff-only SELECT/DELETE policies (adjust for dropped columns).

  Applied (2026-07-16): `supabase/migrations/20260716185041_leads_signup_intent_rework.sql`,
  pushed to the hosted project (`pqaffuvhghlbenqigwks`) and verified live — `leads` now has
  `id`/`email`/`registered`/`created_at`/`updated_at` only, `leads_email_key` unique
  constraint added, `leads_insert_public`'s `with check` narrowed to `registered = false`,
  staff-only SELECT/UPDATE/DELETE policies unchanged. Types regenerated
  (`lib/supabase/types.gen.ts`).
- [x] `lib/validation/leads.ts`: simplify to an email-only schema (drop `name`). Landed as
  `signupIntentSchema` (`{ email }`) — `nameSchema`/`leadFormSchema`/`leadCaptureSchema` removed.
- [x] `app/[locale]/actions.ts`: replace/rework `captureLead` into an email-only action that
  upserts into `leads` (email, `registered` defaults to false) — call it from
  `HeroEmailCta`'s submit handler, not from a dialog. Landed as `recordSignupIntent`
  (rate-limit key renamed `marketing:signup-intent`).

  **`qa` (2026-07-16) found this CRITICAL/broken as first implemented:** the
  `{ onConflict: 'email', ignoreDuplicates: true }` upsert (`INSERT ... ON CONFLICT DO
  NOTHING`) was chosen to dodge the `DO UPDATE`-needs-an-UPDATE-policy problem (see below),
  but `DO NOTHING` has the *same* underlying issue — Postgres needs SELECT-visibility into any
  potentially-conflicting row to evaluate `ON CONFLICT` at all, and anon/authenticated has zero
  SELECT on `leads` (`leads_select_staff` is staff-only). Reproduced live against the hosted
  project: every anon call with that `Prefer` header fails `42501` (RLS violation) — including
  for a brand-new email with no existing row — so **every homepage submission silently wrote
  nothing**, the whole point of this stage. `HeroEmailCta` swallows the failure and navigates
  to `/sign-up` regardless, so this was invisible without live RLS testing (source-level
  review by `code-reviewer` didn't catch it either — it reasoned the logic through but wasn't
  run live against real RLS).

  Original (broken) reasoning kept for context: a true upsert-with-update
  (`onConflict: 'email'` merging into the existing row) is blocked by RLS because
  anon/authenticated has no UPDATE policy on `leads` (intentional, staff-only), and Postgres
  enforces the UPDATE policy on `ON CONFLICT DO UPDATE` (unlike a plain UPDATE, which just
  silently filters rows, a blocked `DO UPDATE` raises an error) — this diagnosis was correct,
  but the `DO NOTHING` fallback doesn't actually route around it, since `DO NOTHING` also
  requires SELECT visibility to detect the conflict in the first place.

  **Fixed (2026-07-16):** `recordSignupIntent` now writes via the **service-role client**
  (`lib/supabase/service.ts`, same one `signUp`'s `registered` flip already uses) instead of
  the anon client — bypasses RLS entirely, so the SELECT-visibility problem no longer applies
  regardless of upsert mode. No auth check added (the capture point is intentionally open to
  anonymous visitors, unchanged trust boundary — Zod validation + the existing
  `marketing:signup-intent` rate limit are still the only gates). Upsert mode: real
  `DO UPDATE SET updated_at = now()` on email conflict, deliberately **omitting** `registered`
  from the update payload — a resubmission just touches `updated_at`, never resets an
  already-`true` `registered` flag back to `false`. Live-verified against the hosted project:
  new email → row created (`registered = false`); resubmitting the same email → no error,
  `updated_at` bumps, `created_at` unchanged; resubmitting an email already flipped to
  `registered = true` → stays `true`, not reset. `typecheck`/`lint`/`build` clean.

  Re-review after the fix (2026-07-16): `code-reviewer` APPROVED (two Low nits fixed — dropped
  the redundant explicit `updated_at` from the upsert payload since the `set_leads_updated_at`
  trigger already stamps it, and reworded a doc comment that ambiguously said "anon Server
  Action" right next to code that now uses the service-role client). `security-auditor`
  reviewed the anon→service-role client switch specifically (this makes RLS a non-factor for
  this write path, leaving Zod + rate-limit as the only gates) — clean, no Critical/High/Medium
  findings; confirmed the upsert payload structurally can never include `registered`, the
  `onConflict` target is hard-coded, and the service-role client instance isn't shared/reused
  elsewhere. Non-blocking suggestion for a future pass: a narrow `SECURITY DEFINER` SQL
  function would be a tighter-scoped alternative to a general service-role client for this
  specific anonymous entry point — noted for later, not required now. `qa` independently
  re-verified all 3 live DB behaviors against the hosted project post-fix (fresh re-run, not
  just trusting the implementer's report) — PASS.
- [x] Delete `components/marketing/LeadCaptureDialog.tsx` entirely and its usage in
  `components/marketing/HeroSection.tsx` (remove the "I'm on the way" trigger link/popup —
  no separate escape-hatch UI anymore). Done; `HeroSection.tsx`'s doc comment updated,
  `components/auth/ResendConfirmationEmailButton.tsx`'s stale comment reference fixed too.
- [x] `app/[locale]/(auth)/actions.ts` `signUp`: after a successful `signUp()` call,
  best-effort update the matching `leads` row (by lowercased email) to `registered = true`
  via the service-role client (narrow, justified server-only use — no-op if no row exists,
  i.e. the visitor never went through the homepage field). Done, non-fatal (console.error on
  failure), same pattern as `updatePassword`'s existing `verification_deadline` update.
- [x] i18n: remove now-unused `home.hero.imOnTheWay.*` keys from `messages/en.json`/`es.json`
  (keep `home.hero.emailLabel`/`emailPlaceholder`/`continue`, still used by `HeroEmailCta`).
  Done, confirmed no other references before removing.
- [x] Review loop (`code-reviewer`, `security-auditor` — RLS + service-role usage change,
  `qa`) then commit via `git-manager`

`typecheck`/`lint`/`format:check` (pre-existing CRLF baseline unchanged, no new violations)/`build` all clean per the implementing agent.

### 1.8 — Homepage / footer / onboarding UI polish + onboarding-as-popup
**Status:** ✅ Done
**Started:** 2026-07-16
**Completed:** 2026-07-18

Large batch of iterative, user-driven UI/styling passes on top of stages 1.6/1.7 — requested
directly in many small increments (colors, pixel spacings, breakpoints, icons), each verified
live via `browser-tester` before moving on. Left uncommitted and out of ROADMAP during the
session per the user's standing preference for exploratory styling work; recorded + committed
here in one batch once the user asked. Design fidelity to Figma throughout; no new
functionality or data/RLS/money surface (except the onboarding page→popup structural change
below), so no full review loop — verified via typecheck/lint/format + live browser checks.

- [x] **Button system overhaul** (`components/ui/button.tsx` + `app/styles/base.css` +
  `tokens/effects.css`): gradient-border variant (`primaryOutline`) and gradient-fill
  (`primary`, desktop) via masked pseudo-element + two-layer opacity crossfade utilities
  (`gradient-border`/`gradient-fill` — plain CSS can't transition between two gradients); new
  `outlineArrow` variant (white text / grey border / `justify-between` + trailing arrow badge);
  `ghost`/`outline`/`tertiary` state reworks; `cursor-pointer` + transition tokens
- [x] **`tailwind-merge` fix** (`lib/utils.ts`): register the project's custom `@theme`
  font-size scale (`text-tiny`/`text-h1`/…/`text-body`) as a `font-size` class group, so those
  sizes stop silently conflicting-away when combined with a `text-{color}` class (systemic bug
  found via a mobile label rendering at the wrong size)
- [x] **Registration wizard shared chrome + restyle**: extracted `RegistrationStepHeader` +
  `RegistrationBackLink` (custom arrow SVG), standardized page padding across
  `/sign-up`/`/verify-email`/`/member-profile`/`/build-profile`/`/welcome`; added a minimal
  root `app/layout.tsx` (required so `not-found` renders); `RegistrationProgress` states
- [x] **Dropdown/field family restyle**: new generalized `components/ui/combobox.tsx` (replaces
  `IndustryCombobox`), `LanguagesMultiSelect`/`command`/`select` merged-border + dynamic
  border/chevron color treatment, `chip`/`field-hint`/`InterestsPicker`/`AvatarUpload`,
  `input`/`form`/`textarea` tweaks
- [x] **`WhoIsMindsetterDialog` restyle** (bottom-sheet mobile / centered 30px modal desktop,
  fixed a tailwind-merge `inset-x`-vs-`left` centering bug), **`WelcomeCtas`** button
  variants + custom icons (extracted `components/icons/mindsetter-arrow-icon.tsx`)
- [x] **Header** (`components/layout/Header.tsx`): login UI removed but auth check kept (Join
  hides once signed in), new `JoinIcon`; **`LocaleSwitcher`** cursor
- [x] **Footer full restyle** (`Footer.tsx` + `NewsletterForm.tsx`): 50/30px top radius,
  652px columns block with 190px even columns + responsive shrink (`min-w-0`), heading/gap
  spacings, newsletter field+button single-row, copyright/legal spacings
- [x] **`HeroSection`**: always-on gradient title, spacings, custom play glyph → replaced with
  an embedded test video (YouTube iframe), `+*` required asterisk on the email label, page
  padding; **`HeroEmailCta`** gaps
- [x] **Onboarding: page → popup** (structural): converted `/onboarding` route +
  `OnboardingFlow` into a popup (`components/onboarding/OnboardingDialog.tsx` opened by
  `components/marketing/OnboardingCta.tsx`), deleted the route, repointed `/sign-up` "Back" to
  the homepage; styled per `WhoIsMindsetterDialog`; added a looping physical test video per
  step; `Next` → `primaryOutline`, last-step `Back` hidden on mobile
- [x] Verified live via `browser-tester` at mobile + desktop breakpoints throughout (gradient
  title, footer responsive shrink at 1024px, onboarding popup flow, embedded videos loading)

### 1.9 — Extended Mindsetter onboarding (from Figma "Registration" section)
**Status:** 🔄 In progress
**Started:** 2026-07-18
**Note (2026-07-18):** Implementation is complete and has passed the full review loop
(`code-reviewer`, `security-auditor`, `qa`) plus a live `browser-tester` E2E walkthrough. The
3 architectural blockers listed below were resolved by the developer with **provisional**
decisions, recorded for product-owner review (see the working-notes decision log /
[`docs/mindsetter-extended-onboarding.md`](docs/mindsetter-extended-onboarding.md)). The stage
stays **In progress** until the product owner confirms those decisions.

**Follow-up (2026-07-19 → 2026-07-20):** Long iterative, Figma-driven UI-polish + interaction
pass across the whole flow (roles → superpowers → help → shine → optional blocks → session →
congrats), per ongoing product review. Highlights:
- **Drag-to-reorder migrated from native HTML5 DnD to `@dnd-kit`** (`SortableList` + `useSortable`
  in `CollapsibleCard` and `ReelLifeForm`) so card/photo reordering works on **touch (phones)** and
  keyboard, not just mouse — the old native DnD fired on mouse only and was dead on touch.
  Live-verified (mouse / touch / keyboard).
- **Promo video: real file upload ENABLED** (client → private `promo-video` Storage bucket, migration
  `20260719132834`, owner-scoped RLS + server-side path re-validation) — supersedes the earlier
  "URL-only / upload deferred" provisional decision below.
- **Video blog un-deferred back into MVP and built** (link-only, migration `20260718185944`) —
  supersedes the earlier "EXCLUDED as Phase-2" provisional decision below.
- **Personal session:** "Save and continue" now gates on the Platform-fee-&-payouts consent modal
  when Accept-bookings is on (agree → submit; opening the info button alone does not advance the
  step); searchable timezone picker (418 IANA zones, offset in trigger + list); Free/Paid + price,
  duration, topics, available-days/hours restyled to Figma. (Consent is UI-only local state — no
  `session_terms_accepted` DB flag yet; revisit with the Stripe Connect stage §5.9.)
- **Combobox / multi-select:** fixed the flipped-dropdown (opens-above) border/corner "merged shape"
  via a shared `usePopoverContentSide` hook (`components/ui/popover.tsx`).
- Congrats CTAs, Platform-fee modal, and every optional-block screen restyled to Figma; per-step
  heading icons + shine block-picker icons added.
- Full review loop re-run clean (`code-reviewer` APPROVED, `qa` PASS incl. production build +
  no client-bundle secret leak, `browser-tester` PASS); fixed a `valid` DOM-attribute leak in the
  price field and removed orphaned i18n keys (`blocks.shell.*`, `session.timezoneDetecting`).

Optional extended Mindsetter onboarding per spec §5.2 ("Подовжений онбординг Mindsetter") —
the fork opened by the "Cool, I want to become a Mindsetter" button in `WhoIsMindsetterDialog`
(currently a `/` placeholder). Full field-by-field build prompt drafted 2026-07-18 from the
Figma "Registration" section (via `figma-designer`), cross-checked against the existing
DB/migrations + spec (Opus, 2026-07-18). **Recorded as a plan only — not taken into development
yet.** The full field-by-field implementation prompt (all screens, exact copy, field types,
frame node ids, the A–E decisions/blockers) lives in
[`docs/mindsetter-extended-onboarding.md`](docs/mindsetter-extended-onboarding.md); the decisions
+ blockers are summarized here.

**⚠️ 3 blockers to resolve with the product owner BEFORE any code:**
- [~] **Data model already partly exists and mismatches the design.** `mindsetter_profiles`,
  `session_settings`, `availability_slots`, and `profiles.onboarding_step` were created in
  Stage 0.4 — so this is a *schema-alignment migration*, not a from-scratch build. Mismatches:
  `roles`/`help_with` are `text[]` but the design needs rich cards `[{title, description,
  links[]}]` → `jsonb`; `my_way` is `text` but needs an array of stage objects → `jsonb`;
  `promo_video` (`text`) can't hold upload+YouTube+Vimeo; **no columns exist** for Reel Life
  photos, Video blog, the "Accept bookings" toggle, a weekly available-days/hours schedule
  (`availability_slots` holds concrete timestamp slots, not a recurring weekly pattern), or
  session timezone (provisionally resolved: schema-alignment migrations applied — pending
  product-owner confirmation)
- [~] **How does an account actually become a Mindsetter + where does verification fit?**
  `profiles.account_type` and `mindsetter_profiles.is_public` are staff-only mutations (guard
  triggers) — completing this onboarding does NOT by itself flip the account to Mindsetter or
  publish the profile (§5.4 publishes only after verification). Decide: when/how `account_type`
  flips (service-role Server Action vs staff), where verification (§5.7 LinkedIn+company →
  `verification_requests`) slots in, and what the user sees pre-verification (provisionally
  resolved: `account_type` flips to `'mindsetter'` on core-onboarding completion via
  service-role; `is_public` stays staff-gated and unlocks nothing until verification — pending
  product-owner confirmation)
- [~] **Step numbering is not authoritative in Figma** (no on-screen step indicator; "N/6" only
  in layer names, with duplicate conflicts) — design the progress bar/order ourselves from
  content, reusing `RegistrationStepHeader`/`RegistrationProgress` (provisionally resolved:
  designed a dedicated 5-step progress indicator + a separate
  `mindsetter_profiles.onboarding_step` column — pending product-owner confirmation)

**Core steps (order/copy/fields per the build prompt):**
- [x] Step "Your roles" — Role cards (Title 40 / Description auto-grow 200 / optional Link with
  og-preview + "Add link"); "Add role"; "See how it looks" preview link (profile-preview page
  doesn't exist yet — placeholder)
- [x] Step "Your superpowers" — 3 fixed cards (Title / Description), no "Add"
- [x] Step "You can help with" — Expertise cards (Title / Description) + "Add expertise"; card
  **titles feed** the "Topics you're expert in" multiselect on Personal session
- [x] Step "Personal session" — Accept-bookings toggle, Free/Paid price, "Platform fee &
  payouts" modal (15%/85%, Session Terms consent), duration pills, topics multiselect (≤5, from
  help_with + "Add custom" ad-hoc), timezone, weekly days/hours (maps to session_settings +
  availability_slots — needs schema additions; Stripe backend is a later stage §5.9, so pricing
  UI won't be end-to-end functional yet)
- [x] Step "Make your profile shine" — block-picker (choose which optional blocks to fill now);
  "Skip — fill later from cabinet" (cabinet §5.3 doesn't exist yet — placeholder);
  profile-completeness indicator ("42% · Basic" is a static mock, define a real rule or simplify)
- [x] Optional blocks (only if picked): Promo video, Reel Life (photos + Storage), Numbers,
  My Wins (per-win color), My Way (timeline stages), My F*ckUp(s), My Philosophy, Video blog
  (**"Link your BUILT NOT BURN interview" = Phase 2 / out of MVP — likely exclude or stub**)
- [x] Mindsetter Congrats screen (distinct from the Member one — no "Who is Mindsetter?" popup)
- [x] Save & Continue on every step via `profiles.onboarding_step` (already exists) — partial
  progress saved server-side, resumable
- [x] Silent design-fix cleanups: "Mindseter"→"Mindsetter", "See how in looks"→"See how it
  looks", "Add stage"→"Add f*ckup" in the F*ckUps block, distinct Reel Life vs My Wins descriptions
- [x] Migration(s) via `new-migration`/`supabase-expert` (hosted-only), then full review loop
  (`code-reviewer` + `security-auditor` — new/changed RLS, staff-only flip, Storage uploads +
  `qa` live RLS negatives) + `browser-tester` walkthrough, then commit via `git-manager`

**Provisional decisions pending product-owner review** (details in
[`docs/mindsetter-extended-onboarding.md`](docs/mindsetter-extended-onboarding.md)):
- ~~Video blog ("Link your BUILT NOT BURN interview") **EXCLUDED** as Phase-2/out-of-MVP~~ →
  **reversed 2026-07-19: BUILT (link-only)**, un-deferred back into MVP per product/Figma
- ~~Promo video is **URL-only** for now (file upload deferred)~~ → **reversed 2026-07-19: file
  upload ENABLED** (private `promo-video` Storage bucket + owner-scoped RLS)
- Reel Life "minimum 3 photos" is **informational only** (non-blocking)
- `session_settings` is written via **service-role** during onboarding; public read is
  gated to verified Mindsetters
- Profile-completeness indicator uses a **simple filled/total-fields heuristic** (not the
  static "42% · Basic" mock)

### 1.10 — Public Mindsetter Profile page (`/mindsetters/[username]`)
**Status:** 🔄 In progress — page built, polished, dark-themed, reviewed, and live-E2E-passed
(desktop 1440px + mobile 375px); only future-stage Book-a-Session widget wiring and
provisional/infra items remain before this stage can flip to ✅ Done.
**Started:** 2026-07-20

**Note (2026-07-20):** Implementation built and reviewed. Public route
`app/[locale]/mindsetters/[username]/page.tsx` (RSC, `force-dynamic`), shared
`components/profile/MindsetterProfileView.tsx` + `MindsetterProfileView.module.css`, and
`lib/video-embed.ts` (YouTube/Vimeo URL → embed) — reusing `MemberProfileView`'s now-exported
helpers (`SocialsJson`, `SOCIAL_ICON_MAP`, `INTEREST_CATEGORIES`, etc.). All ~17 Figma sections
built with data-driven visibility (empty jsonb blocks hide their section). Product decisions
applied this pass: Reviews / Invite / CTA banners / micro-navigation = static markup per
product-owner sign-off; "My events" = empty-state placeholder (no events backend yet); Numbers
= wired to real `mindsetter_profiles.numbers` data and hides when empty (product owner
confirmed this is the better interpretation, superseding the earlier "static markup" decision
noted below in the field-mapping checklist); Philosophy replaces bio/tagline in the hero when
`mindsetter_profiles.philosophy` is filled. Private-bucket media (Reel Life photos, promo-video
uploads) is rendered via **service-role signed URLs**, generated server-side only *after* the
visibility gate (public + verified + not blocked / owner / staff) passes — never exposed to
unauthorized viewers.

New migration **`20260720184218_public_mindsetter_profile_anon_read.sql`**: added a
`SECURITY DEFINER` helper `is_public_mindsetter(uuid)` (same precedent as `is_staff`) and
public-read branches to `profiles_read` / `mindsetter_profiles_read` /
`session_settings_read_public` — fixes a critical RLS cascade that made the page 404 for
anonymous visitors. Live-verified on the hosted DB: anon can read a verified + public +
non-blocked mindsetter; unverified / unpublished / blocked / non-mindsetter profiles stay
closed; `/members/[username]` member auth-gating is unaffected. This migration also un-blocked
6 previously-unpushed stage-1.9 migrations (all now pushed to hosted).

Review loop resolved a **Critical stored-XSS** in `role.links[].url` (write-side
`roleLinkSchema.url` now `.refine(isHttpUrl)`; read-side `isSafeHttpUrl` filter before
rendering) and Medium/Low RLS hardening (`session_settings` read policy now requires
`is_public`; `mindsetter_profiles_read` now also checks `is_blocked`). Full review loop
re-run clean: `code-reviewer` APPROVED, `security-auditor` clean, `qa` PASS (build +
migrations + live RLS negative tests + no client-bundle secret leak).

**Note (2026-07-20, polish + dark theme):** Pixel-polish pass and a full dark-theme
conversion are now done and reviewed — all committed after passing code-review + a live
`browser-tester` E2E on hosted-seeded data, both desktop 1440px and mobile 375px:
1. **Roles → accordion**: extracted `components/profile/RolesAccordion.tsx` (`'use client'`)
   with expand/collapse (Figma indeterminate-circle-fill/add-circle-fill glyphs), preserving
   the `isSafeHttpUrl` XSS filter on role links. (commit `a8a1c8c`)
2. **Eyebrow icons**: replaced temporary lucide placeholders (Roles/Topics/Superpowers/Help/
   Reviews) with real Figma-vector icons in `components/icons/mindsetter-eyebrow-icons.tsx`.
   (commit `a8a1c8c`)
3. **CTA banners**: refined to the real Figma treatment (turned out NOT a photo background —
   solid dark + blue glow + gradient-text heading via `--gradient-primary` + a bordered price
   pill with a new `CashFillIcon`), price binding intact. (commit `a8a1c8c`)
4. **Mobile frame `187:4294`** verified node-by-node — Reel Life mobile fixed to a horizontal
   carousel; hero/typography/Topics-desktop-only/Numbers-grid confirmed already correct.
   (commit `a8a1c8c`)
5. **Dark theme conversion** (the big one): the whole page was wrongly implemented light
   (inherited from Member Profile); re-themed all sections to the Figma dark design (black
   background, white/gradient text) reusing the app's existing dark design tokens
   (`--color-background/foreground/card/muted-foreground/border/primary/success`,
   `--gradient-primary`) rather than hardcoding — Figma's named fill styles mapped 1:1 to
   these tokens. Gradient headings (h1 name, section h2s, My Way years) via
   `--gradient-primary` + `background-clip: text`. `MemberProfileView` (the separate LIGHT
   Member page, stage 1.6) left untouched. All behaviors/security preserved.
   - Code-review APPROVED (theme-only, no regressions, XSS filters intact); the two optional
     cleanups it flagged (hardcoded `#ffffff` → `var(--color-foreground)`; My Way description
     muted color restored) were applied.
   - Browser E2E PASS: dark background + white/gradient text confirmed, WINS colored cards
     legible, accordion works, all sections render, mobile responsive with no overflow,
     not-found renders clean.

**Polish / follow-up — status:**
- [x] CTA banners refined to the real Figma treatment (gradient-text heading + price pill —
  turned out not a photo-background treatment after all, see note above)
- [x] Roles now render as an accordion (expand/collapse), matching the Figma interaction
- [x] Eyebrow icons replaced with real Figma vectors (Roles / Topics / Superpowers / Help /
  Reviews)
- [x] Mobile frame `187:4294` verified node-by-node against the build
- [x] Full `browser-tester` E2E across breakpoints run live on hosted-seeded data (desktop
  1440px + mobile 375px) — PASS
- [x] Dark-theme conversion (page was wrongly light, now matches the Figma dark design) —
  reviewed and E2E-verified
- [~] Book-a-Session booking widget end-to-end wiring — still deferred to the dedicated
  §5.8/§5.9 booking stage, out of this stage's scope
- [~] Route slug `/mindsetters/[username]` — still provisional; spec doesn't mandate an exact
  slug
- Known limitation carried over from Member Profile (stage 1.6): `notFound()` on this route
  likely also returns HTTP 200 instead of 404, root-caused to the shared app-wide
  `app/[locale]/loading.tsx` streaming boundary — cross-cutting, deferred, not a new blocker
- Minor/unrelated infra: a stray `.claude/worktrees/stage-1.6-mobile` worktree pollutes
  `npm run lint`; `eslint.config.mjs` ignore should be `**/.next/**` — separate infra ticket,
  not part of this stage

Public, spec §5.4 "Публічний профіль Mindsetter" page: "Усі секції + «Мої події» · CTA Watch me / Book a Session / Invite (sticky, повтори) · окремий флоу Invite · мікро-навігація · адаптив. Публікується після верифікації (`is_public = true`)." Route naming mirrors the existing `/members/[username]` (Member Profile, stage 1.6) for consistency, but the ACCESS MODEL is opposite: `/members/[username]` requires a signed-in session (`middleware.ts` `PROTECTED_PREFIXES`); this page is spec-mandated **unauthenticated-public** — must NOT be added to `PROTECTED_PREFIXES`. Visibility gating: `profiles.account_type = 'mindsetter' AND mindsetter_profiles.is_public = true AND profiles.is_blocked = false`, OR the profile owner (any state, sees the preview banner — same UX pattern as `/dashboard/profile`), OR staff. Everyone else / nonexistent username → `notFound()` (note: `/members/[username]` has a known `notFound()`-returns-HTTP-200 bug from the shared `app/[locale]/loading.tsx` streaming boundary — likely recurs here, same deferred fix applies, not a new blocker).

**Figma research (via `figma-designer`, 2026-07-20):** found on "Page 1" — `327:1080`/`383:2070` (Full Profile desktop, 1440×12510, vertical/horizontal promo-video variants, content identical), `383:2830` (Short Profile desktop, 1440×5262), `383:3590` (Short Profile + reviews, 1440×6051), `383:4089` (own-preview state, 1440×5340), `187:4294`/`401:7567` (mobile, 375×~9850, near-duplicates). Working theory: Short vs Full aren't separate frozen designs but the SAME page conditionally rendering sections based on which optional onboarding blocks (`mindsetter-onboarding` "shine" step) the Mindsetter chose to fill — mirrors the data-driven-visibility pattern already established there. Own-preview state (`383:4089`) mirrors `/dashboard/profile`: banner "Public viev — this is how others see your profile" (typo "viev" in Figma, same typo class already fixed once for the Member Profile — fix here too) + Edit Profile/Share Profile buttons replacing visitor CTAs. Mobile mockup for the preview banner looks like an unfinished/mixed iteration (toolbar always shown at top rather than a full state swap like desktop) — flag for designer clarification during build.

**⚠️ Open questions / blockers to resolve before or at the start of implementation:**
- [~] Route slug: `/mindsetters/[username]` — provisionally chosen to mirror `/members/[username]`; spec doesn't mandate an exact slug
- [x] **Reviews section** (Figma has it; NO backing DB table, not mentioned in spec §5.4) — DECIDED (product owner, 2026-07-20): confirmed static markup only (статична верстка), no data wiring, no `reviews`/`testimonials` table
- [x] **"Мої події" (My events)** — RESOLVED (product owner, 2026-07-20): no events backend exists yet, so the section is built as an **empty-state placeholder**; real data wiring deferred to whenever the events feature lands
- [~] **Booking widget vs static CTA** — built as a static/teaser "Book a Session" CTA this stage (same precedent as Member Profile's static Edit/Share buttons); full 1:1 booking flow (§5.8) and Stripe payments (§5.9) wiring is still deferred to the dedicated booking stage (OPEN — not this stage's scope)
- [x] **Invite flow** — DECIDED (product owner, 2026-07-20): "Invite to event" CTA + the separate Invite scenario are markup/layout only (статична верстка) this stage, no real invite backend wiring
- [x] **Philosophy section** (`mindsetter_profiles.philosophy` exists in DB, listed in spec §5.3) — DECIDED (product owner, 2026-07-20): not a separate section — a conditional hero swap: when `philosophy` is filled, render it in the hero IN PLACE OF `bio`/`tagline`; otherwise fall back to `bio`. Resolves the earlier "not spotted in Figma" question.
- [x] **Micro-navigation + sticky CTA repeats** (spec-required) — DECIDED (product owner, 2026-07-20): markup/layout only (статична верстка) this stage, no real scroll-spy/behavior wiring required
- [x] "Built Not Burn · Interview" section → maps to `mindsetter_profiles.video_blog` (jsonb: youtube/vimeo), already built in stage 1.9 (product-owner-reversed decision, link-only) — noting this despite CLAUDE.md's general "BUILT NOT BURN = out of MVP" guidance, since it's already shipped data-model-wise; not a new decision, just flagging the discrepancy for awareness
- Depends on stage 1.9's data model (`mindsetter_profiles`, `session_settings`) — 1.9 is still 🔄 In progress pending product-owner confirmation of its own 3 provisional decisions (see that section); doesn't block this stage's planning but should ideally be confirmed before/alongside implementation
- Remaining open items: Book-a-Session widget end-to-end wiring (deferred to §5.8/§5.9 booking
  stage) and the final route slug confirmation — the rest were resolved during this build.

**Field-mapping checklist (Figma section → data source):**
- [x] Hero: `avatar_url`, `verification_status` (badge), `username`, `full_name`+`last_name`, `bio`/`tagline` (overridden by `mindsetter_profiles.philosophy` when that field is filled — show philosophy instead of bio/tagline; fall back to bio otherwise, see Philosophy decision below), `industry`, `company`, `job_title`/`role`, `location` (country/city), `languages`, `socials` (jsonb) + website — reuse `SocialsJson`/`SOCIAL_ICON_MAP` from `MemberProfileView.tsx` (Figma mockup shows duplicate Facebook/Threads icons — mockup bug, ignored); static Invite/Book CTAs; intro-video play button wired via `lib/video-embed.ts`
- [x] Roles → `mindsetter_profiles.roles` (jsonb: title/description/links[]) — link URLs sanitized (`isSafeHttpUrl`) after the XSS fix
- [x] "Topics I'm expert" pills (desktop-only in Figma) → `session_settings.topics` (text[])
- [x] Superpower(s) → `mindsetter_profiles.superpowers` (jsonb, fixed 3)
- [x] Promo video → `mindsetter_profiles.promo_video` (jsonb: youtube/vimeo/videoPath) — private-bucket video paths served via service-role signed URLs
- [x] Numbers → **REVISED 2026-07-20** (product owner): wired to real `mindsetter_profiles.numbers` (jsonb) data and hides when empty — supersedes the earlier "static markup only" decision, confirmed as the better interpretation
- [x] "What can I help with" → `mindsetter_profiles.help_with` (jsonb)
- [x] CTA banners ×2 (session price Free/$paid) → `session_settings.session_type` + `price_cents`/`currency` — built as gradient cards, not the Figma photo-background treatment (polish follow-up)
- [x] Reviews — built as static markup, no data wiring, per decision above
- [x] REEL LIFE → `mindsetter_profiles.reel_life` (jsonb, private Storage bucket paths) — served via service-role signed URLs generated after the visibility gate
- [x] My Way → `mindsetter_profiles.my_way` (jsonb)
- [x] Built Not Burn · Interview → `mindsetter_profiles.video_blog` (jsonb) — already built, see above
- [x] My F*ckUp(s) → `mindsetter_profiles.fckups` (jsonb)
- [x] My WINS → `mindsetter_profiles.wins` (jsonb, per-win color enum)
- [x] Philosophy → `mindsetter_profiles.philosophy` (text) — rendered in the hero IN PLACE OF `bio`/`tagline` when filled, fallback to `bio` otherwise (not a separate section), see blocker above
- [x] Beyond Business → `profiles.interests` (reuse `INTEREST_CATEGORIES` grouping, same as `MemberProfileView`)
- [x] My events → built as an empty-state placeholder (no events backend yet), see blocker above
- [x] Footer → reuse the existing site `Footer` component (Figma shows an unedited Relume placeholder footer — ignored its mockup copy)

**Next steps:** core build, full review loop (`code-reviewer`, `security-auditor`, `qa`), the
Figma-precision polish pass, the dark-theme conversion, and a live `browser-tester` E2E pass
across breakpoints (desktop 1440px + mobile 375px) on hosted-seeded data are all done — see
"Polish / follow-up" above. Remaining before this stage can flip to ✅ Done: Book-a-Session
widget end-to-end wiring (stays deferred to the §5.8/§5.9 booking stage, out of this stage's
scope), confirming the final route slug, and the unrelated infra lint ticket.

### 1.11 — Homepage placeholder (Figma "Заглушка") + waitlist form
**Status:** ✅ Done
**Started:** 2026-08-05
**Completed:** 2026-08-05

Replaced the homepage (`app/[locale]/page.tsx`, previously `HeroSection`) with a "coming soon"
placeholder page built from the Figma frame "Заглушка" (`866:4823` desktop / `866:4885` mobile):
hero headline/subtext + a contact-form card (First name / Email / LinkedIn-or-Instagram / "Apply
to Join"), with a "Thank you" success state (`870:4928`/`870:4977`) after submit. Required a
route-group split (`app/[locale]/(app)/` for all pre-existing routes with the full Header/Footer;
homepage stays outside it with a minimal Header/Footer) plus a new `variant?: 'full'|'minimal'`
prop on the shared `Header`/`Footer` components (default `'full'` unchanged everywhere else).

- [x] Migration `supabase/migrations/20260805181705_homepage_waitlist.sql`: `homepage_waitlist`
  table (first_name, email, social_link, timestamps), case-insensitive unique index on email,
  RLS with **no client insert/update policy at all** (writes are service-role-only), staff-only
  select/delete via `is_staff()`. Verified live against the hosted project: anon INSERT → 42501
  blocked, anon SELECT → empty, duplicate email → 23505.
- [x] Zod schema (`lib/validation/homepage-waitlist.ts`) + Server Action `submitHomepageWaitlist`
  (`app/[locale]/actions.ts`) — rate-limited (`marketing:homepage-waitlist`, 5/10min/IP),
  service-role INSERT, catches `23505` for a friendly "already submitted" inline error instead
  of upserting.
- [x] Route-group split: all pre-existing routes moved into `app/[locale]/(app)/*` under a new
  `(app)/layout.tsx` (full Header/main/Footer); root `app/[locale]/layout.tsx` now just renders
  `{children}`; route groups don't change URLs (verified, e.g. `/sign-up`/`/login` unchanged).
- [x] `variant?: 'full'|'minimal'` prop added to `components/layout/Header.tsx`/`Footer.tsx`
  (minimal header = centered logo only; minimal footer = logo + copyright "Credits" row only).
- [x] Homepage placeholder: `components/marketing/HomepagePlaceholder.tsx` (hero + decorative
  glow + Thank-you state) + `components/marketing/WaitlistFormCard.tsx` (form card, client-side
  swap to Thank-you on success), pixel-matched against Figma frames `866:4823`/`866:4885` (form)
  and `870:4928`/`870:4977` (Thank you) by `figma-designer`. Homepage (`app/[locale]/page.tsx`)
  sits outside `(app)` with its own `error.tsx`/`loading.tsx` boundary.
- [x] i18n keys `home.placeholder.*` added to `messages/en.json`/`es.json`.
- [x] Removed now-dead code superseded by the new placeholder: `HeroSection.tsx`,
  `OnboardingCta.tsx`, `HeroEmailCta.tsx`, the `recordSignupIntent` Server Action + its
  `marketing:signup-intent` rate-limit bucket, `lib/validation/leads.ts`, and the `home.hero.*`
  i18n keys (stage 1.7's lead-capture flow had no remaining caller).
- [x] Review loop: `code-reviewer` (returned for rework once — missing error/loading boundary +
  dead code — fixed and re-verified), `security-auditor` (clean), `qa` (build/typecheck/lint
  clean, live RLS/unique-constraint verification + live end-to-end Server Action submission
  test on the hosted project including the duplicate-rejection path, secret-leak clean),
  `browser-tester` (live E2E pass desktop+mobile: placeholder renders, minimal header/footer
  scoped only to `/`, full header/footer intact elsewhere, happy-path submit + duplicate-email
  rejection + client-side invalid-email validation confirmed, no console/network errors).

### 1.6 — Member Profile view page (self + any-member-by-username)
**Status:** ✅ Done
**Started:** 2026-07-15
**Completed:** 2026-07-15

> **Scope grew significantly during implementation.** Originally briefed as a narrow hero
> block (avatar/name/bio/role-industry-company badges/static buttons). Live Figma extraction
> of frames `383:4667` (public) + `401:6375` (preview) revealed one cohesive "Member Profile"
> page, so the built scope covers the whole page, not just the hero. It also flipped from
> "public, no login required" to **auth-gated for any registered member** (a product decision
> made once the full page — and its RLS implications — became clear), and a security review
> during the loop found the app-layer gating alone didn't block direct anonymous Supabase REST
> API access, closed with a dedicated RLS migration.

The full "Member Profile" page from Figma (`383:4667` public / `401:6375` preview) — not just
the originally-scoped narrow hero block: verified badge + `@handle`, name (`full_name` +
`last_name`), bio, three badges in Figma's actual order **Industry → Company → Role** (not
the originally-briefed Role/Industry/Company), a static "Invite to event" button, location
(`country`/`city`) + languages, social links (`profiles.socials`, scheme-restricted to
http/https to close a stored-XSS vector found in review), a large portrait (`avatar_url`),
an "ABOUT" card (`profiles.about`), and a "What I care about beyond work" interests section
grouping `profiles.interests` by category via the existing `lib/constants/interests.ts`
catalog. Light-theme content section deliberately matching Figma's white background (not the
app's dark theme), isolated in its own CSS Module
(`components/profile/MemberProfileView.module.css`) — a new pattern for this codebase, first
use of CSS Modules here. Two routes sharing one component: `/dashboard/profile` (self-view,
shows the preview banner + Edit Profile/Share Profile buttons) and `/members/[username]` (any
other member's profile, no banner/buttons). Both routes require an authenticated session
(product decision: visible to any REGISTERED member, not anonymous visitors, editing reserved
for the profile owner) — enforced at both the Next.js layer (`middleware.ts`) AND the database
layer (a new migration tightened the `profiles_read` RLS policy to require
`auth.uid() is not null`, after a security review found the app-layer gating alone didn't
block direct anonymous Supabase REST API access). Edit Profile / Share Profile / Invite to
event are static UI only, no behavior yet.

- [x] `figma-designer`: pulled "Member Profile" frames `383:4667` (public) + `401:6375` (preview) — desktop 1440px only, no mobile variant exists for the preview frame in the Figma file (flagged as a gap, typography hints borrowed from a related mobile frame for a best-effort responsive pass)
- [x] Shared `MemberProfileView` component (avatar/name/bio/badges/About/interests/static buttons) + dedicated CSS Module
- [x] `/dashboard/profile` route (self-view, auth-gated)
- [x] `/members/[username]` route (any-member view, auth-gated — not anonymous-public; renamed from `/profile/[username]`, then from `/member/[username]`)
- [x] i18n keys (`profile` namespace, en + es)
- [x] Migration: tightened `profiles_read` RLS to require authentication (`supabase/migrations/20260715194801_profiles_read_require_auth.sql`)
- [x] Fixed a stored-XSS gap in social-link URLs (write-time Zod scheme restriction + read-time render guard)
- [x] Review loop (code-reviewer, security-auditor ×2, qa ×2) — all passed; live-verified against the hosted DB

**Known limitation:** `notFound()` on `/members/[username]` for a nonexistent username renders
the correct not-found UI but returns HTTP 200 instead of 404 — root-caused to the app-wide
`app/[locale]/loading.tsx` streaming boundary flushing the response before the status can
change (confirmed by temporarily removing it and observing the status correctly flip to 404).
Fixing this properly requires restructuring that ambient loading boundary across the whole app
(broad blast radius), deferred as a follow-up rather than blocking this stage.

### 1.12 — Figma alignment pass: welcome/congrats/hero/404 + legal pages
**Status:** 🔄 In progress
**Started:** 2026-08-18

Pixel-alignment pass against Figma across several existing screens plus three brand-new legal
pages, done alongside the ongoing 1.9 mindsetter-onboarding work.

- [x] Section-preview tooltip in profile settings (`components/dashboard/SectionPreviewHint.tsx`)
  — white panel, black label, borders per Figma `985:13168`; black backdrop behind the mockup
  (PNG exports are transparent, so light text was getting lost on a white background)
- [x] `/welcome` — two-phase congrats screen per Figma. Phase 1 — frame `387:3000` ("Your Member
  application has been received"): white pill "What's the difference…" (opens
  `WhoIsMindsetterDialog`), `WelcomeMindsetterPitchCard` card, Apply for Mindsetter / Continue
  as Member / Learn more buttons. Phase 2 — frame `421:3798` ("You are now a member of the
  community"): three Member CTAs + "See how looks my profile page". Switched via the "Continue
  as Member" button (`WelcomeScreen.tsx`, local state, not persisted). Restored
  `WhoIsMindsetterDialog` from git, removed `WhoIsMindsetterPanel`. Gradient added on
  "Congratulations!"
- [x] `/mindsetter-onboarding/congrats` — rebuilt per frame `400:5587` (mobile `261:4319`): block
  order fixed to "See how looks my profile page" → video → Find/Invite. Added a working video
  block by reusing `PromoVideoPlayer` (test YouTube embed, `CONGRATS_VIDEO_EMBED_URL` constant —
  to be swapped for the real one), `aspect-video`
- [x] Homepage (hero) — rebuilt per frame `1112:17898` (mobile `1112:19307`): new heading/
  subheading, 580px column, legal row with two links. Removed the video block and tour button
  from the hero (hidden on the frame). `OnboardingCta` is left without an entry point (the tour
  itself is still reachable from `/mindsetter-onboarding/roles`)
- [x] Three legal pages (NEW): `/privacy-policy`, `/terms-of-use`, `/cookies-policy` on a shared
  `components/legal/LegalPage.tsx`, frames `1112:26877` / `1112:27066` / `1112:27271`. Light
  theme (white content panel on a black banner), 1300px column, auto `mailto` links, centered
  list markers. Wired into the footer and into the homepage legal row
- [x] 404 — rebuilt per frame `1112:27458` (mobile `1154:16573`): gradient digits, card
  overlapping the digits, two buttons. Added a catch-all `app/[locale]/[...rest]/page.tsx` so
  404 gets the header/footer. Fixed a bug where `globals.css` wasn't loading on the root 404
  (import moved into `app/layout.tsx`)
- [x] Scroll-to-top button (NEW) — `components/layout/ScrollToTopButton.tsx` per frame
  `1133:31269`, appears after 800px of scroll, respects `prefers-reduced-motion`
- [x] Header — "Join" → "Apply to Join" (links to `/`), added "Log in", 32px gap, element
  alignment

**Known limitations / follow-ups:**
- Legal copy is **not translated into Spanish** — `messages/es.json` still has the English
  strings (machine-translating Terms/Privacy is legally risky; needs a legal translator)
- The mobile Privacy Policy frame in Figma has shorter wording than the desktop frame — the
  desktop (fuller) version is what's rendered; needs legal confirmation
- "Cookies Settings" in the footer links to a static document page (`/cookies-policy`); the
  interactive "Manage Cookie Preferences" consent manager frame from Figma was built in stage
  1.13 (`components/cookies/`), but no entry point is mounted for it yet — see 1.13's known
  limitations
- `Learn more`, `See example`, the three Member CTAs on `/welcome`, and the event CTA on congrats
  are `ComingSoon` stubs — no routes behind them yet
- The intended behavior of the "Continue as Member", "Log in / Sign up" (404), and Back buttons
  on `/welcome` is not confirmed by the Figma prototype
- `MAX_PROMO_VIDEO_SIZE_BYTES` / `ACCEPTED_PROMO_VIDEO_MIME_TYPES` in
  `lib/validation/mindsetter.ts` became dead code after video upload was removed (2026-08-05)
- Legal pages are under `noindex` (product-owner decision: keep it that way until launch, change
  before release)

### 1.13 — Main page Figma alignment (full section pass) + cookie consent
**Status:** ✅ Done
**Started:** 2026-08-31
**Completed:** 2026-09-02

Section-by-section pixel-alignment pass across the entire homepage against Figma, plus a
brand-new cookie-consent feature (banner + settings manager), done alongside several
cross-cutting fixes surfaced along the way. Branch:
`feature/stage-1.13-main-page-polish-cookie-consent`.

- [x] Banner section — gradient H1, "ONLY" pill (gradient fill + border), full-width map
- [x] Video block — click-to-load facade backed by `youtube-nocookie`
- [x] "Three ways to start" section
- [x] "The people you'll actually talk to" (Top Mindsetters) section
- [x] "Networking formats we offer" (Events) section
- [x] "Mindsetis Ambassadors" section — working tab filtering + horizontal tab scroll on mobile
- [x] FAQ section — new `FaqAccordion` client component replacing the non-animating `<details>`
  element; two independent columns so expanding an item on the left doesn't shift the right
  column
- [x] "MINDSETIS ORIGINALS" section (NEW)
- [x] AI-search block
- [x] Cross-section background-glow layer (`MainPageSection`) + exported PNG masks
- [x] New components: `FaqAccordion`, `MindsetisOriginalsSection`, `AmbassadorsRegionCarousel`,
  `AmbassadorApplicationDialog` (visual-only ambassador-application flow, no persistence),
  `WhatIsMindsetisVideo`, `faq-chevron-icon`
- [x] New assets: 8 country-flag SVGs vendored from the `flag-icons` package (MIT, no new
  dependency added) into `public/images/flags/` — Windows has no colored-emoji country flags;
  background glows; Originals/Events photos
- [x] Cookie consent (NEW): `lib/cookies/consent.ts` (types, versioned cookie, Zod-validated
  parser), `lib/cookies/server.ts` (SSR read so the banner doesn't flash), `components/cookies/`
  (provider, banner, settings modal, `ConsentGate`, `CookieSettingsTrigger`) — 4 categories,
  "Strictly Necessary" genuinely `disabled`; wired into `app/[locale]/layout.tsx`
- [x] Fixed descender clipping ("y"/"g"/"p") on all 9 homepage gradient headings —
  `background-clip: text` only paints within the padding-box
- [x] Fixed a black gap between the cabinet side-nav background and the footer on tall screens
  (`app/styles/base.css`, new rule via `:has([data-cabinet-shell])`)
- [x] Cabinet header: `Become a Mindsetter` / `View public profile` placement matched to the
  design (one action per role); responsive rework so the Member row starts at `xl` (previously
  didn't fit)
- [x] Scroll-to-top button moved into the root layout — it was missing entirely on the homepage
  because that page sits outside the `(app)` route group
- [x] Added `app/icon.svg` — clears the one remaining console error (404 on `favicon.ico`)
- [x] Gates clean: `build`, `tsc`, `eslint`, `prettier` all pass
- [x] `browser-tester` live checks passed

**Known limitations / follow-ups:**
- No entry point exists yet to reopen consent settings once a choice has been made —
  `CookieSettingsTrigger` exists but isn't mounted anywhere (hidden per product-owner request).
  The banner's "Manage" button only shows while a decision is still pending; the footer's
  "Cookies Settings" link goes to the static `/cookies-policy` document. Consent currently
  cannot be revoked — needs a home before launch.
- `ConsentGate` is unused so far — the project has no optional/non-essential cookies yet. Built
  ahead of time for the first analytics script.
- No server-side consent log — only a timestamped browser cookie, which is insufficient as legal
  proof of consent.
- No Google Consent Mode — will be needed if GA/Ads are added later.
- The `NEXT_LOCALE` cookie is set but never read (`localeDetection: false`, see `docs/I18N.md`);
  under our own category mapping it's "Functional," which was never consented to — should be
  turned off.
- The "Strictly Necessary" category description mentions "your cart" — the product has no cart;
  this is verbatim Figma copy, kept as designed but the wording should be revisited.
- Cabinet header for the Mindsetter role still doesn't fit at 1024px by calculation (~629px
  needed vs. 516px available) — left as-is per an explicit product-owner instruction not to
  touch it.
- Cabinet header adaptive states between `md` and `xl` aren't drawn in Figma at all — this is our
  own degradation, not a reproduction of the design.
