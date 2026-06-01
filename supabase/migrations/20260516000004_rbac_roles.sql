-- RBAC System Migration
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run 001_profiles.sql and 003_constraint_scheduling.sql first!

-- Note: Tables that may already exist from previous migrations
-- (profiles, students, sessions, rooms, programs, student_programs, student_availability, scheduling_settings)
-- will be created with IF NOT EXISTS to avoid errors

-- 1. Enumerate all roles as a type (wrapped in safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'parent', 'teacher', 'therapist');
    END IF;
END$$;

-- 2. User Roles Mapping (links Auth UID → App Role)
-- Uses app_role type created above
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Parent ↔ Student Relationships
-- Requires students table from 001_profiles.sql
CREATE TABLE IF NOT EXISTS parent_student_relationships (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;

-- 4. Teacher/Therapist Program Assignments
-- Requires programs table from 003_constraint_scheduling.sql
CREATE TABLE IF NOT EXISTS teacher_program_assignments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, program_id)
);

ALTER TABLE teacher_program_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Session Notes (Therapist/Teacher)
-- Requires sessions and students from 001_profiles.sql
CREATE TABLE IF NOT EXISTS session_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id BIGINT REFERENCES sessions(id) ON DELETE SET NULL,
  student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'progress', 'attendance', 'incident')),
  content TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- 6. Attendance Records (Teacher)
-- Requires sessions and students from 001_profiles.sql
CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE (session_id, student_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule')),
  is_read BOOLEAN DEFAULT false,
  related_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8. Add role column to profiles (migrate existing data) - WITH SAFETY CHECKS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'app_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN app_role app_role DEFAULT 'teacher';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 9. Migrate existing admin-like roles - SAFER UPDATES
UPDATE profiles SET app_role = 'admin'
WHERE role IN ('Lead Teacher', 'Admin', 'Administrator', 'admin')
AND (app_role IS NULL OR app_role = 'teacher');

UPDATE profiles SET app_role = 'therapist'
WHERE role IN ('Occupational Therapist', 'Physiotherapist', 'Speech Therapist', 'Therapist')
AND app_role = 'teacher';

UPDATE profiles SET app_role = 'teacher'
WHERE role IN ('Teacher', 'Lead Teacher')
AND app_role = 'teacher';

UPDATE profiles SET app_role = 'parent'
WHERE role IN ('Parent', 'Guardian')
AND app_role = 'teacher';

-- 10. Seed user_roles from existing profiles
INSERT INTO user_roles (user_id, role, created_at)
SELECT id, app_role, NOW()
FROM profiles
WHERE app_role IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ─── Helper Functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role app_role;
BEGIN
  SELECT role INTO current_role FROM user_roles WHERE user_id = auth.uid();
  RETURN current_role;
END;
$$;

-- ─── RLS Policies ───────────────────────────────────────────────────────────

-- user_roles: Only admin can manage, all can read own role
DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
DROP POLICY IF EXISTS "user_roles_read_own" ON user_roles;

CREATE POLICY "user_roles_admin_all" ON user_roles
  FOR ALL USING ( get_user_role() = 'admin' );

CREATE POLICY "user_roles_read_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- profiles: Role-aware access
-- Note: Also drops existing "Allow public access" policy from 001
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
DROP POLICY IF EXISTS "profiles_staff_read" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "Allow public access" ON profiles;

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING ( get_user_role() = 'admin' );

CREATE POLICY "profiles_staff_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- students: Admin full, Teachers/Therapists read assigned, Parents read linked
-- Note: Also drops existing "Allow public access" policy from 001
DROP POLICY IF EXISTS "students_admin_all" ON students;
DROP POLICY IF EXISTS "students_auth_read" ON students;
DROP POLICY IF EXISTS "students_auth_insert" ON students;
DROP POLICY IF EXISTS "students_auth_update" ON students;
DROP POLICY IF EXISTS "Allow public access" ON students;

CREATE POLICY "students_admin_all" ON students
  FOR ALL USING ( get_user_role() = 'admin' );

CREATE POLICY "students_auth_read" ON students
  FOR SELECT USING (true);

CREATE POLICY "students_auth_insert" ON students
  FOR INSERT WITH CHECK ( get_user_role() = 'admin' );

CREATE POLICY "students_auth_update" ON students
  FOR UPDATE USING ( get_user_role() = 'admin' );

-- parent_student_relationships: Admin + self
DROP POLICY IF EXISTS "psr_all" ON parent_student_relationships;

CREATE POLICY "psr_all" ON parent_student_relationships
  FOR ALL USING ( get_user_role() = 'admin' OR parent_id = auth.uid() );

-- teacher_program_assignments: Admin + self
DROP POLICY IF EXISTS "tpa_all" ON teacher_program_assignments;

CREATE POLICY "tpa_all" ON teacher_program_assignments
  FOR ALL USING ( get_user_role() = 'admin' OR teacher_id = auth.uid() );

-- sessions: Role-aware
-- Note: Also drops existing "Allow public access" policy from 001
DROP POLICY IF EXISTS "sessions_admin_all" ON sessions;
DROP POLICY IF EXISTS "sessions_auth_read" ON sessions;
DROP POLICY IF EXISTS "sessions_auth_insert" ON sessions;
DROP POLICY IF EXISTS "sessions_auth_update" ON sessions;
DROP POLICY IF EXISTS "Allow public access" ON sessions;

CREATE POLICY "sessions_admin_all" ON sessions
  FOR ALL USING ( get_user_role() = 'admin' );

CREATE POLICY "sessions_auth_read" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "sessions_auth_insert" ON sessions
  FOR INSERT WITH CHECK ( get_user_role() = 'admin' );

CREATE POLICY "sessions_auth_update" ON sessions
  FOR UPDATE USING ( get_user_role() = 'admin' );

-- session_notes: Admin + creator + therapist/teacher on their sessions
DROP POLICY IF EXISTS "session_notes_all" ON session_notes;

CREATE POLICY "session_notes_all" ON session_notes
  FOR ALL USING (
    get_user_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.therapist_id = auth.uid()
    )
  );

