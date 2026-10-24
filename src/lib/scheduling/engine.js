// Local solver: pure, no network. Imports only the sibling pure modules.

import { getCurrentDayOfWeek, hasTimeOverlap, timeToHour } from './time.js';
import { DEFAULT_CONFIG } from './config.js';
import { orderByHeuristic, scoreSchedule } from './scoring.js';

/**
 * Runs a local version of the smart scheduler using data already in memory.
 * Suitable for dry-run previews and smaller datasets.
 *
 * @param {Object} params - All scheduling data from GlobalStateContext
 * @param {Object} [overrideConfig] - Config overrides
 * @returns {Object} { scheduled, unscheduled, score, stats }
 */
export function localSmartSchedule({
  studentPrograms,
  // students is available via studentPrograms.student_id lookups
  staff,
  rooms,
  programs,
  sessions,
  studentAvailability,
  schedulingSettings,
  dayOfWeek,
}, overrideConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrideConfig };

  // Apply scheduling settings from DB
  if (schedulingSettings) {
    config.minBreakMinutes = schedulingSettings.min_break_minutes ?? config.minBreakMinutes;
    config.maxDailyHoursPerStudent = schedulingSettings.max_daily_hours_per_student ?? config.maxDailyHoursPerStudent;
    if (schedulingSettings.operating_start_time) {
      config.operatingStartHour = timeToHour(schedulingSettings.operating_start_time);
    }
    if (schedulingSettings.operating_end_time) {
      config.operatingEndHour = timeToHour(schedulingSettings.operating_end_time);
    }
  }

  const day = dayOfWeek ?? getCurrentDayOfWeek();
  const pending = (studentPrograms || []).filter(sp => sp.status === 'pending');

  if (pending.length === 0) {
    return { scheduled: [], unscheduled: [], score: 0, stats: { backtracks: 0, elapsed: 0 } };
  }

  // Build availability maps
  const studentAvailMap = buildStudentAvailMap(studentAvailability);
  const teacherAvailMap = new Map(); // No teacher availability in local context typically

  // Convert sessions to the format the solver expects
  const existingSessions = (sessions || []).map(s => ({
    id: s.id,
    therapist_id: s.therapistId,
    student_ids: s.studentIds || [],
    room: s.room,
    start_hour: s.startHour,
    span: s.span,
    day_of_week: s.dayOfWeek ?? 0,
    program_id: s.programId,
  }));

  const roomList = (rooms || []).map(r => ({ id: r.id, name: r.name, max_capacity: r.maxCapacity || r.max_capacity || 5 }));
  const teacherList = (staff || []).filter(s => {
    const appRole = (s.app_role || '').toLowerCase();
    const role = (s.role || '').toLowerCase();
    if (appRole === 'parent' || role === 'parent') return false;
    if (['admin', 'superadmin', 'administrator', 'super administrator'].includes(appRole)) return false;
    if (['admin', 'administrator', 'super administrator'].includes(role)) return false;
    return s.status === 'Active' || s.is_active !== false;
  });
  const programList = (programs || []).map(p => ({ ...p, id: Number(p.id) }));

  // Run solver with MRV ordering
  const ordered = orderByHeuristic(pending, programList, studentAvailMap);
  const best = { result: null };
  const counters = { depth: 0, backtracks: 0, startTime: Date.now() };

  solveBacktrack(
    ordered, 0, [], programList, teacherList, roomList,
    existingSessions, studentAvailMap, teacherAvailMap,
    config, day, best, counters
  );

  if (best.result) {
    return {
      scheduled: best.result.assignments,
      unscheduled: best.result.unscheduled,
      score: best.result.score,
      stats: { backtracks: counters.backtracks, elapsed: Date.now() - counters.startTime },
    };
  }

  return {
    scheduled: [],
    unscheduled: pending.map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'No solution found' })),
    score: -pending.length * 5,
    stats: { backtracks: counters.backtracks, elapsed: Date.now() - counters.startTime },
  };
}

function buildStudentAvailMap(studentAvailability) {
  const map = new Map();
  for (const sa of (studentAvailability || [])) {
    const sid = Number(sa.student_id);
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid).push({
      startHour: timeToHour(String(sa.start_time)),
      endHour: timeToHour(String(sa.end_time)),
      dayOfWeek: sa.day_of_week,
    });
  }
  return map;
}

