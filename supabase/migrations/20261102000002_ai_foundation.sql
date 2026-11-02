-- AI foundation (phase 13a): provider config, job ledger, usage ledger and the
-- assistant transcript.
--
-- What this does
--   1. `ai_config` — one row (id = 1) holding the BYO provider setup. The
--      `api_key` column is write-only in practice: no client policy exists and
--      the table grants are revoked, so only the service role (edges) reads it.
--   2. `ai_jobs` / `ai_usage_events` — proposal ledger and per-call cost ledger.
--      Edge-only for the same reason: they carry aliased prompt payloads.
--   3. `assistant_threads` / `assistant_messages` — chat history, owner-only
--      through RLS (display text, per D2).
--   4. Widens `audit_logs.action` with `ai_config_updated`; without this the
--      ai-config `save` audit insert fails the CHECK and the trail is lost.
--
-- No policy at all on ai_config, ai_jobs, ai_usage_events: RLS default-denies
-- every client role, and the explicit REVOKE is the belt to that braces.
--
-- Re-runnable: `create table if not exists`, `drop policy if exists` before
-- every create, `on conflict do nothing` on the seed.

-- ─── 1. Provider config ──────────────────────────────────────────────────────

create table if not exists public.ai_config (
  id                 int primary key default 1 check (id = 1),
  enabled            boolean not null default false,
  assistant_on       boolean not null default true,
  planner_on         boolean not null default false,
  repair_on          boolean not null default false,
  extract_on         boolean not null default false,
  reports_on         boolean not null default false,
  base_url           text,
  model              text,
  vision_model       text,
  api_key            text,
  monthly_token_cap  int not null default 1000000,
  timeout_seconds    int not null default 60,
  max_output_tokens  int,
  last_test_ok       boolean,
  last_test_at       timestamptz,
  updated_at         timestamptz not null default now(),
  updated_by         uuid references public.profiles(id) on delete set null
);

comment on table public.ai_config is 'Single row (id = 1) with the AI provider setup; readable and writable only by edges using the service role.';
comment on column public.ai_config.api_key is 'Write-only provider key: only the service role reads it; ai-config:get returns hasKey and never this value.';

insert into public.ai_config (id) values (1) on conflict (id) do nothing;

-- ─── 2. Job + usage ledgers ──────────────────────────────────────────────────

create table if not exists public.ai_jobs (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('base', 'repair', 'extract', 'report')),
  status             text not null default 'queued'
                       check (status in ('queued', 'running', 'awaiting_confirm', 'done', 'error', 'cancelled')),
  mode               text,
  payload            jsonb not null default '{}'::jsonb,
  result             jsonb,
  confirm_token      text,
  confirm_expires_at timestamptz,
  error              text,
  tokens_in          int not null default 0,
  tokens_out         int not null default 0,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  finished_at        timestamptz
);

create table if not exists public.ai_usage_events (
  id          bigint primary key generated always as identity,
  job_id      uuid references public.ai_jobs(id) on delete set null,
  kind        text not null,
  model       text,
  tokens_in   int not null default 0,
  tokens_out  int not null default 0,
  ms          int,
  status      text,
  created_at  timestamptz not null default now()
);

-- ─── 3. Assistant transcript ─────────────────────────────────────────────────

create table if not exists public.assistant_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.assistant_threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────

create index if not exists idx_ai_usage_events_created_at on public.ai_usage_events (created_at);
create index if not exists idx_assistant_messages_thread_created on public.assistant_messages (thread_id, created_at);
create index if not exists idx_ai_jobs_created_by_created on public.ai_jobs (created_by, created_at);

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────

alter table public.ai_config enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;

-- Edge-only tables: no policy means no client row is ever visible.
revoke all on public.ai_config, public.ai_jobs, public.ai_usage_events from anon, authenticated;

-- Owner-only reads. No insert/update/delete policies: writes go through edges.
drop policy if exists "assistant_threads_owner_read" on public.assistant_threads;
create policy "assistant_threads_owner_read" on public.assistant_threads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "assistant_messages_owner_read" on public.assistant_messages;
create policy "assistant_messages_owner_read" on public.assistant_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.assistant_threads t
       where t.id = assistant_messages.thread_id
         and t.user_id = auth.uid()
    )
  );

-- ─── 6. Audit verb ───────────────────────────────────────────────────────────

alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'user_created', 'user_deactivated', 'user_activated', 'user_deleted',
  'role_changed', 'login_success', 'login_failed', 'password_changed',
  'password_reset', 'data_cleared', 'auth_rejected', 'ai_config_updated'
));

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping these tables loses the AI config (including the stored key) and the
-- transcript history. Export both first if the data matters.
--
-- drop table if exists public.assistant_messages;
-- drop table if exists public.assistant_threads;
-- drop table if exists public.ai_usage_events;
-- drop table if exists public.ai_jobs;
-- drop table if exists public.ai_config;
-- alter table public.audit_logs drop constraint if exists audit_logs_action_check;
-- alter table public.audit_logs add constraint audit_logs_action_check check (action in (
--   'user_created', 'user_deactivated', 'user_activated', 'user_deleted',
--   'role_changed', 'login_success', 'login_failed', 'password_changed',
--   'password_reset', 'data_cleared', 'auth_rejected'
-- ));
