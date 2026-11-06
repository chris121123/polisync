import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock,
  Users, X, Info, AlertCircle, Trash2, Zap, CheckCircle2, Filter,
  LayoutGrid, List, BookOpen, MapPin, RefreshCw, TrendingUp, UserCheck
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../../context/GlobalStateContext';
import {
  HOURS, formatHour, formatDateISO, getWeekStart, weekDatesFor,
  filterSessionsForView, groupSessionsByDay, slotHasConflict as slotHasConflictAt, TYPE_CONFIG,
} from './calendarMath.js';
import { countAvailableStaff } from './staff.js';
import { dayOfWeekFor } from '../../lib/scheduling/time.js';
import { NowIndicator, SessionCard, WeeklySessionCard } from './SessionCard.jsx';
import { AddSessionModal } from './AddSessionModal.jsx';
import { ManageAvailabilityModal } from './ManageAvailabilityModal.jsx';
import { PendingPanel } from './PendingPanel.jsx';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ─── Main Component ───────────────────────────────────────────────────────────
const ScheduleCalendar = () => {
  const { staff, students, sessions, moveSession, addSession, deleteSession, conflicts, rooms, smartSchedule, notify, staffAvailability } = useGlobalState();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [calendarView, setCalendarView] = useState('daily'); // 'daily' | 'weekly'
  const [roomPage, setRoomPage] = useState(0);
  const scrollRef = useRef(null);

  // Tab lives in the URL so search can deep-link to the pending list.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'pending' ? 'pending' : 'calendar';
  const setTab = (next) => setSearchParams(next === 'pending' ? { tab: 'pending' } : {}, { replace: true });

  // ── Selected Date State ──
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const selectedDateISO = formatDateISO(selectedDate);
  // Same Mon–Fri mapping as handleAutoSchedule (Sunday keeps its Fri mapping).
  const scheduleDayOfWeek = dayOfWeekFor(selectedDate);
  const isWeekend = scheduleDayOfWeek < 0 || scheduleDayOfWeek > 4;

  const navigateDate = (offset) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset);
      return next;
    });
  };

  const navigateWeek = (offset) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (offset * 7));
      return next;
    });
  };

  const goToToday = () => setSelectedDate(new Date());

  const weekStart = getWeekStart(selectedDate);
  const weekDates = weekDatesFor(weekStart);

  // Count available staff for selected date (excluding parents/admins)
  const availableStaffCount = useMemo(
    () => countAvailableStaff(staff, staffAvailability, selectedDateISO),
    [staff, staffAvailability, selectedDateISO]
  );

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const detailPanelRef = useRef(null);
  // The desktop panel is inline; only the mobile bottom sheet is a modal dialog.
  useFocusTrap(detailPanelRef, {
    active: Boolean(selectedSession) && isMobile,
    onClose: () => setSelectedSessionId(null),
  });
  const isConflicted = id => conflicts.some(c => c.sessionIds.includes(id));
  const getConflictForSession = id => conflicts.find(c => c.sessionIds?.includes(id));

  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    const result = await smartSchedule({ dayOfWeek: scheduleDayOfWeek, sessionDate: selectedDateISO });
    if (!result.success) {
      notify(result.error || 'Auto-scheduler failed to run', 'error');
    } else if (!result.scheduled || result.scheduled.length === 0) {
      notify('Auto-scheduler: No pending student programs found to schedule for this day.', 'info');
    }
    setIsAutoScheduling(false);
  };

  // Display 4 rooms at a time in Daily View
  const ROOMS_PER_PAGE = 4;
  const maxRoomPages = Math.ceil(rooms.length / ROOMS_PER_PAGE);
  const displayRooms = rooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE).map(r => r.name);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  const selectedDayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;

  // Filter sessions by type AND by selected date
  const filteredSessions = useMemo(
    () => filterSessionsForView({ sessions, filterType, calendarView, selectedDateISO, selectedDayOfWeek }),
    [sessions, filterType, calendarView, selectedDateISO, selectedDayOfWeek]
  );

  // Group sessions by weekday for weekly view
  const sessionsByDay = useMemo(
    () => groupSessionsByDay(sessions, filterType, weekDates),
    [sessions, filterType, weekDates]
  );

  // Stats for the selected date
  const totalStudents = new Set(filteredSessions.flatMap(s => s.studentIds)).size;
  const activeRooms = new Set(filteredSessions.map(s => s.room)).size;

  const handleReschedule = (newHour) => {
    if (selectedSession) {
      moveSession(selectedSession.id, newHour);
      setSelectedSessionId(null);
    }
  };

  const slotHasConflict = (hour) => slotHasConflictAt(sessions, selectedSession, hour);

  const handleDragEnd = (sessionId, e, info, isWeekly = false) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Calculate vertical (row/time) movement
    const rowHeight = isWeekly ? 64 : 96;
    const offsetRows = Math.round(info.offset.y / rowHeight);
    let newStartHour = session.startHour + offsetRows;
    
    // Clamp to valid hours
    if (newStartHour < 8) newStartHour = 8;
    if (newStartHour + session.span > 18) newStartHour = 18 - session.span;

    // Calculate horizontal (column/room) movement
    let newRoom = session.room;
    
    if (!isWeekly && displayRooms.includes(session.room)) {
      // Find the visual width of a column so we know how far they dragged
      const colElement = e.target.closest('.flex-1.relative.border-l') || e.target.parentElement;
      const colWidth = colElement ? colElement.offsetWidth : 100;
      
      const offsetCols = Math.round(info.offset.x / colWidth);
      const origColIdx = displayRooms.indexOf(session.room);
      let newColIdx = origColIdx + offsetCols;
      
      // Clamp to visible columns to prevent crashing
      if (newColIdx < 0) newColIdx = 0;
      if (newColIdx >= displayRooms.length) newColIdx = displayRooms.length - 1;
      
      newRoom = displayRooms[newColIdx];
    }
    
    if (newStartHour !== session.startHour || newRoom !== session.room) {
      moveSession(sessionId, newStartHour, newRoom);
    }
  };

  // Removed unused todayIdx

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--sa-bg-base)] max-h-[calc(100vh-64px)]">

      {/* ── Left: Calendar ─────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col h-full min-w-0"
        onClick={() => setSelectedSessionId(null)}
      >

        {/* ── Toolbar ───────── */}
        <div className="flex-shrink-0 bg-[var(--sa-surface-1)]">
          {/* Top row */}
          <div className="px-6 py-3.5 sm:py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} strokeWidth={1.5} className="text-[var(--sa-text-secondary)]" />
                <div>
                  <h1 className="sa-title leading-none">Schedule</h1>
                  <p className="sa-sub">{calendarView === 'daily' ? 'Daily view' : 'Weekly view'}</p>
                </div>
              </div>

              {/* Section tabs: Calendar / Pending */}
              <div className="flex items-center" role="group" aria-label="Schedule section">
                {[['calendar', 'Calendar'], ['pending', 'Pending']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-pressed={tab === key}
                    className={clsx('itx-tab', tab === key && 'is-active')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* View toggle: Daily / Weekly */}
              <div className="flex items-center" role="group" aria-label="Calendar view">
                {[['daily', 'Daily'], ['weekly', 'Weekly']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCalendarView(key)}
                    aria-pressed={calendarView === key}
                    className={clsx('itx-tab', calendarView === key && 'is-active')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Date nav */}
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={calendarView === 'daily' ? 'Previous day' : 'Previous week'}
                  onClick={() => calendarView === 'daily' ? navigateDate(-1) : navigateWeek(-1)}
                  className="flex h-9 w-9 items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                <span className="px-2 text-[13px] tabular-nums whitespace-nowrap text-[var(--sa-text-primary)]">
                  {calendarView === 'daily'
                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                    : `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </span>
                <button
                  type="button"
                  aria-label={calendarView === 'daily' ? 'Next day' : 'Next week'}
                  onClick={() => calendarView === 'daily' ? navigateDate(1) : navigateWeek(1)}
                  className="flex h-9 w-9 items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </div>

              <button 
                onClick={goToToday}
                className="sa-btn"
              >
                Today
              </button>
            </div>

            <div className={clsx(
              'flex flex-wrap items-center gap-2.5 sm:gap-3 w-full mt-2 xl:mt-0',
              !selectedSession && 'xl:w-auto xl:shrink-0 xl:flex-nowrap'
            )}>
              {/* Type filters */}
              <div className="flex items-center" role="group" aria-label="Session type filter">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'sped', label: 'SPED' },
                  { key: 'rehab', label: 'Rehab' },
                  { key: 'playschool', label: 'Play' },
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilterType(f.key)}
                    aria-pressed={filterType === f.key}
                    className={clsx('itx-tab', filterType === f.key && 'is-active')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAutoSchedule}
                disabled={isAutoScheduling || isWeekend}
                title={isWeekend ? 'Scheduling is Monday–Friday only' : undefined}
                className="sa-btn"
              >
                {isAutoScheduling ? (
                  <RefreshCw size={16} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Zap size={16} strokeWidth={1.5} />
                )}
                {isAutoScheduling ? 'Scheduling...' : isWeekend ? 'Mon–Fri only' : 'Auto-Schedule'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAvailabilityModalOpen(true); }}
                className="sa-btn"
              >
                <UserCheck size={16} strokeWidth={1.5} />
                <span>Availability</span>
                {availableStaffCount > 0 && (
                  <span className="sa-badge tabular-nums">{availableStaffCount}</span>
                )}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }}
                className="sa-btn sa-btn--primary"
              >
                <Plus size={16} strokeWidth={1.5} /> Add Session
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="px-6 py-2.5 flex flex-wrap items-center gap-4 sm:gap-6">
            {[
              { label: 'Sessions', value: filteredSessions.length, icon: BookOpen, color: 'text-[var(--sa-text-primary)]' },
              { label: 'Students', value: totalStudents, icon: Users, color: 'text-[var(--sa-text-primary)]' },
              { label: 'Rooms Utilized', value: `${activeRooms}/${rooms.length}`, icon: MapPin, color: 'text-[var(--sa-text-primary)]' },
              { label: 'Available Staff', value: availableStaffCount, icon: UserCheck, color: availableStaffCount > 0 ? 'sa-t-warm' : 'text-[var(--sa-text-muted)]' },
              { label: 'Conflicts', value: conflicts.length, icon: AlertCircle, color: conflicts.length > 0 ? 'sa-t-danger' : 'text-[var(--sa-text-muted)]' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <stat.icon size={13} strokeWidth={1.5} className="text-[var(--sa-text-muted)] shrink-0" />
                <span className="text-[11px] text-[var(--sa-text-muted)]">{stat.label}:</span>
                <span className={clsx('text-[11px] tabular-nums', stat.color)}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ───────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-[var(--sa-bg-base)]">

          {tab === 'pending' ? (
            <PendingPanel selectedDateISO={selectedDateISO} dayOfWeek={scheduleDayOfWeek} />
          ) : isMobile ? (
            <div className="p-4 space-y-4 pb-20">
              {[...filteredSessions].sort((a, b) => a.startHour - b.startHour).map(session => {
                const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
                const provider = staff.find(s => String(s.id) === String(session.therapistId));
                const hasConflict = isConflicted(session.id);
                return (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedSessionId === session.id}
                    onClick={() => { setSelectedSessionId(session.id); setDetailTab('info'); setPendingDelete(false); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedSessionId(session.id);
                        setDetailTab('info');
                        setPendingDelete(false);
                      }
                    }}
                    className={clsx(
                      "bg-[var(--sa-surface-1)] p-4 relative overflow-hidden cursor-pointer hover:bg-[var(--sa-surface-2)] active:bg-[var(--sa-surface-warm)]",
                      selectedSessionId === session.id && "itx-selected"
                    )}
                  >
                    <div className={clsx(
                      "absolute left-0 top-0 bottom-0 w-1",
                      hasConflict ? "bg-[var(--danger)]" : "bg-[var(--sa-bar-primary)]"
                    )} />
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h3 className="text-[15px] leading-tight pr-4 text-[var(--sa-text-primary)]">{session.title}</h3>
                      {hasConflict ? (
                        <span className="sa-badge sa-t-danger shrink-0 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5}/> Conflict</span>
                      ) : (
                        <span className="sa-badge shrink-0">{cfg.label}</span>
                      )}
                    </div>
                    <div className="space-y-1.5 pl-2 mt-3">
                      <div className="flex items-center gap-2 text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                        <Clock size={14} strokeWidth={1.5} /> {formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--sa-text-muted)]">
                        <MapPin size={14} strokeWidth={1.5} /> {session.room}
                      </div>
                      {provider && (
                        <div className="flex items-center gap-2 text-[11px] text-[var(--sa-text-muted)]">
                          <Users size={14} strokeWidth={1.5} /> {provider.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredSessions.length === 0 && (
                <div className="sa-empty text-[var(--sa-text-muted)]">
                  <CalendarIcon size={20} strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="sa-empty-title">No sessions found</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ════════════ DAILY VIEW ════════════ */}
              {calendarView === 'daily' && (
                <div className="min-w-[760px] pb-10">
              {/* Room header row */}
              <div className="flex sticky top-0 z-30 bg-[var(--sa-surface-1)]">
                <div className="w-20 shrink-0 bg-[var(--sa-surface-1)] border-r border-[var(--sa-line-hairline)] flex flex-col justify-center items-center gap-1">
                  <div className="flex">
                    <button
                      type="button"
                      aria-label="Previous room page"
                      onClick={() => setRoomPage(Math.max(0, roomPage - 1))}
                      disabled={roomPage === 0}
                      className="flex h-9 w-9 items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                    ><ChevronLeft size={14} strokeWidth={1.5}/></button>
                    <button
                      type="button"
                      aria-label="Next room page"
                      onClick={() => setRoomPage(Math.min(maxRoomPages - 1, roomPage + 1))}
                      disabled={roomPage === maxRoomPages - 1}
                      className="flex h-9 w-9 items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                    ><ChevronRight size={14} strokeWidth={1.5}/></button>
                  </div>
                  <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)] text-center leading-tight">Page {roomPage + 1}/{maxRoomPages}</span>
                </div>
                {displayRooms.map((roomName) => {
                  const roomSessions = sessions.filter(s => s.room === roomName).length;
                  return (
                    <div key={roomName} className="flex-1 px-4 py-2.5 flex items-center justify-between border-l border-[var(--sa-line-hairline)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx(
                          'w-2 h-2 shrink-0',
                          roomSessions > 0 ? 'bg-[var(--ink-muted)]' : 'bg-[var(--sa-line-strong)]'
                        )} />
                        <span className="text-xs text-[var(--sa-text-primary)] truncate capitalize">{roomName}</span>
                      </div>
                      <span className="text-[11px] tabular-nums shrink-0 text-[var(--sa-text-muted)]">
                        {roomSessions} {roomSessions === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time gutter */}
                <div className="w-20 shrink-0 relative select-none" style={{ height: `${HOURS.length * 96}px` }}>
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className={clsx(
                        "absolute right-0 pr-3 flex items-center justify-end",
                        i === 0 ? "top-0 pt-0.5" : "-translate-y-1/2"
                      )}
                      style={{ top: i === 0 ? '1px' : `${i * 96}px` }}
                    >
                      <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                        {formatHour(hour)}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-3 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 96}px` }}
                  >
                    <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                      {formatHour(18)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex relative border-l border-[var(--sa-line-default)]">
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-[var(--sa-line-default)]' : 'border-dashed border-[var(--sa-line-hairline)]')} style={{ top: `${i * 96}px` }} />
                    ))}
                    {HOURS.slice(0, -1).map((_, i) => (
                      <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-dashed border-[var(--sa-line-hairline)]" style={{ top: `${i * 96 + 48}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-[var(--sa-line-default)]" style={{ top: `${HOURS.length * 96}px` }} />
                  </div>

                  {displayRooms.map((roomName, colIdx) => (
                    <div key={roomName} className={clsx('flex-1 relative border-l border-[var(--sa-line-hairline)]')}>
                      {colIdx === 0 && <NowIndicator rowHeight={96} />}
                      {filteredSessions.filter(s => s.room === roomName).map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          staffList={staff}
                          isSelected={selectedSessionId === session.id}
                          hasConflict={isConflicted(session.id)}
                          conflict={getConflictForSession(session.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionId(session.id);
                            setDetailTab('info');
                            setPendingDelete(false);
                          }}
                          onDragEnd={(id, e, info) => handleDragEnd(id, e, info, false)}
                        />
                      ))}
                      <div style={{ height: `${HOURS.length * 96}px` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════ WEEKLY VIEW ════════════ */}
          {calendarView === 'weekly' && (
            <div className="min-w-[800px]">
              {/* Day header row */}
              <div className="flex sticky top-0 z-30 bg-[var(--sa-surface-1)] border-b border-[var(--sa-line-default)]">
                <div className="w-16 shrink-0" />
                {WEEKDAYS.map((day, idx) => {
                  const dayDate = weekDates[idx];
                  const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                  const dateNum = dayDate.getDate();
                  const sessionCount = sessionsByDay[idx].length;

                  return (
                    <div key={day} className={clsx(
                      'flex-1 px-3 py-3 flex items-center justify-between border-l border-[var(--sa-line-hairline)]',
                      isToday ? 'bg-[var(--sa-surface-warm)]' : ''
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          'w-8 h-8 flex items-center justify-center text-sm tabular-nums',
                          isToday ? 'itx-selected text-[var(--sa-text-primary)]' : 'text-[var(--sa-text-muted)]'
                        )}>
                          {dateNum}
                        </div>
                        <div>
                          <span className={clsx('text-[11px]', isToday ? 'sa-t-warm' : 'text-[var(--sa-text-muted)]')}>
                            {WEEKDAYS_SHORT[idx]}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                        {sessionCount}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time labels */}
                <div className="w-16 shrink-0 relative select-none" style={{ height: `${HOURS.length * 64}px` }}>
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className={clsx(
                        "absolute right-0 pr-2 flex items-center justify-end",
                        i === 0 ? "top-0 pt-0.5" : "-translate-y-1/2"
                      )}
                      style={{ top: i === 0 ? '1px' : `${i * 64}px` }}
                    >
                      <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                        {formatHour(hour).replace(':00', '')}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-2 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 64}px` }}
                  >
                    <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                      {formatHour(18).replace(':00', '')}
                    </span>
                  </div>
                </div>

                {/* Day columns */}
                <div className="flex-1 flex relative border-l border-[var(--sa-line-default)]">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-[var(--sa-line-default)]' : 'border-dashed border-[var(--sa-line-hairline)]')} style={{ top: `${i * 64}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-[var(--sa-line-default)]" style={{ top: `${HOURS.length * 64}px` }} />
                  </div>

                  {WEEKDAYS.map((day, dayIdx) => {
                    const dayDate = weekDates[dayIdx];
                    const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                    return (
                      <div key={day} className={clsx(
                        'flex-1 relative border-l border-[var(--sa-line-hairline)]',
                        dayIdx === 0 && 'border-l-0'
                      )}>
                        {isToday && <NowIndicator rowHeight={64} />}

                        {sessionsByDay[dayIdx].map(session => (
                          <WeeklySessionCard
                            key={session.id}
                            session={session}
                            staffList={staff}
                            isSelected={selectedSessionId === session.id}
                            hasConflict={isConflicted(session.id)}
                            conflict={getConflictForSession(session.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSessionId(session.id);
                              setDetailTab('info');
                              setPendingDelete(false);
                            }}
                            onDragEnd={(id, e, info) => handleDragEnd(id, e, info, true)}
                          />
                        ))}

                        <div style={{ height: `${HOURS.length * 64}px` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </div>
      </div>

      {/* ── Right: Detail Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSession && (
          <>
            {/* Mobile Overlay Backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSessionId(null)}
                className="fixed inset-0 itx-backdrop z-40 lg:hidden"
              />
            )}
            <motion.div
              key="detail"
              ref={detailPanelRef}
              role={isMobile ? 'dialog' : undefined}
              aria-modal={isMobile ? 'true' : undefined}
              aria-labelledby={isMobile ? 'session-detail-title' : undefined}
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={clsx(
                "bg-[var(--sa-surface-1)] flex flex-col z-50",
                isMobile
                  ? "fixed bottom-0 left-0 right-0 h-[85vh]"
                  : "w-[360px] shrink-0 h-full relative"
              )}
            >
            {(() => {
              const cfg = TYPE_CONFIG[selectedSession.type] || TYPE_CONFIG.sped;
              const provider = staff.find(s => String(s.id) === String(selectedSession.therapistId));
              const hasConflict = isConflicted(selectedSession.id);
              return (
                <>
                  <div className="p-5 relative overflow-hidden bg-[var(--sa-surface-warm)]">
                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <span className="sa-badge">{cfg.label}</span>
                        <div className="flex items-center gap-1">
                          {pendingDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => { deleteSession(selectedSession.id); setSelectedSessionId(null); }}
                                aria-label="Confirm delete session"
                                className="sa-btn itx-danger"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(false)}
                                aria-label="Cancel delete"
                                className="sa-btn"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(true)}
                              aria-label="Delete session"
                              className="inline-flex min-h-9 min-w-9 items-center justify-center p-2 text-[var(--sa-text-secondary)] hover:text-[var(--sa-danger)]"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          )}
                          <button
                            type="button"
                            data-autofocus
                            onClick={() => { setSelectedSessionId(null); setPendingDelete(false); }}
                            aria-label="Close session details"
                            className="inline-flex min-h-9 min-w-9 items-center justify-center p-2 text-[var(--sa-text-secondary)] hover:text-[var(--sa-text-primary)]"
                          >
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                      <h3 id="session-detail-title" className="text-[var(--sa-text-primary)] text-[17px] font-medium leading-tight">{selectedSession.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-[var(--sa-text-muted)] text-[11px] tabular-nums">
                          <Clock size={11} strokeWidth={1.5} /> {formatHour(selectedSession.startHour)} – {formatHour(selectedSession.startHour + selectedSession.span)}
                        </span>
                        <span className="flex items-center gap-1 text-[var(--sa-text-muted)] text-[11px]">
                          <MapPin size={11} strokeWidth={1.5} /> {selectedSession.room}
                        </span>
                        {provider && <span className="flex items-center gap-1 text-[var(--sa-text-muted)] text-[11px]"><Users size={11} strokeWidth={1.5} /> {provider.name}</span>}
                      </div>
                      {hasConflict && (
                        <div className="mt-3 flex items-center gap-2 sa-alert px-3 py-1.5 sa-t-danger">
                          <AlertCircle size={13} strokeWidth={1.5} />
                          <span className="text-[11px]">Scheduling Conflict Detected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex px-5" role="tablist" aria-label="Session details">
                    {[
                      { key: 'info', label: 'Details', icon: Info },
                      { key: 'reschedule', label: 'Reschedule', icon: RefreshCw },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        id={`session-tab-${tab.key}`}
                        aria-selected={detailTab === tab.key}
                        aria-controls="session-detail-panel"
                        onClick={() => setDetailTab(tab.key)}
                        className={clsx('itx-tab flex-1 justify-center', detailTab === tab.key && 'is-active')}
                      >
                        <tab.icon size={13} strokeWidth={1.5} />
                        {tab.label}
                        {tab.key === 'reschedule' && hasConflict && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div
                    id="session-detail-panel"
                    role="tabpanel"
                    aria-labelledby={`session-tab-${detailTab}`}
                    className="flex-1 overflow-y-auto p-5 space-y-4"
                  >
                    {detailTab === 'info' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                        {[
                          { icon: Users, label: 'Provider', value: provider?.name ?? '—', sub: provider?.role },
                          { icon: Clock, label: 'Time Slot', value: `${formatHour(selectedSession.startHour)} – ${formatHour(selectedSession.startHour + selectedSession.span)}`, sub: `${selectedSession.span}h duration` },
                          { icon: MapPin, label: 'Venue', value: selectedSession.room },
                          { icon: TrendingUp, label: 'Students', value: `${selectedSession.studentIds?.length ?? 0} enrolled` },
                        ].map(row => (
                          <div key={row.label} className="sa-row">
                            <row.icon size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 sa-t-muted" />
                            <div>
                              <p className="sa-row-meta">{row.label}</p>
                              <p className="text-sm tabular-nums text-[var(--sa-text-primary)]">{row.value}</p>
                              {row.sub && <p className="text-[11px] sa-t-muted">{row.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {detailTab === 'reschedule' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {hasConflict && (
                          <div className="p-4 sa-alert sa-alert--danger space-y-1">
                            <p className="text-[11px] flex items-center gap-2">
                              <AlertCircle size={13} strokeWidth={1.5} /> Conflict Detected
                            </p>
                            <p className="text-[11px] leading-relaxed">
                              This session overlaps with another session for the same therapist or room.
                            </p>
                          </div>
                        )}

                        <div>
                          <h5 className="sa-micro mb-3 flex items-center gap-2">
                            <Zap size={12} strokeWidth={1.5} /> Smart Suggestions
                          </h5>
                          <div className="space-y-2">
                            {(() => {
                              const suggestions = [1, 2, 3]
                                .map(offset => selectedSession.startHour + offset)
                                .filter(newHour => newHour + selectedSession.span <= 17 && !slotHasConflict(newHour));
                              if (suggestions.length === 0) {
                                return (
                                  <p className="text-[11px] sa-t-muted">No suggested slots left today (last start 17:00) — drag the session to another room or day.</p>
                                );
                              }
                              return suggestions.map(newHour => (
                                <button
                                  key={newHour}
                                  type="button"
                                  onClick={() => handleReschedule(newHour)}
                                  className="w-full text-left p-3.5 sa-row sa-t-warm"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center gap-3">
                                      <div className="tabular-nums text-sm">
                                        {formatHour(newHour)}
                                        <span className="text-[11px] mx-1">→</span>
                                        {formatHour(newHour + selectedSession.span)}
                                      </div>
                                      <span className="sa-link shrink-0">Move</span>
                                    </div>
                                    <p className="text-[11px] mt-1">{selectedSession.room} · no conflict at this time</p>
                                  </div>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>

                        {!hasConflict && (
                          <div className="p-4 sa-alert flex items-center gap-3 sa-t-warm">
                            <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0" />
                            <p className="text-[11px]">No conflicts — session is optimally placed.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </>
              );
            })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Empty state hint when nothing selected */}
      {/* Empty state hint removed as requested */}

      <AddSessionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addSession}
        staff={staff}
        students={students}
        rooms={rooms}
        sessions={filteredSessions}
        staffAvailability={staffAvailability}
        onOpenAvailability={() => setIsAvailabilityModalOpen(true)}
      />

      <ManageAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        staff={staff}
        staffAvailability={staffAvailability}
      />
    </div>
  );
};

export default ScheduleCalendar;
