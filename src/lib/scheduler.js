/**
 * Smart Scheduler — Client-Side Module
 *
 * Mirrors the Edge Function logic for:
 *   - Local dry-run previews (no network round-trip)
 *   - Conflict detection used by ScheduleCalendar.jsx
 *   - Invoking the server-side smart scheduler via Edge Function
 *
 * The core algorithm lives in the Edge Function for production use.
 * This file provides:
 *   1. `invokeSmartScheduler()` — calls the Edge Function
 *   2. `localSmartSchedule()`   — runs a lighter version locally
 *   3. `detectConflicts()`      — real-time conflict detection for the UI
 *   4. `scoreSchedule()`        — evaluate any schedule's quality
 */

import { supabase } from './supabase';

// ─── Constants & Config ──────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  maxBacktrackDepth: 300,     // Lower than server for responsiveness
  timeBudgetMs: 4000,
  retryAttempts: 2,
  minBreakMinutes: 15,
  operatingStartHour: 8,
  operatingEndHour: 17,
  maxDailyHoursPerStudent: 4,
  slotIncrementHours: 0.5,
};

// ─── 1. Edge Function Invocation ─────────────────────────────────────────────

/**
 * Calls the Supabase Edge Function `auto-scheduler` for production-grade
 * scheduling with full backtracking and multi-attempt retry.
 *
 * @param {Object} options
 * @param {number} [options.dayOfWeek] - 0=Mon, 4=Fri
 * @param {boolean} [options.dryRun=false] - Preview without persisting
 * @param {Object} [options.config] - Override scheduler config
 * @returns {Promise<Object>} Schedule result with score, assignments, unscheduled
 */
export async function invokeSmartScheduler(options = {}) {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('auto-scheduler', {
      body: {
        dayOfWeek: options.dayOfWeek ?? getCurrentDayOfWeek(),
        dryRun: options.dryRun ?? false,
        config: options.config ?? {},
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Smart scheduler invocation failed:', error);
    return { success: false, error: error.message };
  }
}

// ─── 2. Local Smart Schedule (Lightweight) ───────────────────────────────────

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
  const teacherList = (staff || []).filter(s => s.role !== 'Admin' && s.status === 'Active');
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

// ─── 3. Conflict Detection ───────────────────────────────────────────────────

/**
 * Detect all conflicts for a given session against existing sessions.
 * Used by the UI for real-time conflict highlighting.
 *
 * @param {Object} newSession - The session to check
 * @param {Array} existingSessions - All current sessions
 * @returns {Array} List of conflict objects
 */
export function detectConflicts(newSession, existingSessions) {
  const conflicts = [];
  const newStart = newSession.startHour ?? newSession.start_hour;
  const newSpan = newSession.span;
  const newEnd = newStart + newSpan;
  const newDay = newSession.dayOfWeek ?? newSession.day_of_week ?? 0;

  for (const session of existingSessions) {
    if (session.id === newSession.id) continue;

    const existStart = session.startHour ?? session.start_hour;
    const existSpan = session.span;
    const existEnd = existStart + existSpan;
    const existDay = session.dayOfWeek ?? session.day_of_week ?? 0;

    if (newDay !== existDay) continue;

    const overlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
    if (!overlap) continue;

    // Therapist conflict
    const newTherapist = String(newSession.therapistId ?? newSession.therapist_id);
    const existTherapist = String(session.therapistId ?? session.therapist_id);
    if (newTherapist && existTherapist && newTherapist === existTherapist) {
      conflicts.push({
        type: 'therapist',
        sessionIds: [newSession.id, session.id],
        therapistId: newTherapist,
        message: `Therapist double-booked at ${formatHour(Math.max(newStart, existStart))}`,
      });
    }

    // Room conflict
    const newRoom = newSession.room;
    const existRoom = session.room;
    if (newRoom && existRoom && newRoom === existRoom) {
      conflicts.push({
        type: 'room',
        sessionIds: [newSession.id, session.id],
        room: newRoom,
        message: `Room "${newRoom}" double-booked`,
      });
    }

    // Student conflict
    const newStudents = newSession.studentIds ?? newSession.student_ids ?? [];
    const existStudents = session.studentIds ?? session.student_ids ?? [];
    const overlapping = newStudents.filter(id => existStudents.includes(id));
    if (overlapping.length > 0) {
      conflicts.push({
        type: 'student',
        sessionIds: [newSession.id, session.id],
        studentIds: overlapping,
        message: 'Student has conflicting session',
      });
    }
  }

  return conflicts;
}

// ─── 4. Scoring ──────────────────────────────────────────────────────────────

/**
 * Score a complete schedule. Higher is better.
 */
export function scoreSchedule(assignments, unscheduledCount = 0) {
  let score = 0;

  score += assignments.length * 10;
  score -= unscheduledCount * 5;

  // Group by student
  const byStudent = new Map();
  for (const a of assignments) {
    const sid = a.studentId ?? a.student_id;
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(a);
  }

  for (const [, group] of byStudent) {
    const sorted = [...group].sort((a, b) => (a.startHour ?? a.start_hour) - (b.startHour ?? b.start_hour));
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = (sorted[i - 1].startHour ?? sorted[i - 1].start_hour) + (sorted[i - 1].duration ?? sorted[i - 1].span);
      const gap = (sorted[i].startHour ?? sorted[i].start_hour) - prevEnd;
      if (gap > 1.5) score -= 2;
    }
  }

  for (const a of assignments) {
    if ((a.startHour ?? a.start_hour) < 12) score += 3;
  }

  return score;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function getCurrentDayOfWeek() {
  const d = new Date().getDay();
  return d === 0 ? 4 : d - 1;
}

function timeToHour(time) {
  if (typeof time !== 'string') return 8;
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

function formatHour(h) {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${String(min).padStart(2, '0')} ${suffix}`;
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

function orderByHeuristic(pending, programs, studentAvailMap) {
  return [...pending].sort((a, b) => {
    const progA = programs.find(p => p.id === a.program_id);
    const progB = programs.find(p => p.id === b.program_id);
    const durA = a.preferred_duration_hours || progA?.default_duration_hours || 1;
    const durB = b.preferred_duration_hours || progB?.default_duration_hours || 1;
    const availA = (studentAvailMap.get(a.student_id) || []).reduce((s, w) => s + (w.endHour - w.startHour), 0) || 99;
    const availB = (studentAvailMap.get(b.student_id) || []).reduce((s, w) => s + (w.endHour - w.startHour), 0) || 99;

    // Most constrained first: fewest availability hours, then longest duration
    const scoreA = (1 / availA) * 40 + durA * 10 + (11 - a.priority) * 5;
    const scoreB = (1 / availB) * 40 + durB * 10 + (11 - b.priority) * 5;
    return scoreB - scoreA;
  });
}

function hasTimeOverlap(s1Start, s1End, s2Start, s2End) {
  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End);
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

export default { invokeSmartScheduler, localSmartSchedule, detectConflicts, scoreSchedule };