-- Persist the Mindsetter's platform-fee / Session-Terms consent (the "I have read and agree…"
-- checkbox in `PlatformFeeModal`) so a returning caller who already agreed isn't re-prompted by
-- the "Save and continue" consent gate on the Personal-session step. Previously this lived only
-- in client-side React state (`SessionForm`'s `consentGiven`), lost on reload/revisit.
--
-- Additive column on the existing `session_settings` table (Stage 0.4) — no new RLS needed: the
-- existing owner-scoped `session_settings_insert_own`/`_update_own` policies
-- (`is_mindsetter(auth.uid())`) already cover writes, and the value is written by `saveSession`
-- via the service role alongside the other session fields. Existing rows default to `false`
-- (an already-saved session settings row predates this flag, so it hasn't consented under it).

alter table session_settings
  add column if not exists fee_consent_accepted boolean not null default false;
