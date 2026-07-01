-- =============================================================================
-- Stage 0.2 — Infrastructure: Postgres extensions
-- =============================================================================
-- Enables the Postgres extensions required by the Mindsetis Community platform
-- before any application tables are created (tables land in Stage 0.4).
--
--   * vector    (pgvector) — powers §3.7 AI semantic search: profile_embeddings
--                and the ivfflat cosine-similarity index used by catalog search.
--   * pg_cron   — the scheduler referenced in §2.3 that drives session reminders
--                (24h / 1h), the 48h hold-release job, the daily 14-day
--                verification-deadline check, and embedding re-indexing on
--                profile change.
--
-- NOTE: pgcrypto (gen_random_uuid()) is already enabled by default on hosted
-- Supabase projects and does NOT need to be (re-)created here.
--
-- Both statements are idempotent (`if not exists`) so this migration is safe
-- to re-run and safe to apply via `supabase db push` on hosted Supabase.
-- =============================================================================

-- pgvector: vector column type + ivfflat/hnsw index support for AI search.
create extension if not exists vector;

-- pg_cron: in-database job scheduler. On hosted Supabase this is installed
-- into the default (pg_catalog-adjacent) location Supabase expects; jobs are
-- managed via the `cron` schema it creates.
create extension if not exists pg_cron;
