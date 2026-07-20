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
shows the preview banner + Edit Profile/Share Profile buttons) and `/member/[username]` (any
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
- [x] `/member/[username]` route (any-member view, auth-gated — not anonymous-public; renamed from `/profile/[username]`)
- [x] i18n keys (`profile` namespace, en + es)
- [x] Migration: tightened `profiles_read` RLS to require authentication (`supabase/migrations/20260715194801_profiles_read_require_auth.sql`)
- [x] Fixed a stored-XSS gap in social-link URLs (write-time Zod scheme restriction + read-time render guard)
- [x] Review loop (code-reviewer, security-auditor ×2, qa ×2) — all passed; live-verified against the hosted DB

**Known limitation:** `notFound()` on `/member/[username]` for a nonexistent username renders
the correct not-found UI but returns HTTP 200 instead of 404 — root-caused to the app-wide
`app/[locale]/loading.tsx` streaming boundary flushing the response before the status can
change (confirmed by temporarily removing it and observing the status correctly flip to 404).
Fixing this properly requires restructuring that ambient loading boundary across the whole app
(broad blast radius), deferred as a follow-up rather than blocking this stage.
