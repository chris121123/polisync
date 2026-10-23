-- M2 — Anonymous read hardening: every open read policy becomes
--      `FOR SELECT TO authenticated USING (true)`, and `anon` loses all
--      table/sequence grants in `public`.
--
-- What this does
--   1. Re-creates each `_auth_read` / "everyone can read" policy with an
--      explicit `TO authenticated` so `anon` no longer matches them.
--   2. Removes the leftover `FOR ALL USING (true)` policies that let anonymous
--      callers write staff availability and the scheduling log.
--   3. Revokes every privilege `anon` holds on `public` tables and sequences,
--      and stops future tables from silently re-opening the anonymous path.
--
-- What must be true before it runs
--   * Nothing reads `public` anonymously: the login page and the public
--     About/FAQ pages make no Supabase calls (verified in the plan §7).
--     A public page that queries the DB after this will return 0 rows.
--   * `anon` does not need to INSERT notifications; that insert could never
--     succeed anyway because `auth.uid()` is null for anon.
--   * Re-runnable. `CREATE POLICY` has no IF NOT EXISTS, so every created policy
--     is preceded by `DROP POLICY IF EXISTS` of the same name.
--
-- Order: §10 applies this before M1.

-- ── profiles ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_staff_read" ON public.profiles;
CREATE POLICY "profiles_staff_read" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- ── students / sessions / rooms / programs / student_programs / student_availability ──
DROP POLICY IF EXISTS "students_auth_read" ON public.students;
CREATE POLICY "students_auth_read" ON public.students
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sessions_auth_read" ON public.sessions;
CREATE POLICY "sessions_auth_read" ON public.sessions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rooms_auth_read" ON public.rooms;
CREATE POLICY "rooms_auth_read" ON public.rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "programs_auth_read" ON public.programs;
CREATE POLICY "programs_auth_read" ON public.programs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "student_programs_auth_read" ON public.student_programs;
CREATE POLICY "student_programs_auth_read" ON public.student_programs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "student_availability_auth_read" ON public.student_availability;
CREATE POLICY "student_availability_auth_read" ON public.student_availability
  FOR SELECT TO authenticated USING (true);

-- ── staff_availability: "Anyone can view …" -> logged-in only ───────────────
DROP POLICY IF EXISTS "Anyone can view staff availability" ON public.staff_availability;
DROP POLICY IF EXISTS "staff_availability_read" ON public.staff_availability;
CREATE POLICY "staff_availability_read" ON public.staff_availability
  FOR SELECT TO authenticated USING (true);

-- ── THE TWO FORGOTTEN TABLES (created in 20260516000003, never dropped) ─────
DROP POLICY IF EXISTS "Allow all teacher_availability" ON public.teacher_availability;
DROP POLICY IF EXISTS "teacher_availability_read"       ON public.teacher_availability;
DROP POLICY IF EXISTS "teacher_availability_admin_write" ON public.teacher_availability;

CREATE POLICY "teacher_availability_read" ON public.teacher_availability
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "teacher_availability_admin_write" ON public.teacher_availability
  FOR ALL TO authenticated
  USING (public.is_admin() OR teacher_id = auth.uid())
  WITH CHECK (public.is_admin() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "Allow all session_scheduling_log" ON public.session_scheduling_log;
DROP POLICY IF EXISTS "session_scheduling_log_read"       ON public.session_scheduling_log;
DROP POLICY IF EXISTS "session_scheduling_log_admin_write" ON public.session_scheduling_log;

CREATE POLICY "session_scheduling_log_read" ON public.session_scheduling_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "session_scheduling_log_admin_write" ON public.session_scheduling_log
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Same 00003 leftovers the plan missed (verified at 20260516000003:121-126).
-- Three more `FOR ALL USING (true)` policies were also never dropped. Dropping
-- them leaves the admin-only write policies as the only writers; the read
-- policies above (student_*) and below (scheduling_settings) keep the UI working.
DROP POLICY IF EXISTS "Allow all student_availability" ON public.student_availability;
DROP POLICY IF EXISTS "Allow all student_programs"     ON public.student_programs;

DROP POLICY IF EXISTS "Allow all scheduling_settings" ON public.scheduling_settings;
DROP POLICY IF EXISTS "scheduling_settings_read"      ON public.scheduling_settings;
CREATE POLICY "scheduling_settings_read" ON public.scheduling_settings
  FOR SELECT TO authenticated USING (true);

-- ── Belt and braces: no anonymous access to public tables or sequences ─────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- WARNING: this restores anonymous reads of students' diagnoses and staff PII.
--
-- DROP POLICY IF EXISTS "profiles_staff_read" ON public.profiles;
-- CREATE POLICY "profiles_staff_read" ON public.profiles
--   FOR SELECT USING (true);
--
-- DROP POLICY IF EXISTS "students_auth_read" ON public.students;
-- CREATE POLICY "students_auth_read" ON public.students FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "sessions_auth_read" ON public.sessions;
-- CREATE POLICY "sessions_auth_read" ON public.sessions FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "rooms_auth_read" ON public.rooms;
-- CREATE POLICY "rooms_auth_read" ON public.rooms FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "programs_auth_read" ON public.programs;
-- CREATE POLICY "programs_auth_read" ON public.programs FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "student_programs_auth_read" ON public.student_programs;
-- CREATE POLICY "student_programs_auth_read" ON public.student_programs FOR SELECT USING (true);
-- DROP POLICY IF EXISTS "student_availability_auth_read" ON public.student_availability;
-- CREATE POLICY "student_availability_auth_read" ON public.student_availability FOR SELECT USING (true);
--
-- DROP POLICY IF EXISTS "staff_availability_read" ON public.staff_availability;
-- CREATE POLICY "Anyone can view staff availability" ON public.staff_availability
--   FOR SELECT TO authenticated USING (true);
--
-- DROP POLICY IF EXISTS "teacher_availability_read"        ON public.teacher_availability;
-- DROP POLICY IF EXISTS "teacher_availability_admin_write" ON public.teacher_availability;
-- CREATE POLICY "Allow all teacher_availability" ON public.teacher_availability FOR ALL USING (true);
--
-- DROP POLICY IF EXISTS "session_scheduling_log_read"        ON public.session_scheduling_log;
-- DROP POLICY IF EXISTS "session_scheduling_log_admin_write" ON public.session_scheduling_log;
-- CREATE POLICY "Allow all session_scheduling_log" ON public.session_scheduling_log FOR ALL USING (true);
--
-- DROP POLICY IF EXISTS "scheduling_settings_read" ON public.scheduling_settings;
-- CREATE POLICY "Allow all scheduling_settings" ON public.scheduling_settings FOR ALL USING (true);
-- CREATE POLICY "Allow all student_availability" ON public.student_availability FOR ALL USING (true);
-- CREATE POLICY "Allow all student_programs"     ON public.student_programs     FOR ALL USING (true);
--
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;      -- Supabase defaults; re-opens writes
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
