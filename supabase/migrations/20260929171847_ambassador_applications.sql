-- =============================================================================
-- Ambassador applications — "Apply for Ambassadorship" popup on the homepage
-- =============================================================================
-- Captures the Ambassadorship application popup. Same write pattern as
-- `homepage_waitlist` (20260805181705_homepage_waitlist.sql): the Server
-- Action inserts exclusively through the **service-role client**
-- (`lib/supabase/service.ts`, bypasses RLS), so this table has **no
-- client-facing INSERT policy at all** — a direct anon/authenticated
-- PostgREST insert attempt is expected to fail RLS (42501). Staff get SELECT
-- + UPDATE (status triage in the future back-office) + DELETE (cleanup) via
-- `is_staff(auth.uid())`.
--
-- Unlike `homepage_waitlist`, repeat applications from the same email ARE
-- allowed (product decision from the owner) — the future admin UI groups
-- rows by email instead of enforcing uniqueness, hence the plain (non-unique)
-- `lower(email)` index below rather than a unique one.
-- =============================================================================

create table public.ambassador_applications (
  id                     uuid primary key default gen_random_uuid(),

  -- Account link, backfilled by the trigger below once (and only once) the
  -- applicant's email is confirmed. NULL means "guest" — either the
  -- applicant never had an account at submission time, or has one but
  -- hasn't confirmed it yet. `on delete set null` so a deleted account never
  -- blocks deleting the row, and the application survives as a guest record.
  user_id                uuid references public.profiles(id) on delete set null,

  -- Applicant type AT THE MOMENT OF SUBMISSION (member vs mindsetter vs an
  -- unauthenticated guest), captured from the session at submit time — this
  -- is a point-in-time snapshot, NOT kept in sync with the account
  -- afterwards. The back-office reads the applicant's *current* type via
  -- `profiles.account_type` through `user_id` (user_id is null => guest,
  -- i.e. never had/confirmed an account at read time); this column is only
  -- historical context for what the applicant was when they applied.
  applicant_type         text not null
                           check (applicant_type in ('guest', 'member', 'mindsetter')),

  first_name             text not null
                           check (char_length(trim(first_name)) > 0 and char_length(first_name) <= 200),
  last_name              text not null
                           check (char_length(trim(last_name)) > 0 and char_length(last_name) <= 200),

  -- Same format/length guard as homepage_waitlist.email; stored lower-cased
  -- by the Server Action (defense-in-depth: matching is always case-folded
  -- via lower(email) regardless of what actually got stored).
  email                  text not null
                           check (
                             char_length(email) <= 254
                             and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                           ),

  event_experience       text check (char_length(event_experience) <= 2000),
  communities            text check (char_length(communities) <= 2000),
  communities_feedback   text check (char_length(communities_feedback) <= 2000),

  locale                 text not null default 'en',

  status                 text not null default 'new'
                           check (status in ('new', 'reviewed', 'approved', 'rejected')),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.ambassador_applications is
  'Submissions from the "Apply for Ambassadorship" homepage popup. Same no-client-INSERT pattern as homepage_waitlist: the Server Action writes exclusively via the service-role client. Repeat applications from the same email are allowed by design (no uniqueness constraint) — the back-office groups by lower(email). Staff get SELECT/UPDATE/DELETE via is_staff(); no client write policies at all.';

comment on column public.ambassador_applications.user_id is
  'Account link, backfilled by link_ambassador_application_to_user() once the applicant''s email is confirmed (never before, so nobody can claim someone else''s application by registering their email). NULL = guest at read time. The back-office resolves the applicant''s CURRENT account type via profiles.account_type through this column, not via applicant_type.';

comment on column public.ambassador_applications.applicant_type is
  'Applicant type captured AT SUBMISSION TIME (guest/member/mindsetter) from the session that submitted the form. A point-in-time snapshot, not kept in sync afterwards — for the applicant''s current type, join profiles via user_id instead.';

comment on constraint ambassador_applications_email_check on public.ambassador_applications is
  'DB-level guard against malformed/empty/oversized email values, defense-in-depth alongside the app''s Zod validation (see homepage_waitlist for the same pattern).';

-- Non-unique: repeat applications from the same email are allowed. This
-- index exists for (a) the admin UI grouping applications by email and
-- (b) the confirmation trigger's lookup below.
create index ambassador_applications_email_lower_idx
  on public.ambassador_applications (lower(email));

create index ambassador_applications_user_id_idx
  on public.ambassador_applications (user_id);

alter table public.ambassador_applications enable row level security;

-- No INSERT policy for anon/authenticated at all: the Server Action writes
-- exclusively through the service-role client (bypasses RLS), so a direct
-- anon/authenticated INSERT attempt via PostgREST is expected to fail RLS
-- (42501) — intentional, not a gap. Same reasoning as homepage_waitlist.

create policy "ambassador_applications_select_staff" on public.ambassador_applications
  for select
  using (is_staff(auth.uid()));

-- Staff-only status triage (future back-office: new -> reviewed/approved/rejected).
create policy "ambassador_applications_update_staff" on public.ambassador_applications
  for update
  using (is_staff(auth.uid()))
  with check (is_staff(auth.uid()));

create policy "ambassador_applications_delete_staff" on public.ambassador_applications
  for delete
  using (is_staff(auth.uid()));

create trigger set_ambassador_applications_updated_at
  before update on public.ambassador_applications
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-link a guest application to the applicant's account, but only once
-- their email is confirmed
-- -----------------------------------------------------------------------------
-- Why gate on confirmation: linking on a bare, unconfirmed auth.users INSERT
-- would let anyone "claim" a stranger's ambassador application by simply
-- registering with that stranger's email address (no proof of ownership).
-- Requiring email_confirmed_at closes that hole.
--
-- Two firing paths are needed because confirmation happens at different
-- points depending on the signup flow:
--   * Google OAuth (and any admin-created account with email_confirm: true)
--     arrives in auth.users already confirmed -> AFTER INSERT, gated on
--     `new.email_confirmed_at is not null`.
--   * Ordinary email/password signUp -> verifyOtp confirms later -> AFTER
--     UPDATE OF email_confirmed_at, gated on the null -> not-null transition
--     (`old.email_confirmed_at is null and new.email_confirmed_at is not
--     null`), so re-saving an already-confirmed row never re-fires this.
--
-- FK-safety (profiles is not guaranteed to exist yet on the INSERT path):
-- `public.profiles` is itself populated by a separate AFTER INSERT trigger
-- on auth.users (`on_auth_user_created` -> handle_new_user(), see
-- 20260701100400_handle_new_user.sql). Postgres fires same-event triggers on
-- a table in alphabetical order by trigger name, and this migration's INSERT
-- trigger is deliberately named 'on_auth_user_created_link_ambassador' so it
-- alphabetically sorts AFTER 'on_auth_user_created' and therefore runs after
-- handle_new_user() has already inserted the profiles row on the same
-- statement. That ordering is a real guarantee, but this function does NOT
-- rely on it alone: it also re-checks `exists (select 1 from public.profiles
-- where id = new.id)` before writing, and wraps everything in an exception
-- handler, so a missing profiles row (or any other error) is swallowed
-- rather than raising a foreign-key violation that would abort the
-- auth.users write and break signup/login/OAuth. The UPDATE path has no
-- ordering concern at all: profiles.id = new.id was already created at
-- signup time, long before email confirmation happens.
create or replace function public.link_ambassador_application_to_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  update public.ambassador_applications
  set user_id = new.id
  where user_id is null
    and lower(email) = lower(new.email);

  return new;
exception
  when others then
    -- Never let a bug here break auth.users writes (signup/login/OAuth).
    return new;
end;
$$;

comment on function public.link_ambassador_application_to_user() is
  'Backfills ambassador_applications.user_id for guest (user_id is null) rows matching the newly-confirmed auth.users email. Fires only once email_confirmed_at transitions to non-null (never on a bare unconfirmed signup) so nobody can claim another person''s application by registering their email. security definer + empty search_path with fully-qualified names; defensively no-ops (never raises) if profiles isn''t provisioned yet or on any other error, so it can never break signup/login.';

create trigger on_auth_user_created_link_ambassador
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.link_ambassador_application_to_user();

create trigger on_auth_user_confirmed_link_ambassador
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.link_ambassador_application_to_user();
