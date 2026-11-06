import React, { useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarRange, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { HOURS, formatHour } from '../ScheduleCalendar/calendarMath.js';
import { formatDateISO } from '../../lib/dates.js';
import { findAllConflicts } from '../../lib/scheduling/conflicts.js';
import { timeToHour } from '../../lib/scheduling/time.js';
import { buildWeek, buildYear, layoutDaySessions, monthSpan, normalizeYearWindow, sessionsOnDate, weekdayIndex } from '../../lib/visualSchedule.js';
import { programTone } from '../../lib/itxProgramPalette.js';
import AiSchedulingPanel from '../../components/AiSchedulingPanel.jsx';
import ItxSelect from '../../components/ItxSelect';

// SheetJS is ~400 kB: it ships in its own chunk, loaded when the planner writes or reads a file.
const ScheduleImportWizard = React.lazy(() => import('../../components/ScheduleImportWizard.jsx'));

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW_HEIGHT = 64;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const fieldClass = 'border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2 tabular-nums';

const parseDay = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const shiftDay = (iso, days) => {
  const date = parseDay(iso);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
};
// 'Tue 3 Nov' — the same words in the cell's aria-label and the day heading.
const dayWords = (iso) => `${WEEKDAYS[weekdayIndex(iso)]} ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

const programColor = (programById, session) => (
  programTone(programById.get(String(session.programId))?.color)
);

const SessionRow = ({ session, programById, staffById, studentById }) => {
  const program = programById.get(String(session.programId));
  const staff = staffById.get(String(session.therapistId));
  const students = (session.studentIds || [])
    .map((id) => studentById.get(String(id))?.name)
    .filter(Boolean);
  return (
    <div className="sa-row flex-col gap-1 sm:flex-row sm:gap-3">
      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-[var(--sa-text-muted)] sm:w-32">
        {formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}
      </span>
      <div className="min-w-0 flex-1 w-full">
        <p className="sa-row-title truncate">{session.title}</p>
        <p className="sa-row-meta mt-0.5 truncate">
          {[program?.name, students.join(', '), staff?.name, session.room].filter(Boolean).join(' · ')}
        </p>
      </div>
      {session.isConfirmed === false && <span className="sa-badge">Unconfirmed</span>}
    </div>
  );
};

const MonthGrid = ({ month, programById, selectedDateISO, todayISO, onSelect }) => {
  const leading = month.days[0]?.index ?? 0;
  return (
    <div>
      <p className="mb-2 text-xs text-[var(--sa-text-secondary)]">{month.label}</p>
      <div className="grid grid-cols-5 gap-0.5">
        {WEEKDAYS.map((day) => (
          <span key={day} className="sa-micro pb-1 text-center">{day}</span>
        ))}
        {Array.from({ length: leading }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
        {month.days.map((day) => {
          const selected = day.iso === selectedDateISO;
          const today = day.iso === todayISO;
          const shown = day.sessions.slice(0, 3);
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => onSelect(day.iso)}
              aria-pressed={selected}
              aria-current={today ? 'date' : undefined}
              aria-label={`${dayWords(day.iso)} — ${day.sessions.length} ${day.sessions.length === 1 ? 'session' : 'sessions'}`}
              className={clsx(
                'relative flex min-h-11 flex-col items-center gap-1 py-1 text-xs tabular-nums md:min-h-9',
                selected && 'bg-[var(--surface-sunken)]',
                !selected && 'hover:bg-[var(--surface-hover)]',
                selected || today ? 'text-[var(--ink-primary)]' : 'text-[var(--sa-text-secondary)]'
              )}
            >
              <span>{day.day}</span>
              <span className="flex h-1.5 items-center gap-1" aria-hidden="true">
                {shown.map((session) => (
                  <span
                    key={session.id}
                    className="itx-planner-dot h-1.5 w-1.5 shrink-0"
                    style={{
                      backgroundColor: programColor(programById, session),
                      opacity: session.isConfirmed === false ? 0.45 : 1,
                      borderRadius: 'var(--x-radius-sm)',
                    }}
                  />
                ))}
                {day.sessions.length > 3 && (
                  <span className="text-[11px] leading-none text-[var(--sa-text-muted)]">+{day.sessions.length - 3}</span>
                )}
              </span>
              {today && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-[var(--accent)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PlannerPage = () => {
  const { sessions, staff, students, programs, rooms, schedulingSettings, appRole, notify } = useGlobalState();
  const [searchParams, setSearchParams] = useSearchParams();
  const daySheetRef = useRef(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const view = searchParams.get('view') === 'week' ? 'week' : 'year';
  const dateParam = searchParams.get('date');
  const todayISO = formatDateISO(new Date());
  const selectedDateISO = useMemo(
    () => (dateParam && ISO_DATE.test(dateParam) ? dateParam : formatDateISO(new Date())),
    [dateParam]
  );

  const [staffId, setStaffId] = React.useState('all');
  const [roomName, setRoomName] = React.useState('all');

  const openView = (nextView, iso = selectedDateISO) => {
    setSearchParams(nextView === 'week' ? { view: 'week', date: iso } : { date: iso }, { replace: true });
  };

  const yearWindow = useMemo(
    () => normalizeYearWindow(schedulingSettings?.year_start, schedulingSettings?.year_end),
    [schedulingSettings]
  );
  const windowMonths = useMemo(() => monthSpan(yearWindow.start, yearWindow.end), [yearWindow]);
  const windowLabel = windowMonths.length > 1
    ? `${windowMonths[0].label} – ${windowMonths[windowMonths.length - 1].label}`
    : (windowMonths[0]?.label || '—');

  const programById = useMemo(
    () => new Map(programs.map((program) => [String(program.id), program])),
    [programs]
  );
  const staffById = useMemo(() => new Map(staff.map((person) => [String(person.id), person])), [staff]);
  const studentById = useMemo(() => new Map(students.map((student) => [String(student.id), student])), [students]);

  const filteredSessions = useMemo(() => sessions.filter((session) => (
    (staffId === 'all' || String(session.therapistId) === staffId) &&
    (roomName === 'all' || session.room === roomName)
  )), [sessions, staffId, roomName]);

  const year = useMemo(
    () => buildYear(filteredSessions, yearWindow.start, yearWindow.end),
    [filteredSessions, yearWindow]
  );
  const week = useMemo(
    () => buildWeek(filteredSessions, selectedDateISO),
    [filteredSessions, selectedDateISO]
  );
  const selectedDaySessions = useMemo(
    () => sessionsOnDate(filteredSessions, selectedDateISO),
    [filteredSessions, selectedDateISO]
  );

  // Matches the day calendar's own 8–17 default; the settings window replaces it.
  const hours = useMemo(() => {
    const start = schedulingSettings?.operating_start_time;
    const end = schedulingSettings?.operating_end_time;
    const first = Math.floor(timeToHour(start));
    const last = Math.ceil(timeToHour(end));
    if (!start || !end || !(last > first)) return HOURS;
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [schedulingSettings]);
  const bodyHeight = hours.length * ROW_HEIGHT;

  const yearSessionCount = year.reduce((sum, month) => (
    sum + month.days.reduce((n, day) => n + day.sessions.length, 0)
  ), 0);
  const schoolDayCount = year.reduce((sum, month) => sum + month.days.length, 0);

  const selectDay = (iso) => {
    openView('year', iso);
    daySheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Client-side export: the workbook is written here, nothing is uploaded.
  const exportSchedule = async () => {
    try {
      const { buildScheduleWorkbook, downloadWorkbook, scheduleFileName } = await import('../../lib/scheduleXlsx.js');
      downloadWorkbook(buildScheduleWorkbook({ sessions, students, staff, programs }), scheduleFileName());
      notify(`Exported ${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} to Excel`, 'success');
    } catch {
      // A failed chunk load (offline deploy, stale hash) must not reject unhandled.
      notify('Could not build the export file. Try again.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="sa-title">Year Planner</h1>
            <p className="sa-sub">The whole school year at a glance, and any week in detail.</p>
            <p className="mt-1 text-xs text-[var(--sa-text-muted)]">Shows scheduled sessions only — holidays and closures are not modelled.</p>
          </div>
          <div className="text-right">
            <p className="sa-micro">School year window</p>
            <p className="text-sm tabular-nums text-[var(--sa-text-primary)]">{windowLabel}</p>
            {appRole === 'superadmin' && (
              <Link to="/admin/config" className="sa-link mt-1">
                <CalendarRange size={12} strokeWidth={1.5} /> Change in System Config
              </Link>
            )}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="sa-btn">
                <Upload size={14} strokeWidth={1.5} /> Import schedule
              </button>
              <button type="button" onClick={exportSchedule} className="sa-btn">
                <Download size={14} strokeWidth={1.5} /> Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI scheduling: preview, then confirm ────────────────────────── */}
      <AiSchedulingPanel />

      {/* ── View, filters, week nav ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center" role="group" aria-label="Planner view">
          {[['year', 'Year'], ['week', 'Week']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => openView(key)}
              aria-pressed={view === key}
              className={clsx('itx-tab', view === key && 'is-active')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 gap-2 max-w-md">
          {/* Hidden label, not aria-label: the shared icon-button rule flattens
              aria-labelled buttons, so the combobox would lose its field shape. */}
          <label htmlFor="planner-staff" className="sr-only">Staff</label>
          <ItxSelect
            id="planner-staff"
            value={staffId}
            onChange={setStaffId}
            className={`${fieldClass} min-w-0 flex-1`}
            options={[
              { value: 'all', label: 'All staff' },
              ...[...staff]
                .filter((person) => person.app_role !== 'parent')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((person) => ({ value: String(person.id), label: person.name })),
            ]}
          />
          <label htmlFor="planner-room" className="sr-only">Room</label>
          <ItxSelect
            id="planner-room"
            value={roomName}
            onChange={setRoomName}
            className={`${fieldClass} min-w-0 flex-1`}
            options={[
              { value: 'all', label: 'All rooms' },
              ...rooms.map((room) => ({ value: room.name, label: room.name })),
            ]}
          />
        </div>

        {view === 'week' && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => openView('week', shiftDay(selectedDateISO, -7))} aria-label="Previous week" className="sa-btn justify-center">
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            <input
              type="date"
              value={selectedDateISO}
              onChange={(e) => e.target.value && openView('week', e.target.value)}
              aria-label="Week of"
              className={fieldClass}
            />
            <button type="button" onClick={() => openView('week', shiftDay(selectedDateISO, 7))} aria-label="Next week" className="sa-btn justify-center">
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => openView('week', todayISO)} className="sa-btn">Today</button>
          </div>
        )}
      </div>

      {view === 'year' ? (
        <>
          <section className="sa-panel">
            <div className="sa-panel-head">
              <div>
                <h2 className="sa-panel-title">School year</h2>
                <p className="sa-panel-sub tabular-nums">{windowLabel} · {schoolDayCount} school days · {yearSessionCount} sessions</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
              {year.map((month) => (
                <MonthGrid
                  key={`${month.year}-${month.month}`}
                  month={month}
                  programById={programById}
                  selectedDateISO={selectedDateISO}
                  todayISO={todayISO}
                  onSelect={selectDay}
                />
              ))}
            </div>
          </section>

          <section ref={daySheetRef} className="sa-panel scroll-mt-4">
            <div className="sa-panel-head">
              <div>
                <h2 className="sa-panel-title tabular-nums">{dayWords(selectedDateISO)} {selectedDateISO.slice(0, 4)}</h2>
                <p className="sa-panel-sub">{selectedDaySessions.length} {selectedDaySessions.length === 1 ? 'session' : 'sessions'}</p>
              </div>
              {appRole === 'admin' && (
                <Link to="/schedule" className="sa-btn">Open in calendar</Link>
              )}
            </div>
            {selectedDaySessions.length === 0 ? (
              <div className="sa-empty">
                <p className="sa-empty-title">Nothing scheduled</p>
                <p className="sa-empty-sub">No sessions are placed on this day.</p>
              </div>
            ) : (
              <div className="mt-2">
                {[...selectedDaySessions]
                  .sort((a, b) => a.startHour - b.startHour)
                  .map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      programById={programById}
                      staffById={staffById}
                      studentById={studentById}
                    />
                  ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="sa-panel">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title tabular-nums">
                Week of {Number(week[0].iso.slice(8, 10))} {MONTHS[Number(week[0].iso.slice(5, 7)) - 1]} – {Number(week[4].iso.slice(8, 10))} {MONTHS[Number(week[4].iso.slice(5, 7)) - 1]} {week[4].iso.slice(0, 4)}
              </h2>
              <p className="sa-panel-sub tabular-nums">
                {week.reduce((n, day) => n + day.sessions.length, 0)} sessions · Mon–Fri
              </p>
            </div>
          </div>

          {/* Desktop and tablet: Mon–Fri × operating hours */}
          <div
            className="mt-4 hidden md:grid grid-cols-[72px_repeat(5,minmax(0,1fr))]"
          >
            <div className="sticky top-0 z-20 border-b border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] px-2 py-2">
              <p className="sa-micro">Time</p>
            </div>
            {week.map((day) => (
              <div key={`head-${day.iso}`} className="sticky top-0 z-20 border-b border-l border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] px-2 py-2">
                <p className="sa-micro">
                  {WEEKDAYS[day.index]}{' '}
                  <span className={clsx('tabular-nums', day.iso === todayISO ? 'border-b-2 border-[var(--accent)] text-[var(--ink-primary)]' : 'text-[var(--sa-text-muted)]')}>
                    {Number(day.iso.slice(8, 10))}
                  </span>
                </p>
                <p className="text-xs tabular-nums text-[var(--sa-text-muted)]">{day.sessions.length}</p>
              </div>
            ))}

            <div className="relative border-r border-[var(--sa-line-hairline)]" style={{ height: bodyHeight }}>
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className={clsx('absolute right-2 sa-micro tabular-nums', i === 0 ? 'pt-0.5' : '-translate-y-1/2')}
                  style={{ top: i === 0 ? 1 : i * ROW_HEIGHT }}
                >
                  {formatHour(hour).replace(':00', '')}
                </div>
              ))}
              <div className="absolute right-2 -translate-y-1/2 sa-micro tabular-nums" style={{ top: bodyHeight }}>
                {formatHour(hours[hours.length - 1] + 1).replace(':00', '')}
              </div>
            </div>

            {week.map((day) => {
              const conflictIds = new Set(findAllConflicts(day.sessions).flatMap((conflict) => conflict.sessionIds));
              return (
                <div
                  key={`body-${day.iso}`}
                  role="list"
                  aria-label={`${WEEKDAYS[day.index]} ${Number(day.iso.slice(8, 10))} ${MONTHS[Number(day.iso.slice(5, 7)) - 1]} — ${day.sessions.length} sessions`}
                  className="relative overflow-hidden border-l border-[var(--sa-line-hairline)]"
                  style={{ height: bodyHeight }}
                >
                  {hours.map((hour, i) => (
                    <React.Fragment key={hour}>
                      <div
                        className="absolute inset-x-0 border-t border-[var(--sa-line-hairline)]"
                        style={{ top: i * ROW_HEIGHT }}
                        aria-hidden="true"
                      />
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-[var(--sa-line-hairline)]"
                        style={{ top: i * ROW_HEIGHT + ROW_HEIGHT / 2 }}
                        aria-hidden="true"
                      />
                    </React.Fragment>
                  ))}
                  {layoutDaySessions(day.sessions).map(({ session, lane, lanes }) => {
                    const color = programColor(programById, session);
                    const students = (session.studentIds || [])
                      .map((id) => studentById.get(String(id))?.name)
                      .filter(Boolean)
                      .map((name) => name.split(' ').map((part) => part[0]).slice(0, 2).join(''))
                      .join(' · ');
                    const top = (session.startHour - hours[0]) * ROW_HEIGHT + 2;
                    const height = Math.max(session.span, 0.5) * ROW_HEIGHT - 4;
                    const width = 100 / lanes;
                    return (
                      <div
                        key={session.id}
                        role="listitem"
                        title={`${session.title} · ${formatHour(session.startHour)} – ${formatHour(session.startHour + session.span)} · ${session.room}`}
                        className={clsx(
                          'absolute overflow-hidden border-l-2 bg-[var(--surface-sunken)] py-1 pl-1.5 pr-1',
                          session.isConfirmed === false && 'opacity-45'
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * width}% + 4px)`,
                          width: `calc(${width}% - 6px)`,
                          borderLeftColor: color,
                        }}
                      >
                        <p className="truncate text-xs leading-tight text-[var(--sa-text-primary)]">{session.title}</p>
                        <p className="truncate text-xs leading-tight text-[var(--sa-text-muted)]">
                          {[students, session.room].filter(Boolean).join(' · ')}
                        </p>
                        {conflictIds.has(session.id) && (
                          <>
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-[var(--sa-danger)]" aria-hidden="true" />
                            <span className="sr-only">Scheduling conflict</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Phone: one collapsible section per day, no horizontal scroll */}
          <div className="mt-4 space-y-2 md:hidden">
            {week.map((day) => (
              <details key={`fold-${day.iso}`} open={day.iso === selectedDateISO} className="overflow-hidden">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs text-[var(--sa-text-primary)]">
                  <span>
                    {WEEKDAYS[day.index]} {Number(day.iso.slice(8, 10))} {MONTHS[Number(day.iso.slice(5, 7)) - 1]}
                  </span>
                  <span className="text-xs tabular-nums text-[var(--sa-text-muted)]">
                    {day.sessions.length} {day.sessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                </summary>
                {day.sessions.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-[var(--sa-text-muted)]">Nothing scheduled</p>
                ) : (
                  <div className="px-3">
                    {[...day.sessions]
                      .sort((a, b) => a.startHour - b.startHour)
                      .map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          programById={programById}
                          staffById={staffById}
                          studentById={studentById}
                        />
                      ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>
      )}

      {importOpen && (
        <React.Suspense fallback={null}>
          <ScheduleImportWizard onClose={() => setImportOpen(false)} />
        </React.Suspense>
      )}
    </div>
  );
};

export default PlannerPage;
