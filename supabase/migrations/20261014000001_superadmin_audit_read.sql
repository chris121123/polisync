-- Grant superadmins SELECT on audit_logs
-- Follow-up to 20260516000010_superadmin_policies.sql, which missed this policy

-- audit_logs
DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Verification
SELECT 'audit_logs_admin_read now includes superadmin' AS status;
