-- =============================================================================
-- Stage 0.4 — Core data model: profiles, staff_roles, mindsetter_profiles
-- =============================================================================
-- Implements spec §3.1 exactly, plus the standard `created_at`/`updated_at`/
-- RLS conventions from CLAUDE.md, plus the RLS baseline from spec §4.
--
-- Column-level write guards (critical, CLAUDE.md security rules):
--   * profiles.verification_status / account_type / is_blocked and
--     mindsetter_profiles.is_public may only be changed by staff. A plain
--     RLS `using`/`with check` clause can't express "this column may not
--     change", so each table gets a BEFORE UPDATE (and, for is_public, also
--     BEFORE INSERT) trigger that raises if a non-staff caller touches those
--     columns. Staff (is_staff(auth.uid())) bypass the guard entirely.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles — base profile, 1:1 with auth.users
-- -----------------------------------------------------------------------------
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  username               text unique not null,
  full_name              text,
  avatar_url             text,
  cover_url              text,
  tagline                text,
  location               text,
  bio                    text,
  company                text,
  job_title              text,
  socials                jsonb default '{}',
  content_locale         text default 'en',
  account_type           text not null default 'member'
                         check (account_type in ('member', 'mindsetter')),
  verification_status    text not null default 'unverified'
                         check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  verification_deadline  timestamptz,
  onboarding_step        int default 0,
  is_blocked             boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

comment on table profiles is
  'Base profile, 1:1 with auth.users. Extended Mindsetter data lives in mindsetter_profiles.';

-- Common permission-check lookups (14-day rule, catalog filters, admin queues).
create index profiles_account_type_idx on profiles (account_type);
create index profiles_verification_status_idx on profiles (verification_status);

alter table profiles enable row level security;

create policy "profiles_read" on profiles
  for select
  using (is_blocked = false or auth.uid() = id or is_staff(auth.uid()));

create policy "profiles_insert_own" on profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_staff" on profiles
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

-- Guard: verification_status / account_type / is_blocked are staff-only
-- mutations (role & verification changes per CLAUDE.md security rules).
-- Applies to both INSERT (forces safe defaults, since a self-INSERT with
-- verification_status='verified'/account_type='mindsetter'/is_blocked=false
-- would otherwise be a privilege-escalation vector via profiles_insert_own)
-- and UPDATE (rejects any change to these columns by non-staff).
create or replace function public.guard_profiles_protected_columns()
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
    -- Never trust client input for these on self-insert: coerce to safe
    -- defaults rather than rejecting the insert outright.
    new.verification_status := 'unverified';
    new.account_type := 'member';
    new.is_blocked := false;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Only staff may change profiles.verification_status';
  end if;

  if new.account_type is distinct from old.account_type then
    raise exception 'Only staff may change profiles.account_type';
  end if;

  if new.is_blocked is distinct from old.is_blocked then
    raise exception 'Only staff may change profiles.is_blocked';
  end if;

  return new;
end;
$$;

comment on function public.guard_profiles_protected_columns() is
  'BEFORE INSERT/UPDATE guard on profiles: on INSERT forces safe defaults (unverified/member/not-blocked) for non-staff callers; on UPDATE blocks non-staff callers from changing verification_status, account_type, or is_blocked. Staff and the service role bypass entirely.';

create trigger guard_profiles_protected_columns
  before insert or update on profiles
  for each row execute function public.guard_profiles_protected_columns();

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- staff_roles — Mindsetis team (admin/moderator), separate from account_type
-- -----------------------------------------------------------------------------
create table staff_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'moderator')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table staff_roles is
  'Back-office team roles (admin/moderator), distinct from profiles.account_type. No client write policies: managed by existing staff or the service role only.';

alter table staff_roles enable row level security;

create policy "staff_roles_read_own_or_staff" on staff_roles
  for select
  using (auth.uid() = user_id or is_staff(auth.uid()));

-- Intentionally no INSERT/UPDATE/DELETE policy: granting/revoking staff
-- access is a service-role/back-office-only operation (self-service role
-- escalation must be impossible).

create trigger set_staff_roles_updated_at
  before update on staff_roles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- mindsetter_profiles — extended Mindsetter sections, split out from profiles
-- -----------------------------------------------------------------------------
create table mindsetter_profiles (
  id           uuid primary key references profiles(id) on delete cascade,
  roles        text[] default '{}',
  superpowers  jsonb default '[]',
  promo_video  text,
  numbers      jsonb default '[]',
  help_with    text[] default '{}',
  wins         jsonb default '[]',
  my_way       text,
  fckups       jsonb default '[]',
  philosophy   text,
  is_public    boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

comment on table mindsetter_profiles is
  'Extended Mindsetter profile sections. is_public flips to true only after staff verification.';

alter table mindsetter_profiles enable row level security;

create policy "mindsetter_profiles_read" on mindsetter_profiles
  for select
  using (is_public = true or auth.uid() = id or is_staff(auth.uid()));

create policy "mindsetter_profiles_insert_own" on mindsetter_profiles
  for insert
  with check (auth.uid() = id);

create policy "mindsetter_profiles_update_own" on mindsetter_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "mindsetter_profiles_update_staff" on mindsetter_profiles
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

-- Guard: is_public can only ever be set to true by staff (publishing follows
-- verification). Applies to both INSERT and UPDATE.
create or replace function public.guard_mindsetter_profiles_is_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_staff(auth.uid()) or auth.role() = 'service_role' then
    return new;
  end if;

  if new.is_public then
    raise exception 'Only staff may set mindsetter_profiles.is_public = true';
  end if;

  return new;
end;
$$;

comment on function public.guard_mindsetter_profiles_is_public() is
  'BEFORE INSERT/UPDATE guard on mindsetter_profiles: blocks non-staff callers from publishing (is_public = true).';

create trigger guard_mindsetter_profiles_is_public
  before insert or update on mindsetter_profiles
  for each row execute function public.guard_mindsetter_profiles_is_public();

create trigger set_mindsetter_profiles_updated_at
  before update on mindsetter_profiles
  for each row execute function public.set_updated_at();
