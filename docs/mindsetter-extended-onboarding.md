# Extended Mindsetter Onboarding — Build Prompt

> Detailed implementation reference for **ROADMAP stage 1.9** (extended Mindsetter onboarding,
> spec §5.2 "Подовжений онбординг Mindsetter"). Recorded as a plan — **not yet in development**.
> Source: Figma "Registration" section (file "Mindsetis (Copy)", Page 1), read via
> `figma-designer` 2026-07-18, cross-checked against the existing DB/migrations + spec (2026-07-18).
> ROADMAP holds the short decision/blocker summary; this file holds the full field-by-field detail,
> exact copy, and Figma frame node ids so the build doesn't need to re-derive them.

This is a NEW registration stage. Take it into roadmap (todo-jobs) before starting, work through the
normal review-loop (code-reviewer + security-auditor + qa), commit only after a clean pass.

═══════════════════════════════════════════════════════════════════════════════

## ⚠️ 3 blockers to resolve BEFORE writing code

═══════════════════════════════════════════════════════════════════════════════

Not styling details — architectural decisions. If unresolved, the builder will either duplicate
existing tables or hit staff-only columns. Details in sections A/B/C.

1. **DATA MODEL ALREADY EXISTS** and partly mismatches the design (section A). Tables
   `mindsetter_profiles`, `session_settings`, `availability_slots` and column
   `profiles.onboarding_step` already exist (Stage 0.4 migrations). Some column types conflict with
   the design (text[] instead of jsonb for Roles/Expertise cards; text instead of jsonb for My Way;
   no columns for Reel Life / Video blog / weekly schedule / timezone / Accept bookings). First a
   schema-alignment migration, not "create from scratch".

2. **HOW DOES AN ACCOUNT BECOME A MINDSETTER + WHERE IS VERIFICATION** (section B).
   `profiles.account_type` and `mindsetter_profiles.is_public` can only be changed by staff (guard_*
   triggers). So completing this onboarding does NOT by itself make the user a Mindsetter or publish
   the profile. Decide with the product owner: when/how `account_type` flips, where §5.7 verification
   (LinkedIn + company) slots in, what the user sees pre-verification.

3. **STEP NUMBERING IS NOT FROM FIGMA** (section C). No on-screen step indicator exists; "N/6" is only
   in layer names, with duplicate conflicts. Design the order + progress bar ourselves (by content),
   don't copy "N/6" literally.

═══════════════════════════════════════════════════════════════════════════════

## A. DATA MODEL — what exists / what to migrate (verified against migrations 2026-07-18)

═══════════════════════════════════════════════════════════════════════════════

Already exists (`20260701100100_profiles.sql`, `20260701100200_sessions.sql`):

- `profiles.onboarding_step int default 0` — ALREADY EXISTS (on `profiles`, NOT mindsetter_profiles).
  Save & Continue uses this. Do NOT add a new column.
- Table `mindsetter_profiles` (id, roles, superpowers, promo_video, numbers, help_with, wins, my_way,
  fckups, philosophy, is_public) — EXISTS, with RLS + staff-only guard on is_public.
- Tables `session_settings` (mindsetter_id, session_type, duration_min, topics text[], price_cents,
  currency) and `availability_slots` (concrete timestamp slots) — EXIST, with RLS.

Schema-vs-design mismatches (migration needed):

| Field / block      | DB now | Design needs                             | Action                                                                |
| ------------------ | ------ | ---------------------------------------- | --------------------------------------------------------------------- |
| roles              | text[] | [{title, description, links:[{url,og}]}] | ALTER → jsonb                                                         |
| help_with          | text[] | [{title, description}] (titles→topics)   | ALTER → jsonb                                                         |
| my_way             | text   | [{project, description, year_from,to}]   | ALTER → jsonb                                                         |
| superpowers        | jsonb  | [{title, description}]                   | ok                                                                    |
| numbers            | jsonb  | [{value, label}]                         | ok                                                                    |
| wins               | jsonb  | [{year, win, description, color}]        | ok (jsonb holds color)                                                |
| fckups             | jsonb  | [{story}]                                | ok                                                                    |
| philosophy         | text   | one quote                                | ok                                                                    |
| promo_video        | text   | upload-video + YouTube + Vimeo           | one field insufficient: → jsonb or separate cols + Storage for upload |
| Reel Life (photos) | none   | photo array (min 3) + Storage bucket     | new jsonb/text[] column + Storage bucket + policy                     |
| Video blog         | none   | YouTube + Vimeo URL                      | new column (BUT see section D — likely out of MVP)                    |

