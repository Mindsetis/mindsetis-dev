---
name: new-migration
description: >-
  Create a new Supabase Postgres migration for Mindsetis following project conventions —
  standard columns, RLS enabled, is_staff()-based policies, updated_at trigger, and (for
  money tables) no client write policies. Use when adding or altering a table, or when the
  user says "write a migration", "add a table", or "change the schema".
---

# Skill: new-migration

Create `supabase/migrations/<timestamp>_<snake_name>.sql`. Prefer delegating deeper schema
design to the `supabase-expert` subagent; use this skill for the correct boilerplate.

## Steps

1. **Name the file.** `supabase/migrations/<UTC timestamp: YYYYMMDDHHMMSS>_<snake_name>.sql`.
   Get the timestamp with `date -u +%Y%m%d%H%M%S`. Never edit an already-applied migration —
   always add a new one.
2. **Create table with standard columns** (see `CLAUDE.md`):
   `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`,
   `updated_at timestamptz default now()`. (`profiles` is the exception —
   `id uuid primary key references auth.users(id) on delete cascade`.)
   Model enums as `text` + `check (col in (...))`.
3. **Enable RLS in the same migration:** `alter table <t> enable row level security;`
4. **Add policies** using the `is_staff(auth.uid())` helper for staff access:
   - Owner read: `for select using (auth.uid() = <owner> or is_staff(auth.uid()))`.
   - Owner write only where the spec allows.
   - **Money tables (`transactions`, `payouts`): NO client INSERT/UPDATE policy** — writes
     are service-role only. Clients may only `select` their own rows + staff.
   - Verification status / roles: staff-only writes.
5. **updated_at trigger** for tables with `updated_at` (e.g. `moddatetime` extension or a
   `set_updated_at()` plpgsql trigger).
6. **Special cases:** pgvector tables get the ivfflat index
   (`using ivfflat (embedding vector_cosine_ops) with (lists = 100)`); scheduled jobs use
   `pg_cron`; the `is_staff(uuid)` helper is created once and reused.

## Template

```sql
-- <purpose>
create table if not exists <t> (
  id         uuid primary key default gen_random_uuid(),
  -- ... columns ...
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table <t> enable row level security;

create policy "<t>_read_own" on <t>
  for select using (auth.uid() = <owner_col> or is_staff(auth.uid()));

-- owner writes (omit entirely for money tables — service-role only)
create policy "<t>_write_own" on <t>
  for all using (auth.uid() = <owner_col>) with check (auth.uid() = <owner_col>);

create trigger set_<t>_updated_at
  before update on <t>
  for each row execute function set_updated_at();
```

## Checklist before finishing

- [ ] RLS enabled + at least one policy per access path.
- [ ] Money tables have NO client write policy.
- [ ] Standard columns + updated_at trigger present.
- [ ] Staff access via `is_staff()`; status/role changes staff-only.
- [ ] For money/role policies, request a `security-auditor` review.
