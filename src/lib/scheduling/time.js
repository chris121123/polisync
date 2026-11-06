// Hour and day math shared by the engine and the edge client. No imports, so Node can load it.

// Mon=0. Sunday keeps its Friday value (4) by design, so weekends never index
// into a Mon–Fri timetable.
export function dayOfWeekFor(date = new Date()) {
  const d = date.getDay();
  return d === 0 ? 4 : d - 1;
}

export function getCurrentDayOfWeek() {
  return dayOfWeekFor();
}

// Undated sessions: the stored day_of_week wins (numeric strings tolerated), and only a
// missing or weekend value falls back to the legacy id % 5 bucket.
export const getSessionDay = (session) => {
  const day = session.dayOfWeek;
  const n = day === null || day === undefined || day === '' ? NaN : Number(day);
  return Number.isInteger(n) && n >= 0 && n <= 4 ? n : session.id % 5;
};

export function timeToHour(time) {
  if (typeof time !== 'string') return 8;
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function hasTimeOverlap(s1Start, s1End, s2Start, s2End) {
  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End);
}
