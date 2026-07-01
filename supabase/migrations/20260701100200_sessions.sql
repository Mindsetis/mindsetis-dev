-- =============================================================================
-- Stage 0.4 — Core data model: session_settings, availability_slots, sessions
-- =============================================================================
-- Implements spec §3.3 exactly, plus the standard `created_at`/`updated_at`/
-- RLS conventions from CLAUDE.md, plus the RLS baseline from spec §4.
--
-- IMPORTANT: `sessions` gets NO client INSERT/UPDATE/DELETE policy in this
-- migration. Booking, status transitions (`scheduled` → `completed_pending`
-- → `held` → `paid_out` / `disputed` / `cancelled`), mutual confirmation,
-- hold, and Google Meet link generation are all server-side (Server Actions /
-- service role), built in Stage 1.4. Clients only ever read their own rows
-- here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- session_settings — one row per Mindsetter, current Free/Paid session config
-- -----------------------------------------------------------------------------
create table session_settings (
  mindsetter_id uuid primary key references profiles(id) on delete cascade,
  session_type  text not null default 'free' check (session_type in ('free', 'paid')),
  duration_min  int default 30,
  topics        text[] default '{}',
  price_cents   int,
  currency      text default 'usd',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

comment on table session_settings is
  'Current 1:1 session configuration per Mindsetter (Free XOR Paid, one active at a time; changes are not retroactive to already-booked sessions).';

alter table session_settings enable row level security;

-- Public read: needed by the booking widget on any Mindsetter's public page.
-- Excludes blocked mindsetters' settings from public exposure.
create policy "session_settings_read_public" on session_settings
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = mindsetter_id and p.is_blocked = false
    )
  );

-- NOTE: this policy intentionally does not yet restrict insertion to
-- Mindsetters (permission matrix, CLAUDE.md — only Mindsetters open own
-- 1:1 session_settings). That RLS gating is deferred to Stage 0.7 (RBAC),
-- where it is added together with the server-side permission checks, to
-- avoid conflicting with the not-yet-designed Mindsetter onboarding flow.
create policy "session_settings_insert_own" on session_settings
  for insert
  with check (auth.uid() = mindsetter_id);

create policy "session_settings_update_own" on session_settings
  for update
  using (auth.uid() = mindsetter_id)
  with check (auth.uid() = mindsetter_id);

create trigger set_session_settings_updated_at
  before update on session_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- availability_slots — Mindsetter's bookable calendar slots
-- -----------------------------------------------------------------------------
create table availability_slots (
  id            uuid primary key default gen_random_uuid(),
  mindsetter_id uuid references profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  is_booked     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

comment on table availability_slots is
  'Bookable calendar slots published by a Mindsetter.';

create index availability_slots_mindsetter_starts_at_idx
  on availability_slots (mindsetter_id, starts_at);

alter table availability_slots enable row level security;

-- Public read: needed by the booking widget to render open slots.
-- Excludes blocked mindsetters' slots from public exposure.
create policy "availability_slots_read_public" on availability_slots
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = mindsetter_id and p.is_blocked = false
    )
  );

create policy "availability_slots_insert_own" on availability_slots
  for insert
  with check (auth.uid() = mindsetter_id);

create policy "availability_slots_update_own" on availability_slots
  for update
  using (auth.uid() = mindsetter_id)
  with check (auth.uid() = mindsetter_id);

create policy "availability_slots_delete_own" on availability_slots
  for delete
  using (auth.uid() = mindsetter_id);

create trigger set_availability_slots_updated_at
  before update on availability_slots
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- sessions — booked 1:1 sessions and their lifecycle
-- -----------------------------------------------------------------------------
create table sessions (
  id                      uuid primary key default gen_random_uuid(),
  mindsetter_id           uuid references profiles(id),
  booker_id               uuid references profiles(id),
  slot_id                 uuid references availability_slots(id),
  topic                   text,
  session_type            text not null check (session_type in ('free', 'paid')),
  price_cents             int,
  meet_url                text,
  status                  text not null default 'scheduled'
                         check (status in ('scheduled', 'completed_pending', 'held', 'paid_out', 'disputed', 'cancelled')),
  confirmed_by_mindsetter boolean default false,
  confirmed_by_booker     boolean default false,
  hold_until              timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

comment on table sessions is
  'Booked 1:1 sessions. Lifecycle: scheduled -> (mutual confirmation) completed_pending -> held (+48h) -> paid_out | disputed | cancelled. Written only via server-side logic (Stage 1.4) / service role for money-adjacent transitions.';

create index sessions_mindsetter_id_idx on sessions (mindsetter_id);
create index sessions_booker_id_idx on sessions (booker_id);
create index sessions_status_idx on sessions (status);
create index sessions_slot_id_idx on sessions (slot_id);
-- Supports the pg_cron 48h hold-release job, which filters
-- status = 'held' and hold_until < now().
create index sessions_hold_until_idx on sessions (hold_until) where status = 'held';

alter table sessions enable row level security;

create policy "sessions_read_own" on sessions
  for select
  using (auth.uid() in (mindsetter_id, booker_id) or is_staff(auth.uid()));

-- No client INSERT/UPDATE/DELETE policy: session creation, status
-- transitions, confirmation, hold and Google Meet generation are all
-- server-side (Server Actions / service role) per spec §3.3 — built in
-- Stage 1.4, not here.

create trigger set_sessions_updated_at
  before update on sessions
  for each row execute function public.set_updated_at();
