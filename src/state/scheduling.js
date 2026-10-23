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
  staffAvailability,
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

  const getAvailableStaffForDate = (date) => {
    const isEligible = (s) => {
      const appRole = (s.app_role || '').toLowerCase();
      const role = (s.role || '').toLowerCase();
      if (appRole === 'parent' || role === 'parent') return false;
      if (['admin', 'superadmin', 'administrator', 'super administrator'].includes(appRole)) return false;
      if (['admin', 'administrator', 'super administrator'].includes(role)) return false;
      return true;
    };
    const eligibleStaff = staff.filter(isEligible);
    if (!date) return eligibleStaff;
    const availableIds = staffAvailability
      .filter(a => a.available_date === date)
      .map(a => a.staff_id);
    return eligibleStaff.filter(s => availableIds.includes(s.id));
  };
  
  const findAvailableGaps = (therapistId, roomId, span = 1) => {
    const gaps = [];
    const operatingHours = Array.from({ length: 9 }, (_, i) => i + 8); // 8am to 5pm (start hours)

    operatingHours.forEach(hour => {
      if (hour + span > 17) return; // Beyond 5pm

      // Check therapist availability at this hour
      const therapistBusy = sessions.some(s => 
        String(s.therapistId) === String(therapistId) && 
        Math.max(s.startHour, hour) < Math.min(s.startHour + s.span, hour + span)
      );

      // Check room availability at this hour
      const roomBusy = sessions.some(s => 
        s.room === roomId && 
        Math.max(s.startHour, hour) < Math.min(s.startHour + s.span, hour + span)
      );

      if (!therapistBusy && !roomBusy) {
        gaps.push({ hour, room: roomId });
      }
    });
    return gaps;
  };

  const enhanceConflictDetection = (newSession) => {
    const list = [];
    const newStart = newSession.startHour;
    const newEnd = newSession.startHour + newSession.span;
    const newDay = newSession.dayOfWeek ?? 0;

    sessions.forEach(existing => {
      const existStart = existing.startHour;
      const existEnd = existing.startHour + existing.span;
      const existDay = existing.dayOfWeek ?? 0;

      // Same day and time overlap
      const timeOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
      const sameDay = newDay === existDay;

      if (timeOverlap && sameDay) {
        // Therapist conflict
        if (String(newSession.therapistId) === String(existing.therapistId)) {
          list.push({ type: 'therapist', sessionIds: [newSession.id, existing.id], message: 'Therapist already booked' });
        }
        // Room conflict
        if (newSession.room === existing.room) {
          list.push({ type: 'room', sessionIds: [newSession.id, existing.id], room: newSession.room, message: `Room "${existing.room}" occupied` });
        }
        // Student conflict
        if (newSession.studentIds?.some(id => existing.studentIds?.includes(id))) {
          list.push({ type: 'student', sessionIds: [newSession.id, existing.id], message: 'Student has conflicting session' });
        }
      }
    });

    // Check student availability constraints
    const maxDailyHours = schedulingSettings?.max_daily_hours_per_student || 4;

    newSession.studentIds?.forEach(studentId => {
      const studentSessions = sessions.filter(s => 
        s.studentIds?.includes(studentId) && s.dayOfWeek === newDay
      );
      const totalHours = studentSessions.reduce((sum, s) => sum + s.span, 0) + newSession.span;
      
      if (totalHours > maxDailyHours) {
        list.push({ type: 'student_limit', message: `Student exceeds daily ${maxDailyHours}h limit` });
      }
    });

    return list;
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

  // Keep legacy name for backward compatibility
  const autoSchedule = smartSchedule;

  return {
    addStaffAvailability,
    removeStaffAvailability,
    getAvailableStaffForDate,
    findAvailableGaps,
    enhanceConflictDetection,
    smartSchedule,
    autoSchedule,
  };
};
