// Schedule quality and candidate ordering. No imports, so Node can load it.

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

export function orderByHeuristic(pending, programs, studentAvailMap) {
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
