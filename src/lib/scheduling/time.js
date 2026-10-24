// Hour and day math shared by the engine and the edge client. No imports, so Node can load it.

export function getCurrentDayOfWeek() {
  const d = new Date().getDay();
  return d === 0 ? 4 : d - 1;
}

export function timeToHour(time) {
  if (typeof time !== 'string') return 8;
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}

export function hasTimeOverlap(s1Start, s1End, s2Start, s2End) {
  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End);
}
