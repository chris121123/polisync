-- M3 — Audit hardening: complete action list, append-only table, pinned
--      `log_audit_event`.
--
-- What this does
--   1. Widens `audit_logs.action` so `user_deleted`, `data_cleared` and
--      `auth_rejected` are legal (today `user_deleted` is rejected, which is why
--      every deletion is silently unaudited).
--   2. Drops the `audit_logs_insert WITH CHECK (true)` policy and removes
--      INSERT/UPDATE/DELETE from `anon` and `authenticated`. Only `service_role`
--      and the SECURITY DEFINER RPCs (owned by postgres) can write.
--   3. Re-creates `log_audit_event` with a pinned `search_path` and removes
--      EXECUTE from PUBLIC/anon/authenticated.
--
-- What must be true before it runs
--   * **Must run BEFORE the updated `admin-delete-user`** (plan §3.2). That
--     function fails closed when the audit insert fails; if it ships first,
--     every deletion is blocked by the old CHECK.
--   * Must run before the frontend stops writing `audit_logs` directly
--     (`GlobalStateContext.jsx:659,687`): those inserts start failing here.
--   * Existing rows can only hold the eight legacy action values, because the
--     old CHECK enforced them — so the new, wider CHECK validates cleanly.
--   * `audit_logs.action` carries the auto-generated constraint name
--     `audit_logs_action_check` (inline CHECK from 20260516000005:27).
--   * Re-runnable: the constraint is dropped before it is re-added.
--
-- Note: ADD CONSTRAINT validates the table under an ACCESS EXCLUSIVE lock.
-- `audit_logs` is small (single-digit rows at authoring time), so this is a
-- sub-second lock. On a large table, expect a longer write block.

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
  'user_created','user_deactivated','user_activated','user_deleted',
  'role_changed','login_success','login_failed','password_changed',
  'password_reset','data_cleared','auth_rejected'
));

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text, p_performed_by uuid, p_target_user_id uuid, p_details jsonb DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, performed_by, target_user_id, details)
  VALUES (p_action, p_performed_by, p_target_user_id, p_details);
END $$;

REVOKE ALL ON FUNCTION public.log_audit_event(text, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

-- Reads stay as defined in 20261014000001 (admin + superadmin). Unchanged.

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- WARNING: the old CHECK only accepts the eight legacy actions. Re-adding it
-- FAILS if any row already holds user_deleted / data_cleared / auth_rejected.
-- Delete or migrate those rows first.
--
-- ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
-- ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
--   'user_created','user_deactivated','user_activated',
--   'role_changed','login_success','login_failed',
--   'password_changed','password_reset'
-- ));
--
-- CREATE POLICY "audit_logs_insert" ON public.audit_logs
--   FOR INSERT WITH CHECK (true);
-- GRANT INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated;
--
-- -- Restore the pre-M3 function body (no pinned search_path):
-- CREATE OR REPLACE FUNCTION public.log_audit_event(
--   p_action text, p_performed_by uuid, p_target_user_id uuid, p_details jsonb DEFAULT '{}'
-- ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   INSERT INTO public.audit_logs (action, performed_by, target_user_id, details)
--   VALUES (p_action, p_performed_by, p_target_user_id, p_details);
-- END $$;
-- GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, uuid, jsonb)
--   TO PUBLIC, anon, authenticated;
