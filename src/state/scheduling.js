// Called every render: actions must close over this render's state. Do not memoize.
import { supabase } from '../lib/supabase';
import { invokeSmartScheduler } from '../lib/scheduling/client';
import { localSmartSchedule } from '../lib/scheduling/engine';

export const createSchedulingActions = ({
  studentPrograms,
  students,
  staff,
  rooms,
  programs,
  sessions,
  studentAvailability,
  schedulingSettings,
  setSessions,
  setStudentPrograms,
  setStaffAvailabilityState,
  notify,
}) => {
  // ── Staff Availability CRUD ─────────────────────────────────────────────────
  const addStaffAvailability = async (staffId, date, startHour = 8, endHour = 17) => {
    try {
      const { data, error } = await supabase.from('staff_availability').upsert([{
        staff_id: staffId,
        available_date: date,
        start_hour: startHour,
        end_hour: endHour,
      }], { onConflict: 'staff_id,available_date' }).select();
      if (error) throw error;
      if (data) {
        setStaffAvailabilityState(prev => {
          const exists = prev.findIndex(a => a.staff_id === staffId && a.available_date === date);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = data[0];
            return updated;
          }
          return [...prev, data[0]];
        });
      }
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  const removeStaffAvailability = async (staffId, date) => {
    try {
      const { error } = await supabase.from('staff_availability')
        .delete()
        .eq('staff_id', staffId)
        .eq('available_date', date);
      if (error) throw error;
      setStaffAvailabilityState(prev => prev.filter(a => !(a.staff_id === staffId && a.available_date === date)));
    } catch (error) {
      console.error(error);
      notify(error.message, 'error');
    }
  };

  /**
   * Smart Schedule — calls the Edge Function for production-grade
   * backtracking + scoring, with a local fallback for offline/preview.
   */
  const smartSchedule = async (options = {}) => {
    const {
      dryRun = false,
      dayOfWeek,
      sessionDate,
      scope = 'selected-day',
      config: userConfig,
      studentProgramIds,
    } = options;

    if (dayOfWeek != null && (dayOfWeek < 0 || dayOfWeek > 4)) {
      return { success: false, error: 'Scheduling is Monday–Friday only' };
    }

    // A requirement leaves the Pending tab only once its weekly quota is met (B2/B8).
    const fullyScheduled = (created, unscheduled) => {
      const unmet = new Set((unscheduled || []).map(u => u.studentProgramId));
      const counts = new Map();
      for (const a of created) {
        counts.set(a.studentProgramId, (counts.get(a.studentProgramId) ?? 0) + 1);
      }
      return [...counts.keys()].filter(id => {
        if (unmet.has(id)) return false;
        const perWeek = studentPrograms.find(p => p.id === id)?.sessions_per_week ?? 1;
        const linked = (sessions || []).filter(s => (s.studentProgramId ?? s.student_program_id) === id).length;
        return (counts.get(id) ?? 0) + linked >= perWeek;
      });
    };

    // Try Edge Function first (full backtracking + multi-attempt)
    if (supabase) {
      try {
        const result = await invokeSmartScheduler({ dayOfWeek, dryRun, config: userConfig, scope, sessionDate, studentProgramIds });
        if (result.success) {
          // Refresh student programs state after scheduling
          if (!dryRun && result.scheduled?.length > 0) {
            const scheduledIds = fullyScheduled(result.scheduled, result.unscheduled);
            if (scheduledIds.length > 0) {
              setStudentPrograms(prev =>
                prev.map(p => scheduledIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
              );
            }
            const { data: refreshedSessions } = await supabase.from('sessions').select('*');
            if (refreshedSessions) {
              setSessions(refreshedSessions.map(s => ({
                id: s.id,
                title: s.title,
                therapistId: s.therapist_id,
                studentIds: s.student_ids || [],
                room: s.room,
                startHour: s.start_hour,
                span: s.span,
                type: s.type,
                programId: s.program_id,
                studentProgramId: s.student_program_id ?? null,
                dayOfWeek: s.day_of_week,
                sessionDate: s.session_date || null,
                isConfirmed: s.is_confirmed
              })));
            }
            notify(`Smart scheduler: ${result.scheduled.length} sessions created (score: ${result.score})`);
          }
          return result;
        }
      } catch (err) {
        console.warn('Edge Function failed, falling back to local scheduler:', err);
      }
    }

    // Fallback: run local lightweight solver
    try {
      const result = localSmartSchedule({
        studentPrograms,
        students,
        staff,
        rooms,
        programs,
        sessions,
        studentAvailability,
        schedulingSettings,
        dayOfWeek,
        scope,
        sessionDate,
        studentProgramIds,
      }, userConfig);

      // Persist locally-computed schedule if not dry run
      if (!dryRun && supabase && result.scheduled?.length > 0) {
        const newlyCreated = [];
        for (const a of result.scheduled) {
          const { data, error } = await supabase.from('sessions').insert({
            title: `Auto: ${a.programName}`,
            therapist_id: a.teacherId,
            student_ids: [a.studentId],
            room: a.room,
            start_hour: a.startHour,
            span: a.duration,
            type: a.type,
            program_id: a.programId,
            student_program_id: a.studentProgramId,
            day_of_week: a.dayOfWeek ?? dayOfWeek,
            session_date: a.sessionDate ?? sessionDate ?? null,
            is_confirmed: false,
          }).select().single();

          if (!error && data) {
            newlyCreated.push({
              id: data.id,
              title: data.title,
              therapistId: data.therapist_id,
              studentIds: data.student_ids || [],
              room: data.room,
              startHour: data.start_hour,
              span: data.span,
              type: data.type,
              programId: data.program_id,
              studentProgramId: data.student_program_id ?? null,
              dayOfWeek: data.day_of_week,
              sessionDate: data.session_date || null,
              isConfirmed: data.is_confirmed,
            });
          }
        }
        // Only mark requirements whose weekly quota is now met — B2.
        const completedIds = fullyScheduled(newlyCreated, result.unscheduled);
        if (completedIds.length > 0) {
          await supabase.from('student_programs').update({ status: 'scheduled' }).in('id', completedIds);
          setStudentPrograms(prev =>
            prev.map(p => completedIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
          );
        }
        // Refresh state optimistically
        if (newlyCreated.length > 0) {
          setSessions(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const toAdd = newlyCreated.filter(s => !existingIds.has(s.id));
            return [...prev, ...toAdd];
          });
        }
        notify(`Local scheduler: ${newlyCreated.length} sessions created (score: ${result.score})`);
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('Local smart schedule error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    addStaffAvailability,
    removeStaffAvailability,
    smartSchedule,
  };
};
