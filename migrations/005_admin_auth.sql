-- ═══════════════════════════════════════════════════════════════════════════════
-- 005 - Admin-Controlled Authentication System
-- Prerequisites: 001_profiles.sql, 004_rbac_roles.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add is_active flag to profiles (controls login access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'must_change_password'
  ) THEN
    ALTER TABLE profiles ADD COLUMN must_change_password BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Audit Logs table — tracks user creation, role changes, login events
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  action TEXT NOT NULL CHECK (action IN (
    'user_created', 'user_deactivated', 'user_activated',
    'role_changed', 'login_success', 'login_failed',
    'password_changed', 'password_reset'
  )),
  performed_by UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs, nobody can modify via API
DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow inserts from service_role (Edge Functions) and admin context
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- 3. Function to check if a user account is active (used during login validation)
CREATE OR REPLACE FUNCTION is_user_active(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM profiles WHERE id = check_user_id),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Function to log audit events (callable from Edge Functions)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_performed_by UUID,
  p_target_user_id UUID,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (action, performed_by, target_user_id, details)
  VALUES (p_action, p_performed_by, p_target_user_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ VERIFICATION ═══════════════════════════════════════════════════════════
-- Run after migration to confirm:

-- Check new columns on profiles
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_active', 'must_change_password');

-- Check audit_logs table exists
SELECT 'audit_logs' as table_name, count(*) as rows FROM audit_logs;
