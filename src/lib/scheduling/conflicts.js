// Conflict math. No imports, so Node can load it.

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

/**
 * Pairwise therapist/room conflicts across the whole session list.
 * Output order is observable in the calendar: i < j, therapist before room.
 */
export function findAllConflicts(sessions) {
  const list = [];
  sessions.forEach((s1, i) => {
    sessions.forEach((s2, j) => {
      if (i >= j) return;
      // Check time overlap
      const s1End = s1.startHour + s1.span;
      const s2End = s2.startHour + s2.span;
      const overlap = Math.max(s1.startHour, s2.startHour) < Math.min(s1End, s2End);

      if (overlap) {
        // Therapist conflict
        if (s1.therapistId === s2.therapistId) {
          list.push({ type: 'therapist', sessionIds: [s1.id, s2.id], therapistId: s1.therapistId, startHour: Math.max(s1.startHour, s2.startHour) });
        }
        // Room conflict
        if (s1.room === s2.room) {
          list.push({ type: 'room', sessionIds: [s1.id, s2.id], room: s1.room, startHour: Math.max(s1.startHour, s2.startHour) });
        }
      }
    });
  });
  return list;
}

function formatHour(h) {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${String(min).padStart(2, '0')} ${suffix}`;
}