function checkConflictLocal(candidate, existingSessions, assignments, studentAvail, config, dayOfWeek, studentAssignments) {
  const cEnd = candidate.startHour + candidate.duration;

  if (candidate.startHour < config.operatingStartHour || cEnd > config.operatingEndHour) {
    return 'Outside operating hours';
  }

  // Student availability
  const windows = (studentAvail || []).filter(w => w.dayOfWeek === dayOfWeek);
  if (windows.length > 0) {
    const validWindow = windows.some(w => candidate.startHour >= w.startHour && cEnd <= w.endHour);
    if (!validWindow) return 'Outside student availability';
  }

  const breakHours = config.minBreakMinutes / 60;

  // Check existing sessions
  for (const s of existingSessions) {
    if ((s.day_of_week ?? 0) !== dayOfWeek) continue;
    const sEnd = s.start_hour + s.span;
    if (!hasTimeOverlap(candidate.startHour, cEnd, s.start_hour, sEnd)) continue;

    if (String(s.therapist_id) === String(candidate.teacherId)) return 'Teacher booked (existing)';
    if (s.room === candidate.room) return 'Room booked (existing)';
    if (s.student_ids?.includes(candidate.studentId)) return 'Student booked (existing)';
  }

  // Check current assignments
  for (const a of assignments) {
    const aEnd = a.startHour + a.duration;
    if (!hasTimeOverlap(candidate.startHour, cEnd, a.startHour, aEnd)) continue;

    if (String(a.teacherId) === String(candidate.teacherId)) return 'Teacher double-booked';
    if (a.room === candidate.room) return 'Room double-booked';
    if (a.studentId === candidate.studentId) return 'Student double-booked';
  }

  // Break enforcement
  for (const a of (studentAssignments || [])) {
    const aEnd = a.startHour + a.duration;
    const gap = Math.max(candidate.startHour - aEnd, a.startHour - cEnd);
    if (gap > 0 && gap < breakHours) return 'Insufficient break';
  }

  // Max daily hours
  const existingHours = existingSessions
    .filter(s => (s.day_of_week ?? 0) === dayOfWeek && s.student_ids?.includes(candidate.studentId))
    .reduce((sum, s) => sum + s.span, 0);
  const assignedHours = (studentAssignments || []).reduce((sum, a) => sum + a.duration, 0);
  if (existingHours + assignedHours + candidate.duration > config.maxDailyHoursPerStudent) {
    return 'Exceeds daily limit';
  }

  return null;
}

function getValidSlotsLocal(sp, program, teachers, rooms, existingSessions, currentAssignments, studentAvail, config, dayOfWeek) {
  const duration = sp.preferred_duration_hours || program.default_duration_hours;
  const slots = [];
  const studentAssignments = currentAssignments.filter(a => a.studentId === sp.student_id);

  const windows = (studentAvail || []).filter(w => w.dayOfWeek === dayOfWeek);
  const effectiveWindows = windows.length > 0
    ? windows
    : [{ startHour: config.operatingStartHour, endHour: config.operatingEndHour, dayOfWeek }];

  for (const window of effectiveWindows) {
    const dayStart = Math.max(window.startHour, config.operatingStartHour);
    const dayEnd = Math.min(window.endHour, config.operatingEndHour);

    for (let hour = dayStart; hour + duration <= dayEnd; hour += config.slotIncrementHours) {
      for (const teacher of teachers) {
        if (sp.assigned_teacher_id && sp.assigned_teacher_id !== teacher.id) continue;
        for (const room of rooms) {
          const conflict = checkConflictLocal(
            { studentId: sp.student_id, teacherId: teacher.id, room: room.name, startHour: hour, duration },
            existingSessions, currentAssignments, studentAvail, config, dayOfWeek, studentAssignments
          );
          if (!conflict) {
            slots.push({ teacherId: teacher.id, room: room.name, startHour: hour, duration });
          }
        }
      }
    }
  }

  return slots;
}

function solveBacktrack(ordered, index, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters) {
  if (counters.depth > config.maxBacktrackDepth) return;
  if (Date.now() - counters.startTime > config.timeBudgetMs) return;

  if (index >= ordered.length) {
    const unscheduled = ordered
      .filter(sp => !currentAssignments.some(a => a.studentProgramId === sp.id))
      .map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'No valid slot' }));

    const score = scoreSchedule(currentAssignments, unscheduled.length);

    if (!best.result || score > best.result.score) {
      best.result = {
        assignments: [...currentAssignments],
        unscheduled,
        score,
      };
    }
    return;
  }

  const sp = ordered[index];
  const program = programs.find(p => p.id === sp.program_id);
  if (!program) {
    solveBacktrack(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters);
    return;
  }

  const studentAvail = studentAvailMap.get(sp.student_id) || [];
  const validSlots = getValidSlotsLocal(sp, program, teachers, rooms, existingSessions, currentAssignments, studentAvail, config, dayOfWeek);

  for (const slot of validSlots) {
    if (Date.now() - counters.startTime > config.timeBudgetMs) return;
    counters.depth++;

    const assignment = {
      studentProgramId: sp.id,
      studentId: sp.student_id,
      programId: program.id,
      programName: program.name,
      teacherId: slot.teacherId,
      room: slot.room,
      startHour: slot.startHour,
      duration: slot.duration,
      type: program.type,
    };

    currentAssignments.push(assignment);
    solveBacktrack(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters);
    currentAssignments.pop();
    counters.backtracks++;

    if (best.result && best.result.unscheduled.length === 0) return;
  }

  // Try skipping this program
  counters.depth++;
  solveBacktrack(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters);
}
