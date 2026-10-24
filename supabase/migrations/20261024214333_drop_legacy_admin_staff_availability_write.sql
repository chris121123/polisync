-- 20261014000002 never actually ran remotely (manual-apply era): its "Admins and superadmins" policy was absent and the pre-superadmin admin-write policy survived. ADR-2026-10-001 makes admins read-only.
DROP POLICY IF EXISTS "Admins can manage staff availability" ON public.staff_availability;
-- Rollback (manual): recreate "Admins can manage staff availability" from 20260516000006_staff_availability.sql.
