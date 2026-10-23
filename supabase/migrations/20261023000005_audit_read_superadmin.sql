-- M5 — Let superadmins read the audit trail.
-- What: replaces the live `audit_logs_admin_read` policy (role = 'admin' only)
--       with one that delegates to public.is_admin(), which is true for both
--       'admin' and 'superadmin'.
-- Why: 20261014000001_superadmin_audit_read.sql was never applied to the live
--       project, so the policy is still the one from 20260516000005:42-49.
--       Result: superadmins get 0 rows from the System Console Audit Trail while
--       rows exist (set_user_role commits its audit insert in the same txn).
-- Must run after M3 (audit_hardening). M3 revokes writes and leaves reads
--       untouched; this file is the read half. Re-runnable: drop before create.
-- Requires: public.is_admin() — created in 20260516000004, widened to
--       admin + superadmin in 20260516000010, re-pinned by M1.

DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Restores the original admin-only policy from 20260516000005:42-49.
-- DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
-- CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.user_roles ur
--       WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
--     )
--   );
