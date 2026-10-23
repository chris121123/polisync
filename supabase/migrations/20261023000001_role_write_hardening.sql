-- M1 — Role write hardening: user_roles, profiles columns, cross-tenant links.
--
-- What this does
--   1. Pins `search_path` on every SECURITY DEFINER helper.
--   2. Replaces the single `user_roles_admin_all FOR ALL` policy with four
--      command-scoped policies and a superadmin boundary.
--   3. Revokes the table-level UPDATE on `profiles` from `authenticated`, then
--      grants UPDATE on an explicit positive column list only.
--   4. Makes parent links and teacher/program assignments admin-only for writes.
--   5. Restricts notification inserts to yourself or an admin.
--   6. Adds `set_user_role` / `set_user_active` RPCs that authorise the caller,
--      enforce the superadmin boundary, and write the audit row in the same
--      transaction.
--
-- What must be true before it runs
--   * `app_role` already contains 'superadmin' (20260516000008 / 00009).
--   * `user_roles` still has UNIQUE (user_id), `updated_at`, and the
--     `on_user_role_update` trigger from 20260516000004.
--   * The frontend that calls the two RPCs ships in the SAME release.
--     Section 3 revokes the table-level UPDATE on `profiles`, so until
--     `updateUserRole`, `toggleUserActive` and the stale `profiles.app_role`
--     write are gone, the admin screens cannot write those columns (ADR-005).
--   * Section 2 drops `user_roles_admin_all`, so direct client writes to
--     `user_roles` stop working the moment this runs. §10 wanted that drop one
--     deploy later; one file cannot express two phases. See the report.
--
-- Order: §10 applies M2 before this file. Either order is safe. Re-runnable.

-- ── 1. Helper functions: pin search_path on every SECURITY DEFINER function ──
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','superadmin')
  )
$$;

CREATE OR REPLACE FUNCTION public.sync_user_role_to_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.profiles SET app_role = NEW.role WHERE id = NEW.user_id;
  RETURN NEW;
END $$;

-- ── 2. user_roles: split by command, keep the superadmin boundary ────────────
-- The trailing drops of the new names keep a re-run harmless (CREATE POLICY
-- has no IF NOT EXISTS).
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_own"  ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete"    ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() IN ('admin','superadmin'));

CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'superadmin'
    OR (public.get_user_role() = 'admin' AND role <> 'superadmin')
  );

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'superadmin'
    OR (public.get_user_role() = 'admin' AND role <> 'superadmin')
  )
  WITH CHECK (
    public.get_user_role() = 'superadmin'
    OR (public.get_user_role() = 'admin' AND role <> 'superadmin')
  );

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'superadmin'
    OR (public.get_user_role() = 'admin' AND role <> 'superadmin')
  );

-- ── 3. profiles: column grants (a column REVOKE cannot override a table GRANT) ─
-- The table-level REVOKE must come first; otherwise the table GRANT keeps
-- UPDATE on every column and the column grants below add nothing.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (name, phone, avatar_url, department, status, type, email, joined,
               must_change_password)
  ON public.profiles TO authenticated;
-- Deliberately NOT updatable by clients: app_role, role, is_active, created_by.

-- ── 4. Parent links and program assignments: writes are admin-only ───────────
DROP POLICY IF EXISTS "psr_all"    ON public.parent_student_relationships;
DROP POLICY IF EXISTS "psr_select" ON public.parent_student_relationships;
DROP POLICY IF EXISTS "psr_write"  ON public.parent_student_relationships;

CREATE POLICY "psr_select" ON public.parent_student_relationships
  FOR SELECT TO authenticated USING (parent_id = auth.uid() OR public.is_admin());
CREATE POLICY "psr_write" ON public.parent_student_relationships
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tpa_all"    ON public.teacher_program_assignments;
DROP POLICY IF EXISTS "tpa_select" ON public.teacher_program_assignments;
DROP POLICY IF EXISTS "tpa_write"  ON public.teacher_program_assignments;

CREATE POLICY "tpa_select" ON public.teacher_program_assignments
  FOR SELECT TO authenticated USING (teacher_id = auth.uid() OR public.is_admin());
