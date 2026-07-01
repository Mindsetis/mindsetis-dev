-- =============================================================================
-- Stage 0.4 — Core data model: events, event_participants
-- =============================================================================
-- Implements spec §3.4 exactly, plus the standard `created_at`/`updated_at`/
-- RLS conventions from CLAUDE.md, plus the RLS baseline from spec §4.
--
-- Moderation guard (critical): the create flow is
--   draft -> review -> published (staff moderation) -> cancelled
-- Per this stage's brief, ALL `events.status` changes are staff-only — a
-- non-staff organizer can INSERT/UPDATE their own event's details, but any
-- attempt to change `status` (submit for review, self-publish, self-cancel)
-- is blocked by a trigger. Organizer-initiated status transitions (submit /
-- cancel) will be exposed via a dedicated Server Action in Stage 1.6, not
-- via direct client UPDATE.
--
-- event_participants: no client UPDATE policy in this migration — `state`
-- transitions (invited -> applied -> confirmed/rejected) are organizer/staff
-- driven and will be added as server-side logic in Stage 1.6. Clients here
-- can only apply (insert own row) or withdraw (delete own row).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid references profiles(id),
  format        text not null check (format in ('networking', 'discussion', 'naked_soul', 'mastermind')),
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  duration_min  int,
  seats_min     int,
  seats_max     int,
  is_online     boolean default true,
  address       text,
  is_paid       boolean default false,
  price_cents   int,
  access_mode   text default 'apply' check (access_mode in ('apply', 'invite')),
  auto_confirm  boolean default false,
  meet_url      text,
  status        text default 'draft'
               check (status in ('draft', 'review', 'published', 'cancelled')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

comment on table events is
  'Group event formats (networking / discussion / naked_soul / mastermind). Moderation flow draft -> review -> published is staff-controlled.';

create index events_organizer_id_idx on events (organizer_id);
create index events_status_idx on events (status);
create index events_starts_at_idx on events (starts_at);

alter table events enable row level security;

create policy "events_read" on events
  for select
  using (status = 'published' or auth.uid() = organizer_id or is_staff(auth.uid()));

-- NOTE: this policy intentionally does not yet restrict insertion to
-- Verified Members / Mindsetters (permission matrix, CLAUDE.md). That
-- RLS gating is deferred to Stage 0.7 (RBAC), where it is added together
-- with the server-side permission checks, to avoid conflicting with the
-- not-yet-designed Mindsetter onboarding flow.
create policy "events_insert_own" on events
  for insert
  with check (auth.uid() = organizer_id);

create policy "events_update_own" on events
  for update
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

create policy "events_update_staff" on events
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

-- Guard: status transitions (draft/review/published/cancelled) are staff-only.
-- Applies to both INSERT (forces status='draft', since a self-INSERT with
-- status='published' would otherwise be a self-publish vector via
-- events_insert_own, which does not itself constrain status) and UPDATE
-- (rejects any status change by non-staff).
create or replace function public.guard_events_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_staff(auth.uid()) or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Only staff may change events.status';
  end if;

  return new;
end;
$$;

comment on function public.guard_events_status() is
  'BEFORE INSERT/UPDATE guard on events: on INSERT forces status=draft for non-staff callers; on UPDATE blocks non-staff callers from changing status (moderation draft -> review -> published -> cancelled is staff-only). Staff and the service role bypass entirely.';

create trigger guard_events_status
  before insert or update on events
  for each row execute function public.guard_events_status();

create trigger set_events_updated_at
  before update on events
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- event_participants
-- -----------------------------------------------------------------------------
create table event_participants (
  event_id   uuid references events(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  state      text default 'applied' check (state in ('invited', 'applied', 'confirmed', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (event_id, user_id)
);

comment on table event_participants is
  'Apply/Invite participation records for events. State transitions (invited/applied -> confirmed/rejected) are organizer/staff-driven server-side logic added in Stage 1.6.';

create index event_participants_user_id_idx on event_participants (user_id);

alter table event_participants enable row level security;

create policy "event_participants_read" on event_participants
  for select
  using (
    auth.uid() = user_id
    or is_staff(auth.uid())
    or exists (
      select 1 from events e
      where e.id = event_participants.event_id
        and e.organizer_id = auth.uid()
    )
  );

-- WITH CHECK also pins state = 'applied': clients may only ever self-apply,
-- never self-insert as 'invited' or 'confirmed' (that would let a user
-- confirm/invite themselves, bypassing organizer/staff-driven transitions).
create policy "event_participants_insert_own" on event_participants
  for insert
  with check (auth.uid() = user_id and state = 'applied');

create policy "event_participants_delete_own" on event_participants
  for delete
  using (auth.uid() = user_id);

-- No client UPDATE policy: `state` transitions (invite acceptance, organizer
-- confirm/reject) are organizer/staff-driven and land in Stage 1.6.

create trigger set_event_participants_updated_at
  before update on event_participants
  for each row execute function public.set_updated_at();
