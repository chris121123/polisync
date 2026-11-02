-- Year Planner window. Empty (null) means the current calendar year; see src/lib/visualSchedule.js.
ALTER TABLE scheduling_settings
  ADD COLUMN IF NOT EXISTS year_start date,
  ADD COLUMN IF NOT EXISTS year_end date;