Personal session (section 5) maps to `session_settings` + `availability_slots`, also missing fields:

- "Accept bookings" toggle — no column (add e.g. `accepts_bookings boolean`).
- Weekly schedule (Available days Mo–Su + hours from–to) — `session_settings` has none, and
  `availability_slots` holds CONCRETE timestamp slots, not a recurring weekly pattern. Either a new
  weekly-schedule structure, or generate availability_slots from the weekly pattern — decide with product.
- timezone — no column (add).
- topics text[] — ok for the chosen topics (≤5 + custom), BUT the option source = titles from
  `mindsetter_profiles.help_with` (sections 4/5).

Migrations via `new-migration` skill / `supabase-expert`, hosted-only (`npm run db:push`), RLS in the
same migration, then `npm run db:types`. Money-adjacent fields (price_cents etc.) written server-side,
no client write policies on sensitive columns.

═══════════════════════════════════════════════════════════════════════════════

## B. HOW AN ACCOUNT BECOMES A MINDSETTER + WHERE VERIFICATION FITS (decide before build)

═══════════════════════════════════════════════════════════════════════════════

Existing migrations hard-limit:

- `profiles.account_type` ('member'|'mindsetter') — trigger `guard_profiles_protected_columns` allows
  changes only by staff or service_role. A self-update throws.
- `mindsetter_profiles.is_public` → true — trigger `guard_mindsetter_profiles_is_public`, also staff/
  service_role only. Public profile (§5.4) opens after verification.

