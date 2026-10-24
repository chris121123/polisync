-- SCHED-005 — Allow sub-hour slot starts and durations on public.sessions.
--
-- Why
--   The auto-scheduler works in half-hour steps: slotIncrementHours = 0.5 and
--   preferred_duration_hours = 1.5 are legitimate inputs. start_hour and span were
--   integer, so persisting a 1.5 h session failed with
--     invalid input syntax for type integer: "1.5"
--   Fractional hours are real scheduling data, not a rounding bug, so the columns
--   must hold them.
--
-- What this does
--   Changes public.sessions.start_hour and public.sessions.span from integer to
--   NUMERIC(4,2) — exact decimal, 2 dp, so 0.5 and 1.5 round-trip with no binary
--   float error. NUMERIC(4,2) holds up to 99.99 hours: deliberate headroom well
--   past a 24 h day, because start_hour is hours-from-midnight (can exceed 24 only
--   if the app ever books a session past midnight) and span for a single booking
--   never approaches it. Nothing is deleted; existing integer values widen exactly.
--
-- Idempotent: both steps re-check information_schema, so a re-run is a no-op.
-- No dependent objects: verified on the linked project — 0 rows in pg_depend for
-- these two columns, 0 of the 4 sessions policies reference them, and no view,
-- matview, function, trigger, generated column or CHECK constraint mentions them.
--
-- Lock note: integer -> numeric is not a binary-coercible change, so each ALTER
-- rewrites public.sessions and holds ACCESS EXCLUSIVE for its duration. One school,
-- ~10^3 rows: expect well under a second. Run in a quiet window anyway.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sessions'
       AND column_name = 'start_hour' AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE public.sessions
      ALTER COLUMN start_hour TYPE NUMERIC(4,2) USING start_hour::numeric;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'sessions'
       AND column_name = 'span' AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE public.sessions
      ALTER COLUMN span TYPE NUMERIC(4,2) USING span::numeric;
  END IF;
END $$;

-- Verify after running (expect data_type = numeric, precision 4, scale 2):
--   SELECT column_name, data_type, numeric_precision, numeric_scale
--     FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'sessions'
--      AND column_name IN ('start_hour','span');
--   SELECT min(start_hour), max(start_hour), min(span), max(span) FROM public.sessions;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Warning: going back to integer ROUNDS, so any stored 1.5 becomes 2 and any 0.5
-- becomes 1 (round half away from zero). That silently moves booked session times;
-- only roll back if no fractional rows exist, and check first:
--   SELECT count(*) FROM public.sessions
--    WHERE start_hour <> round(start_hour) OR span <> round(span);
--
-- BEGIN;
--   ALTER TABLE public.sessions ALTER COLUMN start_hour TYPE INTEGER USING round(start_hour)::integer;
--   ALTER TABLE public.sessions ALTER COLUMN span       TYPE INTEGER USING round(span)::integer;
-- COMMIT;
