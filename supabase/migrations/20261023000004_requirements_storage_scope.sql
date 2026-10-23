-- M4 — Scope the `requirements` storage bucket to the owning family and staff.
--
-- What this does
--   1. Replaces the two bucket-wide `auth.role() = 'authenticated'` policies with
--      path-scoped ones: staff by role, parents only under
--      `documents/<their student_id>/`.
--   2. Sets a 10 MB limit and a PDF/PNG/JPEG allowlist on the bucket.
--
-- What must be true before it runs
--   * The parent upload path already writes `documents/<student_id>/<file>`.
--     That one-line frontend change (`RequirementsUpload.jsx`) must ship with
--     this migration. Against the old `documents/<id>_<timestamp>.<ext>` names,
--     the parent INSERT policy rejects every upload. Staff/admin reads still work.
--   * Legacy objects (`documents/12_1699999.pdf`) stay in the bucket but no
--     longer match a parent's read predicate. Treat `student_documents.file_url`
--     as dead and regenerate links as signed URLs from the new path (§7 note).
--   * The deploy role must be allowed to create policies on `storage.objects`
--     and update `storage.buckets` (the `postgres` role in a Supabase project is).
--   * M1 may run before or after; after M1 the `psr_select` policy still exposes
--     the caller's own `parent_student_relationships` rows to this predicate.
--   * Re-runnable: both new policies are dropped before being created.
--
-- Deliberately NOT used: `(storage.foldername(name))[2]::bigint`. A legacy name
-- like `documents/12_1699999.pdf` makes that cast raise, and an exception inside
-- an RLS predicate aborts the whole bucket listing. The regex cannot raise.

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads"   ON storage.objects;
DROP POLICY IF EXISTS "requirements_read"           ON storage.objects;
DROP POLICY IF EXISTS "requirements_write"          ON storage.objects;

CREATE POLICY "requirements_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'requirements' AND (
      public.get_user_role() IN ('admin','superadmin','teacher','therapist')
      OR EXISTS (
        SELECT 1 FROM public.parent_student_relationships psr
        WHERE psr.parent_id = auth.uid()
          AND name ~ ('^documents/' || psr.student_id::text || '/')
      )
    )
  );

CREATE POLICY "requirements_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'requirements' AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.parent_student_relationships psr
        WHERE psr.parent_id = auth.uid()
          AND name ~ ('^documents/' || psr.student_id::text || '/')
      )
    )
  );

UPDATE storage.buckets
   SET file_size_limit = 10485760,
       allowed_mime_types = ARRAY['application/pdf','image/png','image/jpeg']
 WHERE id = 'requirements';

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- WARNING: this restores "any logged-in user can read every family's documents".
--
-- DROP POLICY IF EXISTS "requirements_read"  ON storage.objects;
-- DROP POLICY IF EXISTS "requirements_write" ON storage.objects;
--
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'requirements' AND auth.role() = 'authenticated');
-- CREATE POLICY "Allow authenticated reads" ON storage.objects
--   FOR SELECT USING (bucket_id = 'requirements' AND auth.role() = 'authenticated');
--
-- UPDATE storage.buckets
--    SET file_size_limit = NULL,
--        allowed_mime_types = NULL
--  WHERE id = 'requirements';
