// Conflict math. No imports, so Node can load it.

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

