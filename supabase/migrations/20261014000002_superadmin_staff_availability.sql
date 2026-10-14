-- Grant superadmins full access to manage staff_availability
-- Follow-up to 20260516000010_superadmin_policies.sql, which missed staff_availability

DROP POLICY IF EXISTS "Admins can manage staff availability" ON staff_availability;
CREATE POLICY "Admins and superadmins can manage staff availability"
  ON staff_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Verification
SELECT 'staff_availability admin policy now includes superadmin' AS status;
