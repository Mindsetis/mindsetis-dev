-- =============================================================================
-- ambassador_applications: backfill user_id at INSERT time for guests who
-- already have a confirmed account
-- =============================================================================
-- Gap found in code review of 20260929171847_ambassador_applications.sql: the
-- two AFTER INSERT/UPDATE triggers on auth.users
-- (link_ambassador_application_to_user()) only fire on a NEW auth.users event
-- (account creation, or the unconfirmed -> confirmed transition). If someone
-- submits the Ambassadorship popup as a guest (unauthenticated, so
-- user_id is null) while ALREADY holding a confirmed account under that same
-- email, no auth.users event happens afterwards — that row would stay
-- user_id = null forever, even though the applicant is a known, verified
-- account holder.
--
-- Fix: a BEFORE INSERT trigger directly on ambassador_applications. When the
-- incoming row has user_id is null, look up auth.users for a row with
-- lower(email) = lower(new.email) AND email_confirmed_at is not null (same
-- "confirmed only" gate as the auth.users triggers — an unconfirmed email
-- proves nothing about ownership) and require a matching public.profiles row
-- (the FK target; profiles is normally created immediately at signup by
-- handle_new_user(), but this guards against any edge case where it lags).
-- If both checks pass, set new.user_id before the row is written — no UPDATE
-- needed, no extra round trip.
--
-- applicant_type is deliberately left untouched: it is a point-in-time
-- snapshot of what the submitter was AT SUBMISSION (here, 'guest', since they
-- were unauthenticated when they submitted), not a live mirror of the
-- account. The back-office reads the applicant's current type via
-- profiles.account_type through user_id, exactly as documented on
-- ambassador_applications.applicant_type.
--
-- Security posture is identical to the existing auth.users triggers: this
-- only ever links to an account whose email is confirmed, and doing so grants
-- no additional access over the account itself — it merely stops an
-- application from being orphaned. The table remains staff-only for
-- select/update/delete (see 20260929171847_ambassador_applications.sql); this
-- trigger does not change RLS exposure in any way.
-- =============================================================================

create or replace function public.link_ambassador_application_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
begin
  if new.user_id is not null then
    return new;
  end if;

  select u.id
  into matched_user_id
  from auth.users u
  where lower(u.email) = lower(new.email)
    and u.email_confirmed_at is not null
    and exists (select 1 from public.profiles p where p.id = u.id)
  limit 1;

  if matched_user_id is not null then
    new.user_id := matched_user_id;
  end if;

  return new;
exception
  when others then
    -- Never let a bug here block a legitimate application submission.
    return new;
end;
$$;

comment on function public.link_ambassador_application_on_insert() is
  'BEFORE INSERT trigger on ambassador_applications: if the submitted row has user_id is null (guest submission), looks up a matching CONFIRMED auth.users row by lower(email) (with a public.profiles row present) and pre-fills user_id before the row is written. Covers the case where the applicant already held a confirmed account at submission time, so no later auth.users INSERT/UPDATE event would ever trigger link_ambassador_application_to_user(). Same confirmed-email-only security gate as that function; never raises (defensive exception handler) so it can never block a submission. applicant_type is left untouched — it is a point-in-time snapshot of the submission, not a live account mirror.';

create trigger before_insert_link_ambassador_application
  before insert on public.ambassador_applications
  for each row
  execute function public.link_ambassador_application_on_insert();
