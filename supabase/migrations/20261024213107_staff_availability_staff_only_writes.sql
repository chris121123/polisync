-- Recovered from the remote migration history (20261024213107, applied outside this repo).
-- Staff own their availability; admins read-only (signed off: ADR-2026-10-001).

DROP POLICY IF EXISTS "Admins and superadmins can manage staff availability" ON public.staff_availability;

DROP POLICY IF EXISTS "Staff can manage own availability" ON public.staff_availability;

CREATE POLICY "Staff can manage own availability" ON public.staff_availability
  FOR ALL TO authenticated
  USING (
    staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'therapist')
    )
  )
  WITH CHECK (
    staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'therapist')
    )
  );

-- Rollback (manual): recreate the two dropped policies from 20260516000006_staff_availability.sql and 20261014000002_superadmin_staff_availability.sql.
