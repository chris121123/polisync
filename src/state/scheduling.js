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
    const { dryRun = false, dayOfWeek, sessionDate, config: userConfig } = options;

    // Try Edge Function first (full backtracking + multi-attempt)
    if (supabase) {
      try {
        const result = await invokeSmartScheduler({ dayOfWeek, dryRun, config: userConfig });
        if (result.success) {
          // Refresh student programs state after scheduling
          if (!dryRun && result.scheduled?.length > 0) {
            const scheduledIds = result.scheduled.map(a => a.studentProgramId);
            setStudentPrograms(prev =>
              prev.map(p => scheduledIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
            );
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
            day_of_week: dayOfWeek ?? 0,
            session_date: sessionDate || null,
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
              dayOfWeek: data.day_of_week,
              sessionDate: data.session_date || null,
              isConfirmed: data.is_confirmed,
            });
            await supabase.from('student_programs').update({ status: 'scheduled' }).eq('id', a.studentProgramId);
          }
        }
        // Refresh state optimistically
        if (newlyCreated.length > 0) {
          setSessions(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const toAdd = newlyCreated.filter(s => !existingIds.has(s.id));
            return [...prev, ...toAdd];
          });
        }
        const scheduledIds = result.scheduled.map(a => a.studentProgramId);
        setStudentPrograms(prev =>
          prev.map(p => scheduledIds.includes(p.id) ? { ...p, status: 'scheduled' } : p)
        );
        notify(`Local scheduler: ${result.scheduled.length} sessions created (score: ${result.score})`);
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
