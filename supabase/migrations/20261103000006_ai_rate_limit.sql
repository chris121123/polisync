-- AI rate limiting (phase 13e, plan §6.7): who made each call, and how many
-- calls one person may make per hour.
--
-- What this does
--   1. `ai_usage_events.user_id` — the caller behind every ledger row. The
--      60-minute limit counts this column; the ledger also stops being
--      anonymous, so a review can attribute cost.
--   2. `ai_config.rate_limit_per_hour` — calls one user may make in any rolling
--      60 minutes, summed across every AI edge (assistant, planner, import,
--      reports, the `ai-config:test` probe). No UI in 13e: change it with SQL.
--
-- Additive and reversible: no row is deleted, no column is narrowed, and RLS /
-- grants are untouched — `ai_usage_events` stays edge-only (no policy at all).
--
-- Ordering: apply this before deploying the edges that read these columns.
-- `assertRateLimit()` selects `user_id` and fails closed (500) if it is absent,
-- so the ledger and the caller must agree on the shape.
--
-- Rows written before this migration keep `user_id = null` and therefore count
-- toward nobody's window: no user is retroactively throttled.
--
-- Lock note: both ADD COLUMN forms are metadata-only (constant / nullable
-- default). The index is one pass over a ledger that holds ~10^3 rows. Run in a
-- quiet window anyway. Re-runnable: `if not exists` on columns and index,
-- drop-then-add on the CHECK.

-- ─── 1. Per-call attribution ─────────────────────────────────────────────────

alter table public.ai_usage_events
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_ai_usage_events_user_created
  on public.ai_usage_events (user_id, created_at);

comment on column public.ai_usage_events.user_id is 'Caller the AI call is billed to (profiles.id). Null for rows written before 13e; the hourly limit counts only this column.';

-- ─── 2. Hourly cap ───────────────────────────────────────────────────────────

alter table public.ai_config
  add column if not exists rate_limit_per_hour int not null default 60;

alter table public.ai_config drop constraint if exists ai_config_rate_limit_per_hour_check;
alter table public.ai_config
  add constraint ai_config_rate_limit_per_hour_check
  check (rate_limit_per_hour between 1 and 600);

comment on column public.ai_config.rate_limit_per_hour is 'AI calls one user may make in any rolling 60 minutes, across all AI edges. 1-600; default 60.';

-- Verify after running:
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'ai_usage_events'
--      and column_name = 'user_id';
--   select rate_limit_per_hour from public.ai_config where id = 1;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping these loses per-call attribution only; tokens, kinds and timestamps
-- stay, and the edges are throttled solely by the monthly cap again.
-- alter table public.ai_config drop constraint if exists ai_config_rate_limit_per_hour_check;
-- alter table public.ai_config drop column if exists rate_limit_per_hour;
-- drop index if exists public.idx_ai_usage_events_user_created;
-- alter table public.ai_usage_events drop column if exists user_id;