CREATE POLICY "tpa_write" ON public.teacher_program_assignments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5. Notifications: cross-user inserts are an admin action only ────────────
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ── 6. Privileged writes as SECURITY DEFINER RPCs (ADR-002) ──────────────────
CREATE OR REPLACE FUNCTION public.set_user_role(p_target uuid, p_role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE caller app_role := public.get_user_role();
BEGIN
  IF caller IS NULL OR caller NOT IN ('admin','superadmin') THEN
    RAISE EXCEPTION 'insufficient permissions' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'superadmin' AND caller <> 'superadmin' THEN
    RAISE EXCEPTION 'only a superadmin can grant superadmin' USING ERRCODE = '42501';
  END IF;
  IF p_target = auth.uid() THEN
    RAISE EXCEPTION 'cannot change your own role' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target AND role = 'superadmin')
     AND caller <> 'superadmin' THEN
    RAISE EXCEPTION 'only a superadmin can modify a superadmin' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (p_target, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

  INSERT INTO public.audit_logs (action, performed_by, target_user_id, details)
  VALUES ('role_changed', auth.uid(), p_target, jsonb_build_object('role', p_role));
END $$;

CREATE OR REPLACE FUNCTION public.set_user_active(p_target uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE caller app_role := public.get_user_role();
BEGIN
  IF caller IS NULL OR caller NOT IN ('admin','superadmin') THEN
    RAISE EXCEPTION 'insufficient permissions' USING ERRCODE = '42501';
  END IF;
  IF p_target = auth.uid() THEN
    RAISE EXCEPTION 'cannot change your own active status' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_target AND role = 'superadmin')
     AND caller <> 'superadmin' THEN
    RAISE EXCEPTION 'only a superadmin can modify a superadmin' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET is_active = p_active WHERE id = p_target;

  INSERT INTO public.audit_logs (action, performed_by, target_user_id, details)
  VALUES (CASE WHEN p_active THEN 'user_activated' ELSE 'user_deactivated' END,
          auth.uid(), p_target, jsonb_build_object('is_active', p_active));
END $$;

REVOKE ALL ON FUNCTION public.set_user_role(uuid, public.app_role)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_active(uuid, boolean)        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_active(uuid, boolean)        TO authenticated;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- WARNING: this re-opens self-escalation (an admin can write user_roles again)
-- and re-grants UPDATE on every profiles column.
--
-- DROP FUNCTION IF EXISTS public.set_user_role(uuid, public.app_role);
-- DROP FUNCTION IF EXISTS public.set_user_active(uuid, boolean);
--
-- DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
-- CREATE POLICY "notifications_insert" ON public.notifications
--   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--
-- DROP POLICY IF EXISTS "psr_select" ON public.parent_student_relationships;
-- DROP POLICY IF EXISTS "psr_write"  ON public.parent_student_relationships;
-- CREATE POLICY "psr_all" ON public.parent_student_relationships
--   FOR ALL USING (public.get_user_role() IN ('admin','superadmin') OR parent_id = auth.uid());
--
-- DROP POLICY IF EXISTS "tpa_select" ON public.teacher_program_assignments;
-- DROP POLICY IF EXISTS "tpa_write"  ON public.teacher_program_assignments;
-- CREATE POLICY "tpa_all" ON public.teacher_program_assignments
--   FOR ALL USING (public.get_user_role() IN ('admin','superadmin') OR teacher_id = auth.uid());
--
-- DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
-- DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
-- DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
-- DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
-- CREATE POLICY "user_roles_admin_all" ON public.user_roles
--   FOR ALL USING (public.get_user_role() IN ('admin','superadmin'));
-- CREATE POLICY "user_roles_read_own" ON public.user_roles
--   FOR SELECT USING (user_id = auth.uid());
--
-- REVOKE UPDATE (name, phone, avatar_url, department, status, type, email, joined,
--                must_change_password) ON public.profiles FROM authenticated;
-- GRANT UPDATE ON public.profiles TO authenticated;
--
-- The helper bodies are unchanged apart from `SET search_path`; keeping the pins
-- is strictly safer, so no rollback is provided for section 1 on purpose.
