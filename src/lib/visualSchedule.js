// Pure Year Planner math: year window, month expansion, week buckets. No React and no
// page imports, so the golden tests load this in Node.
import { formatDateISO } from './dates.js';
import { getSessionDay } from './scheduling/time.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day, not a rolled-over one (2026-02-31 is not a date).
const parseISO = (iso) => {
  if (typeof iso !== 'string' || !ISO_DATE.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

export const defaultYearWindow = (now = new Date()) => ({
  start: `${now.getFullYear()}-01-01`,
  end: `${now.getFullYear()}-12-31`,
});

// Each side falls back on its own, then the pair is ordered: a window never runs backwards.
export const normalizeYearWindow = (yearStart, yearEnd) => {
  const fallback = defaultYearWindow();
  const start = parseISO(yearStart) ? yearStart : fallback.start;
  const end = parseISO(yearEnd) ? yearEnd : fallback.end;
  return end < start ? { start: end, end: start } : { start, end };
};

export const monthSpan = (startISO, endISO) => {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!start || !end || end < start) return [];
  const months = [];
  let year = start.getFullYear();
  let month = start.getMonth() + 1;
  while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth() + 1)) {
    months.push({ year, month, label: `${MONTH_LABELS[month - 1]} ${year}` });
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
};

// 0 = Mon … 4 = Fri, null on Sat/Sun or an invalid date.
export const weekdayIndex = (iso) => {
  const date = parseISO(iso);
  if (!date) return null;
  const day = date.getDay();
  return day === 0 || day === 6 ? null : day - 1;
};

// Exact mirror of the day calendar's groupSessionsByDay: a dated session belongs to its
// own date, an undated one to its stored day_of_week (falling back to id % 5).
export const sessionsOnDate = (sessions, iso) => {
  const index = weekdayIndex(iso);
  if (index === null) return [];
  return (sessions || []).filter((session) => (
    session.sessionDate ? session.sessionDate === iso : getSessionDay(session) === index
  ));
};

// Monday-first five weekday buckets; an unusable week start falls back to this week.
export const buildWeek = (sessions, weekStartISO) => {
  const date = parseISO(weekStartISO) || new Date();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const iso = formatDateISO(day);
    return { iso, index, sessions: sessionsOnDate(sessions, iso) };
  });
};

// Greedy lane packing per overlap cluster, so two sessions in one hour stay readable.
export const layoutDaySessions = (sessions) => {
  const sorted = [...sessions].sort((a, b) => a.startHour - b.startHour || a.span - b.span);
  const placed = [];
  let cluster = [];
  let clusterEnd = 0;
  const flush = () => {
    const laneEnds = [];
    const lanesOf = cluster.map((session) => {
      let lane = laneEnds.findIndex((end) => end <= session.startHour);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = session.startHour + session.span;
      return lane;
    });
    cluster.forEach((session, i) => placed.push({ session, lane: lanesOf[i], lanes: laneEnds.length }));
    cluster = [];
    clusterEnd = 0;
  };
  sorted.forEach((session) => {
    if (cluster.length && session.startHour >= clusterEnd) flush();
    cluster.push(session);
    clusterEnd = Math.max(clusterEnd, session.startHour + session.span);
  });
  if (cluster.length) flush();
  return placed;
};

// Months of the window, each holding its in-window weekdays only. No weekend rows.
export const buildYear = (sessions, startISO, endISO) => {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!start || !end || end < start) return [];
  return monthSpan(startISO, endISO).map(({ year, month, label }) => {
    const days = [];
    const cursor = new Date(year, month - 1, 1);
    while (cursor.getMonth() === month - 1) {
      const iso = formatDateISO(cursor);
      const index = weekdayIndex(iso);
      if (index !== null && iso >= startISO && iso <= endISO) {
        days.push({ iso, day: cursor.getDate(), index, sessions: sessionsOnDate(sessions, iso) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return { year, month, label, days };
  });
};
