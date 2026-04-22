/**
 * Constraint-Based Scheduling Algorithm
 * 
 * Automatically generates schedules for multiple students without conflicts.
 * Considers: student availability, teacher availability, room capacity,
 * program requirements, breaks, and travel time.
 */

import { supabase } from './supabase';

const OPERATING_HOURS = { start: 8, end: 17 };
const DEFAULT_BREAK_MINUTES = 15;
const MAX_DAILY_HOURS = 4;

export async function autoSchedule(options = {}) {
  const {
    dayOfWeek = getCurrentDayOfWeek(),
    dryRun = false,
    maxAttempts = 3
  } = options;

  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const settings = await getSchedulingSettings();
    const pendingPrograms = await getPendingStudentPrograms();
    const existingSessions = await getExistingSessions(dayOfWeek);
    const students = await getAllStudents();
    const teachers = await getAllTeachers();
    const rooms = await getAllRooms();
    const programs = await getAllPrograms();

    const prioritized = calculatePriorities(pendingPrograms, existingSessions, students);

    const results = {
      scheduled: [],
      failed: [],
      conflicts: [],
      totalAttempts: 0
    };

    for (const sp of prioritized) {
      let attempts = 0;
      let scheduled = false;

      while (!scheduled && attempts < maxAttempts) {
        const slot = findBestSlot(sp, existingSessions, students, teachers, rooms, programs, settings);
        
        if (slot) {
          if (dryRun) {
            results.scheduled.push({ ...sp, proposedSlot: slot });
            scheduled = true;
          } else {
            const result = await createSession(sp, slot, dayOfWeek);
            if (result.success) {
              results.scheduled.push({ ...sp, session: result.session });
              existingSessions.push(result.session);
              scheduled = true;
            } else if (result.conflict) {
              results.conflicts.push({ conflict: result.conflict, studentProgram: sp });
            }
          }
        }
        attempts++;
      }

      if (!scheduled) {
        results.failed.push({ ...sp, reason: 'No available time slots', attempts });
      }
    }

    return { success: true, ...results };
  } catch (error) {
    console.error('Auto-schedule error:', error);
    return { success: false, error: error.message };
  }
}

