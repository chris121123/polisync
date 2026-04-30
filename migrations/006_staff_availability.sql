-- ============================================================================
-- Migration 006: Staff Availability & Date-based Sessions
-- ============================================================================

-- 1. Staff Availability table
--    Tracks which therapists/teachers are available on specific dates
CREATE TABLE IF NOT EXISTS staff_availability (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_hour  INTEGER DEFAULT 8 CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour    INTEGER DEFAULT 17 CHECK (end_hour >= 0 AND end_hour <= 23),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, available_date)
);

-- 2. Add session_date column to sessions table
--    This allows sessions to be tied to a specific calendar date
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_date DATE;

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_availability_date ON staff_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_staff_availability_staff ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);

-- 4. RLS policies for staff_availability
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read availability
CREATE POLICY "Anyone can view staff availability"
  ON staff_availability FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage availability
CREATE POLICY "Admins can manage staff availability"
  ON staff_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow staff to manage their own availability
CREATE POLICY "Staff can manage own availability"
  ON staff_availability FOR ALL
  TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

-- 5. Enable realtime for staff_availability
ALTER PUBLICATION supabase_realtime ADD TABLE staff_availability;
