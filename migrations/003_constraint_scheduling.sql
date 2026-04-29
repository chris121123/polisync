-- Constraint-Based Scheduling System Migration
-- Run this in Supabase SQL Editor

-- 1. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sped', 'rehab', 'playschool', 'therapy', 'class', 'other')),
  default_duration_hours DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  min_students INT NOT NULL DEFAULT 1,
  max_students INT NOT NULL DEFAULT 1,
  requires_certification TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENT AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS student_availability (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  student_id BIGINT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 4),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_window CHECK (start_time < end_time)
);

-- 3. TEACHER AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS teacher_availability (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  teacher_id UUID NOT NULL,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 4),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  specific_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_teacher_time CHECK (start_time < end_time)
);

-- 4. STUDENT PROGRAMS (Requirements)
CREATE TABLE IF NOT EXISTS student_programs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  student_id BIGINT NOT NULL,
  program_id BIGINT NOT NULL,
  sessions_per_week INT NOT NULL DEFAULT 1,
  preferred_duration_hours DECIMAL(3,1),
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  assigned_teacher_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SCHEDULING SETTINGS
CREATE TABLE IF NOT EXISTS scheduling_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  min_break_minutes INT NOT NULL DEFAULT 15,
  travel_time_minutes INT NOT NULL DEFAULT 0,
  operating_start_time TIME NOT NULL DEFAULT '08:00',
  operating_end_time TIME NOT NULL DEFAULT '17:00',
  allow_overbook BOOLEAN DEFAULT false,
  max_daily_hours_per_student DECIMAL(4,1) DEFAULT 4.0,
  auto_schedule_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO scheduling_settings (min_break_minutes, travel_time_minutes, operating_start_time, operating_end_time)
VALUES (15, 0, '08:00', '17:00')
ON CONFLICT DO NOTHING;

-- 6. SESSION SCHEDULING LOG
CREATE TABLE IF NOT EXISTS session_scheduling_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  student_program_id BIGINT,
  session_id BIGINT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_by UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rolled_back')),
  failure_reason TEXT,
  attempt_number INT DEFAULT 1,
  metadata JSONB DEFAULT '{}'
);

-- 7. UPDATE EXISTING TABLES
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS program_id BIGINT,
  ADD COLUMN IF NOT EXISTS day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 4),
  ADD COLUMN IF NOT EXISTS recurring_weeks INT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS max_daily_hours DECIMAL(4,1) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS requires_travel_buffer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS min_capacity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS equipment TEXT[] DEFAULT '{}';

-- 8. RLS POLICIES
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_scheduling_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all programs" ON programs FOR ALL USING (true);
CREATE POLICY "Allow all student_availability" ON student_availability FOR ALL USING (true);
CREATE POLICY "Allow all teacher_availability" ON teacher_availability FOR ALL USING (true);
CREATE POLICY "Allow all student_programs" ON student_programs FOR ALL USING (true);
CREATE POLICY "Allow all scheduling_settings" ON scheduling_settings FOR ALL USING (true);
CREATE POLICY "Allow all session_scheduling_log" ON session_scheduling_log FOR ALL USING (true);

-- 9. SEED DATA
INSERT INTO programs (name, type, default_duration_hours, min_students, max_students, color, description)
VALUES 
  ('SPED - Individual', 'sped', 1.0, 1, 1, '#8b5cf6', 'Special Education individual session'),
  ('SPED - Group A', 'sped', 1.5, 2, 4, '#a78bfa', 'Special Education small group'),
  ('OT Therapy', 'rehab', 1.0, 1, 1, '#0ea5e9', 'Occupational Therapy'),
  ('Speech Therapy', 'rehab', 1.0, 1, 1, '#06b6d4', 'Speech-Language Pathology'),
  ('Playgroup Morning', 'playschool', 2.0, 3, 6, '#f59e0b', 'Morning playschool group'),
  ('Playgroup Afternoon', 'playschool', 2.0, 3, 6, '#fbbf24', 'Afternoon playschool group')
ON CONFLICT DO NOTHING;