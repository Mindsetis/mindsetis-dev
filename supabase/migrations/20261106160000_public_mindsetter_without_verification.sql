-- =============================================================================
-- A published Mindsetter page is public without verification (owner's decision, 06.11.2026)
-- =============================================================================
-- `is_public_mindsetter(uuid)` (20260720184218) is the one rule every public-read RLS branch uses
-- (`profiles_read`, `mindsetter_profiles_read`, `session_settings_read_public`). It required
-- `verification_status = 'verified'` on top of `mindsetter_profiles.is_public = true`, so a page
-- that was published but not verified still 404'd for everyone but its owner and staff.
--
-- Owner's interim rule until the back office exists: pages are published the moment their owner
-- becomes a Mindsetter (`promoteIfCoreWizardDone`, `MINDSETTER_AUTO_PUBLISH`;
-- 20261106150000 published the existing ones) and must be visible WITHOUT the "Verified" badge.
-- So publication (`is_public`, staff/service-role only) becomes the single visibility switch, and
-- verification keeps its own job: the badge and what the permission matrix ties to it (booking,
-- events, invites — `is_verified_mindsetter`, app-side guards), none of which reads this helper.
--
-- Same signature, security definer and pinned search_path as before, so the three policies pick
-- the change up without being recreated. Blocked accounts stay hidden.
--
-- Do not edit after it has been applied — add a new migration instead.
-- =============================================================================

create or replace function public.is_public_mindsetter(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.mindsetter_profiles mp on mp.id = p.id
    where p.id = profile_id
      and p.account_type = 'mindsetter'
      and p.is_blocked = false
      and mp.is_public = true
  );
$$;

comment on function public.is_public_mindsetter(uuid) is
  'Returns true iff profile_id is a published (mindsetter_profiles.is_public = true), non-blocked Mindsetter — the "publicly visible" rule behind profiles_read / mindsetter_profiles_read / session_settings_read_public. Since 20261106160000 verification is NOT required (owner''s decision 06.11.2026: published pages are public without the Verified badge); verification still gates booking/events/invites elsewhere. security definer + pinned search_path so the policies don''t recurse into each other''s RLS.';
