-- =============================================================================
-- Stage 1.3 follow-up — bound `leads.source` length at the DB layer
-- =============================================================================
-- `leads.source` had no DB-level length bound, only the app's Zod schema
-- capped it (100 chars). Since `leads_insert_public` is intentionally open
-- (`with check (true)`) so PostgREST/anon-key callers can reach this table
-- directly, bypassing the app entirely, the DB must enforce the same bound
-- Zod does — mirrors the reasoning already on `leads_email_check`.
-- =============================================================================

alter table leads
  add constraint leads_source_length_check
  check (source is null or char_length(source) <= 100);

comment on constraint leads_source_length_check on leads is
  'Matches the app-layer Zod cap (lib/validation/leads.ts) so a direct PostgREST/anon-key caller bypassing captureLead cannot insert an unbounded source value.';
