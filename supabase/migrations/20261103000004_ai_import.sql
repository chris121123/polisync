-- Import staging (phase 13c, plan §4 / §5.3).
--
-- What this does
--   1. `import_batches` — one row per import run (Excel rows posted by the
--      browser, or a document photo read by the vision model). Edge-only.
--   2. `import_rows` — the staged rows of a batch: raw (as received), mapped
--      (ids resolved), errors, and the per-row status.
--   3. `sessions.import_batch_id` — which batch wrote a row, so one import is
--      traceable as a batch (same idea as `sessions.batch_id` for ai_jobs).
--   4. Widens `audit_logs.action` with `ai_import_applied`.
--
-- Privacy: `import_rows.raw` holds names copied from the document, so both
-- tables are edge-only — RLS on with no policy and every client grant revoked,
-- exactly like `ai_jobs`. `raw` is set to null when the batch is applied or
-- discarded; `mapped`/`errors` stay for audit. The key never appears here; the
-- confirm token is stored as a sha256 hash only.
--
-- Additive and reversible: no row is deleted and no existing column is narrowed.
--
-- Lock note: CREATE TABLE and ADD COLUMN with a nullable/defaulted type are
-- metadata-only. ADD CONSTRAINT ... CHECK validates `audit_logs` under ACCESS
-- EXCLUSIVE, so writes wait; one school, ~10^4 audit rows: sub-second. Run in a
-- quiet window anyway. Re-runnable: `if not exists`, `drop ... if exists`, and
-- the revoke is idempotent.

-- ─── 1. Staging tables ───────────────────────────────────────────────────────

create table if not exists public.import_batches (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('excel', 'vision')),
  file_name          text,
  file_path          text,
  status             text not null default 'staging'
                       check (status in ('staging', 'mapped', 'validated', 'applied', 'discarded')),
  column_map         jsonb,
  summary            jsonb,
  confirm_token      text,
  confirm_expires_at timestamptz,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.import_rows (
  id         bigint primary key generated always as identity,
  batch_id   uuid not null references public.import_batches(id) on delete cascade,
  row_no     int not null,
  raw        jsonb default '{}'::jsonb,
  mapped     jsonb,
  errors     jsonb,
  status     text not null default 'pending'
               check (status in ('pending', 'matched', 'invalid', 'applied')),
  created_at timestamptz not null default now()
);

comment on table public.import_batches is 'One import run (excel rows or a vision-extracted photo); readable only by edges using the service role.';
comment on column public.import_batches.confirm_token is 'SHA-256 of the 10-minute apply token; the token itself is never stored or logged.';
comment on table public.import_rows is 'Staged rows of an import batch: raw as received, mapped after name resolution, plus per-row errors.';
comment on column public.import_rows.raw is 'Source cells as received; set to null once the batch is applied or discarded, mapped/errors stay for audit.';

-- ─── 2. Session provenance ───────────────────────────────────────────────────

alter table public.sessions
  add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;

comment on column public.sessions.import_batch_id is 'import_batches row that wrote this session; null for every other source.';

-- ─── 3. Indexes ──────────────────────────────────────────────────────────────

create index if not exists idx_import_rows_batch_row on public.import_rows (batch_id, row_no);
create index if not exists idx_import_batches_created_by_created on public.import_batches (created_by, created_at);
create index if not exists idx_sessions_import_batch_id on public.sessions (import_batch_id);

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;

-- Edge-only tables: no policy means no client row is ever visible.
revoke all on public.import_batches, public.import_rows from anon, authenticated;

-- ─── 5. Audit verb ───────────────────────────────────────────────────────────
-- The whole list is re-declared on purpose: dropping the CHECK and re-adding it
-- only keeps the verbs written out here.

alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'user_created', 'user_deactivated', 'user_activated', 'user_deleted',
  'role_changed', 'login_success', 'login_failed', 'password_changed',
  'password_reset', 'data_cleared', 'auth_rejected', 'ai_config_updated',
  'ai_plan_committed', 'ai_repair_applied', 'ai_import_applied'
));

-- Verify after running:
--   select table_name, rowsecurity from pg_tables
--    where schemaname = 'public' and table_name in ('import_batches', 'import_rows');
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_schema = 'public' and table_name = 'sessions' and column_name = 'import_batch_id';
--   select conname from pg_constraint
--    where conrelid = 'public.audit_logs'::regclass and contype = 'c';

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping the staging tables loses every unapplied import and the trace of
-- applied ones. Sessions already written keep their times and links; only
-- `sessions.import_batch_id` goes back to null.
--
-- alter table public.audit_logs drop constraint if exists audit_logs_action_check;
-- alter table public.audit_logs add constraint audit_logs_action_check check (action in (
--   'user_created','user_deactivated','user_activated','user_deleted',
--   'role_changed','login_success','login_failed','password_changed',
--   'password_reset','data_cleared','auth_rejected','ai_config_updated',
--   'ai_plan_committed','ai_repair_applied'
-- ));
-- drop index if exists public.idx_sessions_import_batch_id;
-- alter table public.sessions drop column if exists import_batch_id;
-- drop table if exists public.import_rows;
-- drop table if exists public.import_batches;
