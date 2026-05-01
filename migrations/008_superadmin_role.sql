-- Migration: Add 'superadmin' to the app_role enum type
-- Run this in Supabase SQL Editor BEFORE promoting any user to superadmin

-- 1. Add 'superadmin' value to the existing app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Update the get_user_role() function to also recognize superadmin as admin-level
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Update is_admin() to recognize superadmin as having admin privileges
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Update all RLS policies that check for 'admin' to also accept 'superadmin'

-- user_roles: superadmin + admin can manage all
DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

-- profiles: superadmin + admin can manage all
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

-- students: superadmin + admin full access
DROP POLICY IF EXISTS "students_admin_all" ON students;
CREATE POLICY "students_admin_all" ON students
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

DROP POLICY IF EXISTS "students_auth_insert" ON students;
CREATE POLICY "students_auth_insert" ON students
  FOR INSERT WITH CHECK ( get_user_role() IN ('admin', 'superadmin') );

DROP POLICY IF EXISTS "students_auth_update" ON students;
CREATE POLICY "students_auth_update" ON students
  FOR UPDATE USING ( get_user_role() IN ('admin', 'superadmin') );

-- parent_student_relationships
DROP POLICY IF EXISTS "psr_all" ON parent_student_relationships;
CREATE POLICY "psr_all" ON parent_student_relationships
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') OR parent_id = auth.uid() );

-- teacher_program_assignments
DROP POLICY IF EXISTS "tpa_all" ON teacher_program_assignments;
CREATE POLICY "tpa_all" ON teacher_program_assignments
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') OR teacher_id = auth.uid() );

-- sessions
DROP POLICY IF EXISTS "sessions_admin_all" ON sessions;
CREATE POLICY "sessions_admin_all" ON sessions
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

DROP POLICY IF EXISTS "sessions_auth_insert" ON sessions;
CREATE POLICY "sessions_auth_insert" ON sessions
  FOR INSERT WITH CHECK ( get_user_role() IN ('admin', 'superadmin') );

DROP POLICY IF EXISTS "sessions_auth_update" ON sessions;
CREATE POLICY "sessions_auth_update" ON sessions
  FOR UPDATE USING ( get_user_role() IN ('admin', 'superadmin') );

-- session_notes
DROP POLICY IF EXISTS "session_notes_all" ON session_notes;
CREATE POLICY "session_notes_all" ON session_notes
  FOR ALL USING (
    get_user_role() IN ('admin', 'superadmin')
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.therapist_id = auth.uid()
    )
  );

-- attendance
DROP POLICY IF EXISTS "attendance_all" ON attendance;
CREATE POLICY "attendance_all" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
    OR EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.therapist_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'teacher'
    )
  );

-- rooms
DROP POLICY IF EXISTS "rooms_admin_all" ON rooms;
CREATE POLICY "rooms_admin_all" ON rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- programs
DROP POLICY IF EXISTS "programs_admin_all" ON programs;
CREATE POLICY "programs_admin_all" ON programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- student_programs
DROP POLICY IF EXISTS "student_programs_admin_all" ON student_programs;
CREATE POLICY "student_programs_admin_all" ON student_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- student_availability
DROP POLICY IF EXISTS "student_availability_admin_all" ON student_availability;
CREATE POLICY "student_availability_admin_all" ON student_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- scheduling_settings
DROP POLICY IF EXISTS "scheduling_settings_admin_all" ON scheduling_settings;
CREATE POLICY "scheduling_settings_admin_all" ON scheduling_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'superadmin')
    )
  );

-- 5. Verification
SELECT unnest(enum_range(NULL::app_role)) AS available_roles;
