-- SCHED-004 — Link each auto-created session to the student_program (requirement)
-- it was booked for.
--
-- Why
--   Without the link, a rerun cannot tell "this requirement already has a session on
--   Monday" from "it has none", so it books a second one (bug B8). It also blocks the
--   Pending tab from showing "scheduled 2/3".
--
-- What this does
--   1. Adds sessions.student_program_id -> student_programs(id), ON DELETE SET NULL
--      (deleting a requirement keeps the booked session; only the link is lost).
--   2. Partial unique index: at most one auto session per requirement per weekday.
--   3. Backfills the link on legacy `Auto: %` sessions where the match is unambiguous.
--
-- Additive and reversible: no row is deleted and no existing column, type or policy is
-- changed. The new column inherits the existing `sessions` RLS policies, so no policy
-- work is needed here. Rollback is at the bottom (drop index, drop column).
--
-- Lock note: plain CREATE UNIQUE INDEX (not CONCURRENTLY) holds a SHARE lock on
-- public.sessions while it builds, so writes wait. One school, ~10^3 rows: expect well
-- under a second. Run in a quiet window anyway.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS student_program_id BIGINT
    REFERENCES public.student_programs(id) ON DELETE SET NULL;

-- At most one auto session per (requirement, weekday). Hand-made and legacy rows stay
-- unconstrained because the predicate skips NULL links.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sessions_student_program_day
  ON public.sessions (student_program_id, day_of_week)
  WHERE student_program_id IS NOT NULL;

-- Backfill. Links a session only when the match is unambiguous:
--   * it is still unlinked, has the old `Auto: <program>` title, and its program_id +
--     single-element student_ids match exactly one student_programs row;
--   * and it is the lowest-id session for that (requirement, weekday) — legacy reruns
--     left duplicates, and linking both would violate the unique index above.
-- Anything ambiguous is left NULL, which is safe: the link is informational only.
WITH candidates AS (
  SELECT s.id AS session_id,
         sp.id AS sp_id,
         COUNT(*)   OVER (PARTITION BY s.id)                       AS sp_matches,
         ROW_NUMBER() OVER (PARTITION BY sp.id, s.day_of_week
                            ORDER BY s.id)                         AS day_rank
  FROM public.sessions s
  JOIN public.student_programs sp
    ON sp.program_id = s.program_id
   AND s.student_ids = ARRAY[sp.student_id]
  WHERE s.student_program_id IS NULL
    AND s.title LIKE 'Auto:%'
    AND s.day_of_week IS NOT NULL
)
UPDATE public.sessions s
   SET student_program_id = c.sp_id
  FROM candidates c
 WHERE s.id = c.session_id
   AND c.sp_matches = 1
   AND c.day_rank   = 1;

-- Row counts after running (expected: linked grows, auto_total unchanged):
--   SELECT count(*) FILTER (WHERE student_program_id IS NOT NULL) AS linked,
--          count(*) FILTER (WHERE title LIKE 'Auto:%')           AS auto_total,
--          count(*)                                              AS sessions_total
--     FROM public.sessions;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Losing the links only costs the "scheduled n/m" counter; no session data is affected.
--
-- DROP INDEX IF EXISTS public.uniq_sessions_student_program_day;
-- ALTER TABLE public.sessions DROP COLUMN IF EXISTS student_program_id;