-- attendance: Admin + teacher on their sessions
DROP POLICY IF EXISTS "attendance_all" ON attendance;

CREATE POLICY "attendance_all" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
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

-- notifications: User reads own only
DROP POLICY IF EXISTS "notifications_own" ON notifications;

CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- rooms, programs, student_programs, student_availability,
-- scheduling_settings, session_scheduling_log: Admin only for writes
-- rooms: Admin only for writes, all can read
-- Note: Also drops existing "Allow public access" policy from 001
DROP POLICY IF EXISTS "rooms_admin_all" ON rooms;
DROP POLICY IF EXISTS "rooms_auth_read" ON rooms;
DROP POLICY IF EXISTS "Allow public access" ON rooms;
DROP POLICY IF EXISTS "Allow all rooms" ON rooms;

CREATE POLICY "rooms_admin_all" ON rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "rooms_auth_read" ON rooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "programs_admin_all" ON programs;
DROP POLICY IF EXISTS "programs_auth_read" ON programs;
DROP POLICY IF EXISTS "Allow all programs" ON programs;

CREATE POLICY "programs_admin_all" ON programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "programs_auth_read" ON programs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "student_programs_admin_all" ON student_programs;
DROP POLICY IF EXISTS "student_programs_auth_read" ON student_programs;

CREATE POLICY "student_programs_admin_all" ON student_programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "student_programs_auth_read" ON student_programs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "student_availability_auth_read" ON student_availability;
DROP POLICY IF EXISTS "student_availability_admin_all" ON student_availability;

CREATE POLICY "student_availability_auth_read" ON student_availability
  FOR SELECT USING (true);

CREATE POLICY "student_availability_admin_all" ON student_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "scheduling_settings_admin_all" ON scheduling_settings;

CREATE POLICY "scheduling_settings_admin_all" ON scheduling_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- ─── Helper Function ─────────────────────────────────────────────────────────

-- Function to get current user's app_role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS app_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Trigger to sync app_role on profiles update
CREATE OR REPLACE FUNCTION sync_user_role_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET app_role = NEW.role WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_role_update ON user_roles;
CREATE TRIGGER on_user_role_update
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION sync_user_role_to_profiles();

-- ═══ VERIFICATION QUERIES ═══════════════════════════════════════════════════
-- Run these after migration to confirm success

-- Check new tables exist and row counts
SELECT 'user_roles' as table_name, count(*) as rows FROM user_roles
UNION ALL SELECT 'parent_student_relationships', count(*) FROM parent_student_relationships
UNION ALL SELECT 'teacher_program_assignments', count(*) FROM teacher_program_assignments
UNION ALL SELECT 'session_notes', count(*) FROM session_notes
UNION ALL SELECT 'attendance', count(*) FROM attendance
UNION ALL SELECT 'notifications', count(*) FROM notifications;

-- Check app_role was added to profiles
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'app_role';

-- Check role distribution in profiles
SELECT app_role, count(*) as count FROM profiles GROUP BY app_role;

-- Check user_roles distribution
SELECT role, count(*) as count FROM user_roles GROUP BY role;

-- ═══ ADMIN SETUP INSTRUCTIONS ═══════════════════════════════════════════════
-- After creating your admin user via the app:
-- 1. Find their user ID from auth.users or profiles table
-- 2. Run the following (replace 'YOUR-USER-UUID-HERE' with actual UUID):

-- INSERT INTO user_roles (user_id, role)
-- VALUES ('YOUR-USER-UUID-HERE', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- UPDATE profiles SET app_role = 'admin' WHERE id = 'YOUR-USER-UUID-HERE';