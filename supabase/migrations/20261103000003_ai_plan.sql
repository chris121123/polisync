-- AI planner write paths (phase 13b, plan §4 / §5.2).
--
-- What this does
--   1. `sessions.source` — where a row came from. Every existing row was made by
--      hand, so the default backfills the table as 'manual'.
--   2. `sessions.batch_id` — the `ai_jobs` proposal that wrote or last changed
--      the row, so one base plan or one daily repair is traceable as a batch.
--   3. Widens `audit_logs.action` with `ai_plan_committed` / `ai_repair_applied`.
--
-- Additive and reversible: no row is deleted, no column is narrowed, and RLS is
-- untouched — the two new columns inherit the existing `sessions` policies.
--
-- Lock note: ADD COLUMN with a non-volatile DEFAULT is metadata-only (Postgres
-- 11+). ADD CONSTRAINT ... CHECK validates the table under ACCESS EXCLUSIVE, so
-- writes wait; one school, ~10^3 sessions: sub-second. Run in a quiet window
-- anyway. Re-runnable: `if not exists` on the column/index, drop-then-add on
-- both constraints.

-- ─── 1. Session provenance ───────────────────────────────────────────────────

alter table public.sessions
  add column if not exists source text not null default 'manual';

alter table public.sessions drop constraint if exists sessions_source_check;
alter table public.sessions
  add constraint sessions_source_check
  check (source in ('manual', 'auto', 'ai', 'import', 'repair'));

alter table public.sessions
  add column if not exists batch_id uuid references public.ai_jobs(id) on delete set null;

create index if not exists idx_sessions_batch_id on public.sessions (batch_id);

comment on column public.sessions.source is 'Origin of the row: manual | auto (solver edge) | ai (ai-plan base commit) | import | repair (ai-plan daily repair).';
comment on column public.sessions.batch_id is 'ai_jobs proposal that wrote or last changed this row; null for hand-made rows.';

-- ─── 2. Audit verbs ──────────────────────────────────────────────────────────
-- The whole list is re-declared on purpose: dropping the CHECK and re-adding it
-- only keeps the verbs written out here.

alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'user_created', 'user_deactivated', 'user_activated', 'user_deleted',
  'role_changed', 'login_success', 'login_failed', 'password_changed',
  'password_reset', 'data_cleared', 'auth_rejected', 'ai_config_updated',
  'ai_plan_committed', 'ai_repair_applied'
));

-- Verify after running:
--   select column_name, data_type, column_default, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'sessions'
--      and column_name in ('source', 'batch_id');
--   select source, count(*) from public.sessions group by source;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping these columns loses provenance only: sessions, times and links stay.
-- alter table public.audit_logs drop constraint if exists audit_logs_action_check;
-- alter table public.audit_logs add constraint audit_logs_action_check check (action in (
--   'user_created','user_deactivated','user_activated','user_deleted',
--   'role_changed','login_success','login_failed','password_changed',
--   'password_reset','data_cleared','auth_rejected','ai_config_updated'
-- ));
-- drop index if exists public.idx_sessions_batch_id;
-- alter table public.sessions drop constraint if exists sessions_source_check;
-- alter table public.sessions drop column if exists batch_id;
-- alter table public.sessions drop column if exists source;
