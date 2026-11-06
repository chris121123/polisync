-- AI reports (phase 13d, plan §5.4 / D7).
--
-- What this does
--   Widens `audit_logs.action` with `ai_report_generated`, the verb the
--   `ai-reports` edge writes after a brief is generated. Reports themselves
--   live in `ai_jobs.result` (kind `report`), so no table is added.
--
-- Additive and reversible: no row is deleted and no existing column is
-- narrowed.
--
-- Lock note: ADD CONSTRAINT ... CHECK validates `audit_logs` under ACCESS
-- EXCLUSIVE, so writes wait; one school, ~10^4 audit rows: sub-second. Run in a
-- quiet window anyway. Re-runnable: `drop ... if exists` then re-add.

-- ─── Audit verb ─────────────────────────────────────────────────────────────
-- The whole list is re-declared on purpose: dropping the CHECK and re-adding it
-- only keeps the verbs written out here.

alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in (
  'user_created', 'user_deactivated', 'user_activated', 'user_deleted',
  'role_changed', 'login_success', 'login_failed', 'password_changed',
  'password_reset', 'data_cleared', 'auth_rejected', 'ai_config_updated',
  'ai_plan_committed', 'ai_repair_applied', 'ai_import_applied',
  'ai_report_generated'
));

-- Verify after running:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.audit_logs'::regclass and contype = 'c';

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping the verb loses nothing already written; report jobs keep their rows.
--
-- alter table public.audit_logs drop constraint if exists audit_logs_action_check;
-- alter table public.audit_logs add constraint audit_logs_action_check check (action in (
--   'user_created','user_deactivated','user_activated','user_deleted',
--   'role_changed','login_success','login_failed','password_changed',
--   'password_reset','data_cleared','auth_rejected','ai_config_updated',
--   'ai_plan_committed','ai_repair_applied','ai_import_applied'
-- ));
