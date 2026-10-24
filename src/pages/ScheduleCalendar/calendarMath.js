// Pure calendar helpers extracted from ScheduleCalendar. No React, no state.

export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export const formatHour = (h) => {
  if (h === 12) return '12:00 PM';
  if (h > 12)  return `${h - 12}:00 PM`;
  return `${h}:00 AM`;
};

// Day derived from the DB id by design; pinned by tests, do not change to day_of_week.
export const getSessionDay = (session) => session.id % 5;

export const formatDateISO = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get the Monday of the selected week
export const getWeekStart = (d) => {
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  const mon = new Date(d);
  mon.setDate(diff);
  return mon;
};

export const weekDatesFor = (weekStart) => Array.from({ length: 5 }, (_, i) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + i);
  return d;
});

export const filterSessionsForView = ({ sessions, filterType, calendarView, selectedDateISO, selectedDayOfWeek }) => {
  let filtered = sessions.filter(s => filterType === 'all' || s.type === filterType);
  if (calendarView === 'daily') {
    // Show sessions matching the selected date, or sessions with no date (legacy)
    filtered = filtered.filter(s => {
      if (s.sessionDate) return s.sessionDate === selectedDateISO;
      // Legacy fallback: match by day_of_week
      const dow = selectedDayOfWeek;
      return s.dayOfWeek === dow || s.dayOfWeek === undefined || s.dayOfWeek === null;
    });
  }
  return filtered;
};

export const groupSessionsByDay = (sessions, filterType, weekDates) => {
  const grouped = [[], [], [], [], []];
  const typeFiltered = sessions.filter(s => filterType === 'all' || s.type === filterType);
  typeFiltered.forEach(s => {
    if (s.sessionDate) {
      // Match sessions to weekDates
      const idx = weekDates.findIndex(d => formatDateISO(d) === s.sessionDate);
      if (idx >= 0) grouped[idx].push(s);
    } else {
      const day = getSessionDay(s);
      grouped[day].push(s);
    }
  });
  return grouped;
};

// True when moving the selected session to `hour` would double-book the
// same therapist or room (same overlap logic as AddSessionModal.conflictMessage).
export const slotHasConflict = (sessions, session, hour) => {
  const s = session;
  if (!s) return true;
  const end = hour + s.span;
  const dayOf = s => s.sessionDate || s.dayOfWeek;
  return sessions.some(o =>
    o.id !== s.id &&
    dayOf(o) === dayOf(s) &&
    Math.max(hour, o.startHour) < Math.min(end, o.startHour + o.span) &&
    (String(o.therapistId) === String(s.therapistId) || o.room === s.room)
  );
};

// UI constants live here, not in the .jsx files: react-refresh rejects non-component exports from them.
export const TYPE_CONFIG = {
  sped:       { gradient: 'bg-sped',  light: 'bg-sped/10',  border: 'border-sped/20 dark:border-sped/20',  text: 'text-sped dark:text-sped',  badge: 'bg-sped/10 text-sped',  label: 'SPED'       },
  rehab:      { gradient: 'bg-rehab',       light: 'bg-rehab/10',     border: 'border-rehab/20 dark:border-rehab/20',     text: 'text-rehab dark:text-ps-ink-1',     badge: 'bg-rehab/10 text-rehab',        label: 'Rehab'      },
  // wood-deep header band (5.48/7.88 white = AA) carries the modal text-white; text = ps-warn, not ps-wood (2.9:1)
  playschool: { gradient: 'bg-ps-wood-deep',   light: 'bg-ps-wood/10',   border: 'border-ps-wood/30',   text: 'text-ps-warn',   badge: 'bg-ps-wood/10 text-ps-warn',   label: 'Playschool' },
};