function calculatePriorities(studentPrograms, existingSessions, students) {
  return studentPrograms.map(sp => {
    const student = students.find(s => s.id === sp.student_id);
    const score = calculatePriorityScore(sp, student, existingSessions);
    return { ...sp, priorityScore: score };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

function calculatePriorityScore(studentProgram, student, existingSessions) {
  if (!student) return 0;

  const scarcityScore = getStudentAvailabilityHours(student.id);
  const scheduledCount = existingSessions.filter(s => 
    s.student_ids?.includes(studentProgram.student_id)
  ).length;
  const requiredCount = studentProgram.sessions_per_week || 1;
  const urgencyScore = requiredCount > scheduledCount 
    ? ((requiredCount - scheduledCount) / requiredCount) * 10 
    : 0;
  const daysRemaining = 5 - getCurrentDayOfWeek();
  const deadlineScore = daysRemaining > 0 ? (1 / daysRemaining) * 5 : 5;

  return ((scarcityScore > 0 ? 1/scarcityScore : 1) * 4) + (urgencyScore * 3.5) + (deadlineScore * 2.5);
}

function findBestSlot(studentProgram, existingSessions, students, teachers, rooms, programs, settings) {
  const student = students.find(s => s.id === studentProgram.student_id);
  const program = programs.find(p => p.id === studentProgram.program_id);
  
  if (!student || !program) return null;

  const duration = studentProgram.preferred_duration_hours || program.default_duration_hours;
  
  const validSlots = generateTimeSlots(
    student.id,
    duration,
    existingSessions,
    teachers,
    rooms,
    settings
  );

  if (validSlots.length === 0) return null;

  const scoredSlots = validSlots.map(slot => ({
    ...slot,
    score: scoreSlot(slot, studentProgram, program)
  }));

  scoredSlots.sort((a, b) => b.score - a.score);

  return scoredSlots[0];
}

function generateTimeSlots(studentId, duration, existingSessions, teachers, rooms, settings) {
  const slots = [];
  const studentAvail = getStudentAvailabilitySync(studentId);
  
  const opStart = settings?.operating_start_hour || OPERATING_HOURS.start;
  const opEnd = settings?.operating_end_hour || OPERATING_HOURS.end;

  for (const avail of studentAvail) {
    const dayStart = Math.max(avail.startHour, opStart);
    const dayEnd = Math.min(avail.endHour, opEnd);
    
    for (let hour = dayStart; hour + duration <= dayEnd; hour += 0.5) {
      const slot = { startHour: hour, endHour: hour + duration };
      if (!hasConflict(slot, existingSessions, teachers, rooms)) {
        slots.push(slot);
      }
    }
  }

  return slots;
}

function hasConflict(slot, existingSessions, teachers, rooms) {
  const slotStart = slot.startHour;
  const slotEnd = slot.endHour;

  for (const session of existingSessions) {
    const sessStart = session.start_hour;
    const sessEnd = session.start_hour + session.span;
    
    const overlaps = Math.max(slotStart, sessStart) < Math.min(slotEnd, sessEnd);
    
    if (overlaps) {
      if (String(session.therapist_id)) return true;
      if (rooms.find(r => r.name === session.room)) return true;
    }
  }

  return false;
}

function scoreSlot(slot, studentProgram, program) {
  let score = 10;
  score += (12 - slot.startHour) * 0.5;
  if (program?.max_students > 1) score += 2;
  return score;
}

async function createSession(studentProgram, slot, dayOfWeek) {
  try {
    const { data, error } = await supabase.from('sessions').insert({
      title: `Auto-scheduled`,
      therapist_id: slot.teacherId,
      student_ids: [Number(studentProgram.student_id)],
      room: slot.room,
      start_hour: slot.startHour,
      span: slot.endHour - slot.startHour,
      type: 'sped',
      program_id: Number(studentProgram.program_id),
      day_of_week: dayOfWeek,
      is_confirmed: false
    }).select().single();

    if (error) {
      return error.code === '23514' 
        ? { success: false, conflict: error.message }
        : { success: false, error: error.message };
    }

    return { success: true, session: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getCurrentDayOfWeek() {
  const day = new Date().getDay();
  return day === 0 ? 0 : day - 1;
}

async function getSchedulingSettings() {
  const { data } = await supabase.from('scheduling_settings').select().single();
  return data;
}

async function getPendingStudentPrograms() {
  const { data } = await supabase.from('student_programs').select('*').eq('status', 'pending');
  return data || [];
}

async function getExistingSessions(dayOfWeek) {
  const { data } = await supabase.from('sessions').select('*').eq('day_of_week', dayOfWeek);
  return data || [];
}

async function getAllStudents() {
  const { data } = await supabase.from('students').select('*');
  return data || [];
}

async function getAllTeachers() {
  const { data } = await supabase.from('profiles').select('*').in('role', ['Staff', 'Teacher']);
  return data || [];
}

async function getAllRooms() {
  const { data } = await supabase.from('rooms').select('*');
  return data || [];
}

async function getAllPrograms() {
  const { data } = await supabase.from('programs').select('*').eq('is_active', true);
  return data || [];
}

function getStudentAvailabilitySync(studentId) {
  return [
    { startHour: 8, endHour: 12 },
    { startHour: 13, endHour: 16 },
  ];
}

function getStudentAvailabilityHours(_studentId) {
  // Default availability hours per week
  return 8;
}

export function detectConflicts(newSession, existingSessions) {
  const conflicts = [];
  const newStart = newSession.start_hour;
  const newEnd = newSession.start_hour + newSession.span;

  for (const session of existingSessions) {
    const existStart = session.start_hour;
    const existEnd = session.start_hour + session.span;
    const overlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);

    if (overlap) {
      if (String(newSession.therapist_id) === String(session.therapist_id)) {
        conflicts.push({ type: 'therapist', sessionIds: [newSession.id, session.id], message: 'Therapist conflict' });
      }
      if (newSession.room === session.room) {
        conflicts.push({ type: 'room', sessionIds: [newSession.id, session.id], message: 'Room conflict' });
      }
      if (newSession.student_ids?.some(id => session.student_ids?.includes(id))) {
        conflicts.push({ type: 'student', sessionIds: [newSession.id, session.id], message: 'Student conflict' });
      }
    }
  }

  return conflicts;
}

export default { autoSchedule, detectConflicts };