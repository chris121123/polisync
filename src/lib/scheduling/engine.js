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
 * @returns {Object} { scheduled, unscheduled, score, stats } — whole-week also returns
 *   { alreadyScheduled, perDay }
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
  scope = 'selected-day',
  sessionDate,
  studentProgramIds,
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
  const pending = (studentPrograms || []).filter(
    sp => sp.status === 'pending' && (!studentProgramIds || studentProgramIds.includes(sp.id))
  );

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
    // Legacy rows have dayOfWeek = null; the date is then the only source of the weekday.
    day_of_week: s.dayOfWeek ?? (s.sessionDate ? weekdayOfDate(s.sessionDate) : null),
    program_id: s.programId,
    student_program_id: s.studentProgramId ?? s.student_program_id ?? null,
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

  // One shared budget for the whole run: timeBudgetMs is the outer bound (B5).
  const startTime = Date.now();
  let backtracks = 0;

  const runDay = (list, solveDay) => {
    const ordered = orderByHeuristic(list, programList, studentAvailMap);
    const best = { result: null };
    const counters = { depth: 0, backtracks: 0, startTime };

    solveBacktrack(
      ordered, 0, [], programList, teacherList, roomList,
      existingSessions, studentAvailMap, teacherAvailMap,
      config, solveDay, best, counters
    );

    backtracks += counters.backtracks;
    return best.result;
  };

  const stats = () => ({ backtracks, elapsed: Date.now() - startTime });

  if (scope === 'whole-week') {
    const quota = new Map();
    const remaining = new Map();
    const alreadyScheduled = [];

    for (const sp of pending) {
      const perWeek = sp.sessions_per_week ?? 1;
      const linked = existingSessions.filter(s => s.student_program_id === sp.id).length;
      quota.set(sp.id, perWeek);
      remaining.set(sp.id, perWeek - linked);
      if (perWeek - linked <= 0) alreadyScheduled.push(sp.id);
    }

    const scheduled = [];
    const perDay = [];
    const reasons = new Map();
    let score = 0;

    for (let d = 0; d < 5; d++) {
      const date = dateForDay(d, sessionDate);
      const eligible = pending.filter(sp =>
        remaining.get(sp.id) > 0 &&
        !existingSessions.some(s => s.student_program_id === sp.id && s.day_of_week === d)
      );
      const dayScheduled = [];
      const dayUnscheduled = [];
      let dayScore = 0;

      if (eligible.length > 0) {
        const result = runDay(eligible, d);
        if (result) {
          dayScore = result.score;
          for (const a of result.assignments) {
            scheduled.push({ ...a, dayOfWeek: d, sessionDate: date });
            dayScheduled.push(a.studentProgramId);
            remaining.set(a.studentProgramId, remaining.get(a.studentProgramId) - 1);
          }
          for (const u of result.unscheduled) {
            reasons.set(u.studentProgramId, u);
            dayUnscheduled.push(u);
          }
        }
      }

      score += dayScore;
      perDay.push({ dayOfWeek: d, sessionDate: date, score: dayScore, scheduled: dayScheduled, unscheduled: dayUnscheduled });
    }

    const unscheduled = pending
      .filter(sp => remaining.get(sp.id) > 0)
      .map(sp => {
        const done = quota.get(sp.id) - remaining.get(sp.id);
        const base = reasons.get(sp.id) || { studentProgramId: sp.id, studentId: sp.student_id, reason: 'No valid slot' };
        return done > 0
          ? { studentProgramId: sp.id, studentId: sp.student_id, reason: `Weekly quota not fully met (${done}/${quota.get(sp.id)})` }
          : base;
      });

    return { scheduled, unscheduled, score, stats: stats(), alreadyScheduled, perDay };
  }

  const result = runDay(pending, day);
  if (result) {
    return {
      scheduled: result.assignments.map(a => ({ ...a, dayOfWeek: day, sessionDate: sessionDate ?? null })),
      unscheduled: result.unscheduled,
      score: result.score,
      stats: stats(),
    };
  }

  return {
    scheduled: [],
    unscheduled: pending.map(sp => ({ studentProgramId: sp.id, studentId: sp.student_id, reason: 'No solution found' })),
    score: -pending.length * 5,
    stats: stats(),
  };
}

// Monday of the anchor week (or the current week) + day, in local date parts (no UTC drift).
function dateForDay(day, anchor) {
  const parts = typeof anchor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(anchor)
    ? anchor.split('-').map(Number)
    : null;
  const now = new Date();
  const base = parts
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  base.setDate(base.getDate() - ((base.getDay() + 6) % 7) + day);

  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${base.getFullYear()}-${mm}-${dd}`;
}

// Monday=0 … Friday=4 from a local 'YYYY-MM-DD'. Weekend or unparseable dates yield null (no weekday).
function weekdayOfDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const jsDay = new Date(year, month - 1, day).getDay();
  return jsDay === 0 || jsDay === 6 ? null : jsDay - 1;
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

  // Student availability: rows exist ⇒ only inside a window for this day (none = no slots)
  const windows = (studentAvail || []).filter(w => w.dayOfWeek === dayOfWeek);
  if ((studentAvail || []).length > 0) {
    const validWindow = windows.some(w => candidate.startHour >= w.startHour && cEnd <= w.endHour);
    if (!validWindow) return 'Outside student availability';
  }

  const breakHours = config.minBreakMinutes / 60;

  // Check existing sessions (null day = unknown, cannot be pinned to this weekday)
  for (const s of existingSessions) {
    if (s.day_of_week !== dayOfWeek) continue;
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
    .filter(s => s.day_of_week === dayOfWeek && s.student_ids?.includes(candidate.studentId))
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
  const effectiveWindows = (studentAvail || []).length > 0
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
    counters.depth--;
    currentAssignments.pop();
    counters.backtracks++;

    if (best.result && best.result.unscheduled.length === 0) return;
  }

  // Try skipping this program
  counters.depth++;
  solveBacktrack(ordered, index + 1, currentAssignments, programs, teachers, rooms, existingSessions, studentAvailMap, teacherAvailMap, config, dayOfWeek, best, counters);
  counters.depth--;
}
