// Shared session-day + time helpers (sessionDate-first, dayOfWeek fallback).
// Used by Teacher / Therapist / Parent dashboards — fix once here.

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ponytail: weekend sessions collapse to Monday (index 0); scheduler only creates Mon–Fri.
export function sessionDayIndex(session = {}) {
  if (session.sessionDate) {
    const d = new Date(session.sessionDate);
    if (!Number.isNaN(d.getTime())) {
      const jsDay = d.getDay(); // 0=Sun … 6=Sat
      if (jsDay === 0 || jsDay === 6) return 0;
      return jsDay - 1;
    }
  }
  const dow = session.dayOfWeek ?? 0;
  return dow < 0 || dow > 4 ? 0 : dow;
}

export function sessionDayName(session = {}) {
  return DAY_NAMES[sessionDayIndex(session)] ?? DAY_NAMES[0];
}

export function formatHour(hour) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:00 ${ampm}`;
}

export function formatTime(hour, span) {
  if (span == null) return formatHour(hour);
  return `${formatHour(hour)} - ${formatHour(hour + span)}`;
}