Consequence: completing this onboarding does NOT by itself make the user a Mindsetter or publish the
profile. The design ("We're building your personal site", congrats "You are now a mindsetter", "See how
looks my profile page") doesn't show this.

Questions for the product owner (do NOT decide silently):

1. When does account_type become 'mindsetter' — right after onboarding (flip via a service-role Server
   Action), or only after staff verification?
2. Where in the flow is §5.7 verification (LinkedIn + company + details → `verification_requests`, admin
   queue)? Figma's onboarding shows no verification step — it's either absent here or separate. Clarify.
3. What does a fresh Mindsetter see pre-verification: congrats immediately (profile stays
   is_public=false until review), or block congrats until verified?

Most likely MVP option (confirm): onboarding fills mindsetter_profiles + session_settings via a
service-role Server Action, sets account_type='mindsetter', shows congrats; profile stays is_public=false
until manual staff verification. But this is a product decision, not mine.

═══════════════════════════════════════════════════════════════════════════════

## C. STEP NUMBERING / PROGRESS (not from Figma)

═══════════════════════════════════════════════════════════════════════════════

Figma check (2026-07-18): no on-screen step indicator in the Mindsetter flow; "N/6" only in layer names
with direct duplicate conflicts (two different screens both named "3/6"; optional blocks "5/6" on mobile,
same ones "6/6" on desktop). "Personal session" has no reliable number.

So: take the logical order from the content (below), and design the progress bar/step counter ourselves
(reuse `RegistrationProgress`/`RegistrationStepHeader` like the Member wizard). Core steps (1–?) always
run; optional blocks (section 7) only the ones picked on the block-picker. Fix the exact "core step count"
for the progress bar at build time (likely 5: Roles, Superpowers, You-can-help-with, Personal session,
Make-your-profile-shine); either exclude optional blocks from the main progress or show a separate sub-progress.

═══════════════════════════════════════════════════════════════════════════════

## D. DEPENDENCIES ON NOT-YET-BUILT PARTS (flag, don't block the build)

═══════════════════════════════════════════════════════════════════════════════

- "Skip — fill later from cabinet" — the cabinet (§5.3) doesn't exist yet. Button has nowhere to go
  (placeholder `/`, like other stubs of this stage) — leave a TODO.
- Profile preview ("See how in looks" on Roles; "See how looks my profile page" on congrats) — the public
  Mindsetter profile page doesn't exist yet. Placeholder link.
- "Personal session" pulls in monetization (15%/85%, payout, Session Terms) — the Stripe Connect backend
  is a separate later stage (§5.9), not built. UI can be built, but won't be end-to-end functional; store
  price_cents/consent, real payouts later.
- "Video blog" = "Link your BUILT NOT BURN interview" — BUILT NOT BURN per CLAUDE.md and spec §8 is
  PHASE 2, OUT OF MVP. Recommendation: EXCLUDE this block from the block-picker (section 6) or leave it a
  visual stub with no persistence. Confirm with product.

═══════════════════════════════════════════════════════════════════════════════

## E. Product-owner decisions on Figma ambiguities (2026-07-18)

═══════════════════════════════════════════════════════════════════════════════

1. "You can help with" (Expertise cards, Title+Description) and "Personal session" are NOT competing
   variants of one step — two sequential steps of one flow. "You can help with" is the data source:
   its card titles feed the "Topics you're expert in · up to 5" multiselect on "Personal session".
   Max 5 of those titles + "+ Add custom" adds an ad-hoc topic ONLY for the session-topics list (not
   written back to the profile help_with).
2. "Numbers" block has no desktop Figma frame — build it in the same card style as the other blocks
   (My Wins/My Way etc.).
3. Character limits: short single-line fields (Title, Label, Value, Year, Project name) — 40; textarea
   fields (Description, Story, Your quote) — 200. Technical note: some textareas in the mockup start at a
   single-line input height but AUTO-GROW in height as text is typed (auto-grow). Check for an existing
   pattern in `components/ui/`; if none, add a minimal auto-resize (via scrollHeight) once and reuse.
4. Small design slips — fix silently (don't copy the mockup's mistakes):
   - typo "Mindseter"→"Mindsetter" (as in WhoIsMindsetterDialog);
   - "See how in looks" → "See how it looks" (grammatical error in the design, frame 96:379, node
     I261:3800;261:3424 — verified);
   - button "Add stage" in the My F*ckUp(s) block → "Add f*ckup";
   - the identical Reel Life/My Wins description in the mockup ("Key achievements as colorful cards.") —
     write a distinct meaningful description for each in i18n;
   - the marketing Relume footer under every Figma screen — do NOT carry it over, keep our real Header/Footer.
5. "42% · Basic" on the block-picker — a static mockup number, no %→tier legend in the design. Either
   define a real profile-completeness rule (agree with product) or show a simplified/static indicator on
   MVP. Don't carry "42%" as a magic constant.

═══════════════════════════════════════════════════════════════════════════════

## 1. Entry point

═══════════════════════════════════════════════════════════════════════════════

The "Cool, I want to become a Mindsetter" button in the already-built `WhoIsMindsetterDialog.tsx` currently
links to `/` (placeholder). Replace with the real first-step route (route naming consistent with
`/member-profile`, `/build-profile` — e.g. `/mindsetter-profile` or `/mindsetter-onboarding/[step]`).

Save & Continue: `profiles.onboarding_step` ALREADY EXISTS (section A) — save the step at each stage,
block-steps can be skipped and completed later from the cabinet (§5.2, cabinet doesn't exist yet —
section D). Each step = a Server Action saving partial progress (service-role where staff-only/sensitive
fields are written — section B), returning the user to where they left off.

═══════════════════════════════════════════════════════════════════════════════

## 2. Step "Your roles"

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `96:379`, desktop `387:4935`. Stored in `mindsetter_profiles.roles` (migrate text[]→jsonb, A).

- H1: "We're building your personal site"
- Subtitle: "Fill in the sections below and your profile will look like a premium personal website — not
  just a card in a catalog."
- Link button "See how it looks" (fixed from "See how in looks", E.4; arrow icon; leads to profile preview
  — placeholder, D)
- Section "Your roles" — Role cards 1/2/3, each:
  - Title * — input, limit 40, with counter
  - Description * — auto-grow textarea, limit 200, with counter
  - Link — optional input (link icon); once filled shows a preview card (favicon/video-icon + og-title) and
    an X; array of links per role
  - "Add link" button
  - Collapsed card — drag-handle, pencil (edit), trash (delete)
- "Add role" button
- "Save and continue" (variant="primaryOutline")

═══════════════════════════════════════════════════════════════════════════════

## 3. Step "Your superpowers"

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `108:720`, desktop `387:5294`. Stored in `mindsetter_profiles.superpowers` (jsonb, ok).

- Heading with lightning icon: "Your superpowers"
- Cards "Superpowers 1/3…3/3": Title * (40) + Description * (auto-grow, 200), edit/delete/drag on a filled card
- FIXED LIMIT OF 3 — no "Add" button
- "Save and continue"

═══════════════════════════════════════════════════════════════════════════════

## 4. Step "You can help with" (source of topics for Personal session — E.1)

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `109:430`, desktop `387:5515`. Stored in `mindsetter_profiles.help_with` (migrate text[]→jsonb, A).

- Heading with briefcase icon: "You can help with"
- "Expertise" cards — Title * (40) + Description * (auto-grow, 200) (examples: "Conference production" /
  "Creative concepts — Turning standard ideas into standout concepts…")
- "Add expertise", then "Save and continue"
- IMPORTANT: these card titles are the option source for the "Topics you're expert in" multiselect on the
  Personal session step (section 5).

═══════════════════════════════════════════════════════════════════════════════

## 5. Step "Personal session" — 1:1 sessions (maps to session_settings + availability_slots)

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `95:326`/`105:313` (2 states), desktop `399:2763` + `400:5251`(on)/`400:5363`(off).
Section A: session_settings/availability_slots exist but lack fields (accepts_bookings, weekly schedule,
timezone) — migrate. Section D: monetization not end-to-end yet.

- H1: "Personal session"
- Subtitle: "Here you can enter information about your hourly rate for the session"
- Toggle "Accept bookings" — "People can book sessions with you" (off → rest of the fields hide, only
  toggle + "Continue" remain)
- "Indicate session price" — radio cards Free ("0$") / Paid ($ + "Price" input), hint "You can change this anytime"
- "How it works" — clickable card "Platform fee & payouts" / "15% fee · you keep 85% · instant payout"
  (chevron → modal below)
- "Choose session's duration" — pills 30/45/60/90 min (single-select)
- "Topics you're expert in · up to 5" — multiselect chips. Options = help_with card titles (section 4),
  max 5. "+ Add custom" — ad-hoc topic only for this list (not written to help_with)
- "Your timezone" — card "Europe / Kyiv" / "UTC +3 · currently 14:30" + chevron, hint "Auto-detected from
  your device. Tap to change"
- "Available days" — 7 toggles Mo–Su
- "Available hours" — From [10:00] – To [18:00]
- "Save and continue"

### Modal "Platform fee & payouts" (inside Personal session)

Frames: mobile `242:1446`/`242:1601`.

- Title "Platform fee & payouts" + close (X)
- Subtitle: "How Mindsetis handles payments and your earnings"
- Table: Session price (example) $500 / Platform fee · 15% −$75 / You receive · 85% $425
- Note: "Example for a $500 session · Free sessions have no fee"
- "Payout after session" — "Funds released within 24h after session is completed and confirmed."
- "Change anytime" — "Switch Free ⇄ Paid or pause bookings at any moment from settings."
- "Cancellation policy" — "Full refund if cancelled 24h+ before. No refund under 24h."
- Checkbox: "I have read and agree to the Session Terms and understand the platform fee policy."
  (Session Terms — link)
- Button "I agree — continue setup" (disabled until the checkbox is ticked)

═══════════════════════════════════════════════════════════════════════════════

## 6. Step "Make your profile shine." (pick optional blocks)

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `108:916` (selected state) / `110:688` (empty), desktop `394:5927`/`397:2402`.

- H1: "Make your profile shine."
- Subtitle: "Select what you want to fill now. Everything else — later."
- Indicator "42% · Basic" — "Profile completeness" (E.5: static mock, define a real rule or simplify)
- List heading: "What you can add"
- Checkbox list (name + description + circle-checkbox):
  1. Promo video — "60-90 sec vertical video. Biggest impact on bookings."
  2. Numbers — "12+ years · 3× platforms · #1 in your field."
  3. Reel Life — a distinct description (do NOT copy the Wins text, E.4)
  4. My Wins — its own description (do NOT copy the Reel Life text)
  5. My Way — "Your business journey as a timeline."
  6. My F*ckUp(s) — "Real mistakes. Builds trust like nothing else."
  7. My Philosophy — "One quote that defines how you think."
  8. Video blog — "Link your BUILT NOT BURN interview." (section D: PHASE 2 — likely exclude)
- "Skip — fill later from cabinet" (secondary, always active; D — no cabinet yet)
- "Continue fill (N section)" — N = number picked; appears only if ≥1 picked (primary, gradient, person+ icon)

═══════════════════════════════════════════════════════════════════════════════

## 7. Optional blocks (each a separate screen, shown only if picked in step 6)

═══════════════════════════════════════════════════════════════════════════════

Navigation: "Save and continue" → next PICKED block or congrats if it's the last.
Short fields — 40 chars; textareas — auto-grow, 200 (E.3).

### Promo video (→ mindsetter_profiles.promo_video, section A: extend for 3 sources)

- Dropzone "Upload video" — "MP4 or MOV · Max 200MB / Vertical format (9:16) recommended"
- Divider "OR"
- "Youtube URL" (input "Link") + "Vimeo URL" (input "Link")
- "Save and continue"

### Reel Life (→ NEW column + Storage bucket, section A)

- Empty: dropzone "Upload photo" — "PNG or JPEG · Max 10MB per photo", hint "Add at least 3 photos to
  activate this section."
- Filled: hint "Hold and drag to change order.", grid of 3 photos (drag-handle + trash) + "+ Add Photo" tile
  (dashed border). Photo order not explicitly typed in the design — a simple URL array is fine (add an order
  index if needed).
- "Save and continue"

### Numbers (→ mindsetter_profiles.numbers jsonb; build desktop in the other blocks' card style)

- Cards "Number 1/2/3": Value * + Label * (example: "3×" / "Platforms founded")
- "Add number" → "Save and continue"

### My Wins (→ mindsetter_profiles.wins jsonb; NEEDS a per-win color field)

- Cards "Win 1/2/3": Year * + Win * + Description * + "Choose color card" — palette of 7 colors
  (yellow/purple/blue/orange/teal/light-blue/pink). Store color per win.
- "Add win" → "Save and continue"

### My Way (→ mindsetter_profiles.my_way, migrate text→jsonb, section A)

- Cards "Stage 1/2/3": Project name * + Description * + Years * (two inputs in a row, "–" separator,
  example "2016 – 2020")
- "Add stage" → "Save and continue"

### My F*ckUp(s) (→ mindsetter_profiles.fckups jsonb)

- Cards "F*ckup 1/2/3": Story * (auto-grow textarea)
- "Add f*ckup" (mockup wrongly says "Add stage" — fix, E.4) → "Save and continue"

### My Philosophy (→ mindsetter_profiles.philosophy text)

- One "Quote" card: Your quote * (auto-grow textarea), example: "Creativity is the unfair advantage in any
  business — if you know how to use it."
- No "Add" button → "Save and continue"

### Video blog (→ NEW column; BUT section D — BUILT NOT BURN = Phase 2, likely exclude)

- "Youtube URL" (input "Link") + "Vimeo URL" (input "Link") → "Save and continue"

═══════════════════════════════════════════════════════════════════════════════

## 8. Mindsetter Congrats screen (distinct from the Member congrats)

═══════════════════════════════════════════════════════════════════════════════

Frames: mobile `261:4319`. Section B: agree in what account_type/is_public state to show this screen.

- H1: "Congratulations! You are now a mindsetter of the community."
- Buttons: "Invite on Mindsetis event" (person+ icon, primaryOutline) and "Find Mindsetis event" (search
  icon; verify variant against button.tsx — established pattern from the Member congrats WelcomeCtas)
- Large bottom CTA (variant="primary", gradient): "See how looks my profile page" (D: no public profile yet
  — placeholder)
- Unlike the Member congrats — NO "Who is Mindsetter?" popup and no swap-after-dismiss button. Simpler final screen.

═══════════════════════════════════════════════════════════════════════════════

## 9. Design system — introduce nothing new

═══════════════════════════════════════════════════════════════════════════════

Fonts (Cal Sans headings, Manrope body/buttons/tiny-spacing labels), color "brand color"
(≈ rgb 121,185,227, already `--color-primary`), gradients — all already in tokens (`app/styles/tokens/`)
and in `button.tsx`/`chip.tsx`/`combobox.tsx`. Reuse existing components (Button variants, Chip, Combobox,
FieldHint, FormField/FormLabel/FormControl, RegistrationStepHeader/RegistrationProgress for the progress
bar) instead of writing new ones. Auto-grow textarea — E.3.

═══════════════════════════════════════════════════════════════════════════════

## 10. After implementation

═══════════════════════════════════════════════════════════════════════════════

Review loop: code-reviewer + security-auditor (new/changed tables+RLS for mindsetter_profiles/
session_settings, staff-only account_type/is_public flow — section B, Storage uploads — Reel Life/Promo
video) + qa (real RLS negative tests, build), then git-manager. Update ROADMAP.md via todo-jobs.
