-- STEP 2 OF 2: Update RLS policies and functions for superadmin
-- Run this AFTER 008a_superadmin_enum.sql has been committed

-- Update get_user_role() function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update is_admin() to recognize superadmin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update all RLS policies to accept superadmin alongside admin

-- user_roles
DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

-- profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING ( get_user_role() IN ('admin', 'superadmin') );

-- students
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

-- Verification
SELECT 'Policies updated successfully!' AS status;
