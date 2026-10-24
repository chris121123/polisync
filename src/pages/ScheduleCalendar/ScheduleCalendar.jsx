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
import { isTherapistOrTeacher } from './staff.js';
import { NowIndicator, SessionCard, WeeklySessionCard } from './SessionCard.jsx';
import { AddSessionModal } from './AddSessionModal.jsx';
import { ManageAvailabilityModal } from './ManageAvailabilityModal.jsx';
import { PendingPanel } from './PendingPanel.jsx';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ─── Main Component ───────────────────────────────────────────────────────────
const ScheduleCalendar = () => {
  const { staff, students, sessions, moveSession, addSession, deleteSession, conflicts, rooms, smartSchedule, notify, staffAvailability, addStaffAvailability, removeStaffAvailability } = useGlobalState();
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
  const scheduleDayOfWeek = selectedDate.getDay() === 0 ? 4 : selectedDate.getDay() - 1;
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
  const availableStaffCount = useMemo(() => {
    const eligibleIds = new Set((staff || []).filter(isTherapistOrTeacher).map(s => s.id));
    return staffAvailability?.filter(a => a.available_date === selectedDateISO && eligibleIds.has(a.staff_id)).length || 0;
  }, [staff, staffAvailability, selectedDateISO]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
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
    <div className="flex h-full w-full overflow-hidden bg-ps-bg max-h-[calc(100vh-64px)]">

      {/* ── Left: Calendar ─────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col h-full min-w-0"
        onClick={() => setSelectedSessionId(null)}
      >

        {/* ── Toolbar ───────── */}
        <div className="flex-shrink-0 border-b border-ps-border bg-ps-surface">
          {/* Top row */}
          <div className="px-6 py-3.5 sm:py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-ps-primary flex items-center justify-center">
                  <CalendarIcon size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-ps-ink-1 leading-none">Schedule</h1>
                  <p className="text-xs text-ps-ink-2 font-medium">{calendarView === 'daily' ? 'Daily view' : 'Weekly view'}</p>
                </div>
              </div>

              {/* Section tabs: Calendar / Pending */}
              <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1" role="group" aria-label="Schedule section">
                {[['calendar', 'Calendar'], ['pending', 'Pending']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-pressed={tab === key}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      tab === key ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* View toggle: Daily / Weekly */}
              <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1">
                <button
                  onClick={() => setCalendarView('daily')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    calendarView === 'daily' ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1'
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCalendarView('weekly')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    calendarView === 'weekly' ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1'
                  )}
                >
                  Weekly
                </button>
              </div>

              {/* Date nav */}
              <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1">
                <button 
                  onClick={() => calendarView === 'daily' ? navigateDate(-1) : navigateWeek(-1)}
                  className="p-1.5 rounded-lg hover:bg-ps-bg hover:shadow-sm text-ps-ink-2 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-medium text-ps-ink-1">
                  {calendarView === 'daily'
                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                    : `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </span>
                <button 
                  onClick={() => calendarView === 'daily' ? navigateDate(1) : navigateWeek(1)}
                  className="p-1.5 rounded-lg hover:bg-ps-bg hover:shadow-sm text-ps-ink-2 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-medium text-ps-accent bg-ps-accent-soft hover:bg-ps-accent-soft border border-ps-accent/20 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto xl:shrink-0 xl:flex-nowrap mt-2 xl:mt-0">
              {/* Type filters */}
              <div className="flex items-center gap-1 bg-ps-bg rounded-xl p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'sped', label: 'SPED' },
                  { key: 'rehab', label: 'Rehab' },
                  { key: 'playschool', label: 'Play' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filterType === f.key
                        ? 'bg-ps-surface text-ps-ink-1 shadow-sm'
                        : 'text-ps-ink-2 hover:text-ps-ink-1'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAutoSchedule}
                disabled={isAutoScheduling || isWeekend}
                title={isWeekend ? 'Scheduling is Monday–Friday only' : undefined}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isAutoScheduling || isWeekend
                    ? "bg-ps-border text-ps-ink-2 cursor-not-allowed" 
                    : "border border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-accent"
                )}
              >
                {isAutoScheduling ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} strokeWidth={2.5} />
                )}
                {isAutoScheduling ? 'Scheduling...' : isWeekend ? 'Mon–Fri only' : 'Auto-Schedule'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAvailabilityModalOpen(true); }}
                className="flex items-center gap-2 border border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-accent px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <UserCheck size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Availability</span>
                {availableStaffCount > 0 && (
                  <span className="bg-ps-accent-soft text-ps-accent text-xs font-medium px-1.5 py-0.5 rounded-full">{availableStaffCount}</span>
                )}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }}
                className="flex items-center gap-2 bg-ps-primary hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> Add Session
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="px-6 py-2.5 border-t border-ps-border/60 flex flex-wrap items-center gap-4 sm:gap-6 bg-ps-bg/30">
            {[
              { label: 'Sessions', value: filteredSessions.length, icon: BookOpen, color: 'text-ps-ink-1' },
              { label: 'Students', value: totalStudents, icon: Users, color: 'text-ps-ink-1' },
              { label: 'Rooms Utilized', value: `${activeRooms}/${rooms.length}`, icon: MapPin, color: 'text-ps-ink-1' },
              { label: 'Available Staff', value: availableStaffCount, icon: UserCheck, color: availableStaffCount > 0 ? 'text-ps-success font-semibold' : 'text-ps-ink-2' },
              { label: 'Conflicts', value: conflicts.length, icon: AlertCircle, color: conflicts.length > 0 ? 'text-ps-danger font-semibold' : 'text-ps-ink-2' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <stat.icon size={13} className="text-ps-ink-2 shrink-0" />
                <span className="text-xs text-ps-ink-2 font-medium">{stat.label}:</span>
                <span className={clsx('text-xs font-medium', stat.color)}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ───────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-ps-bg">

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
                    onClick={() => { setSelectedSessionId(session.id); setDetailTab('info'); setPendingDelete(false); }}
                    className={clsx(
                      "bg-ps-surface p-4 rounded-2xl border shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform",
                      hasConflict ? "border-ps-danger/20 ring-2 ring-ps-danger/20" : cfg.border,
                      selectedSessionId === session.id ? "ring-2 ring-ps-accent" : ""
                    )}
                  >
                    <div className={clsx('absolute left-0 top-0 bottom-0 w-1.5', cfg.gradient)} />
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h3 className={clsx("font-semibold text-base leading-tight pr-4", cfg.text)}>{session.title}</h3>
                      {hasConflict ? (
                        <span className="shrink-0 px-2 py-1 bg-ps-danger/10 text-ps-danger text-xs font-medium rounded-lg flex items-center gap-1"><AlertCircle size={10}/> Conflict</span>
                      ) : (
                        <span className={clsx('text-xs font-medium px-2 py-1 rounded-lg shrink-0', cfg.badge)}>{cfg.label}</span>
                      )}
                    </div>
                    <div className="space-y-1.5 pl-2 mt-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                        <Clock size={14} className="opacity-70" /> {formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                        <MapPin size={14} className="opacity-70" /> {session.room}
                      </div>
                      {provider && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                          <Users size={14} className="opacity-70" /> {provider.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredSessions.length === 0 && (
                <div className="text-center p-8 bg-ps-surface rounded-2xl border border-dashed border-ps-border text-ps-ink-2">
                  <CalendarIcon size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-sm">No sessions found</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ════════════ DAILY VIEW ════════════ */}
              {calendarView === 'daily' && (
                <div className="min-w-[760px] pb-10">
              {/* Room header row */}
              <div className="flex sticky top-0 z-30 bg-ps-surface border-b border-ps-border shadow-sm">
                <div className="w-20 shrink-0 bg-ps-surface border-r border-ps-border flex flex-col justify-center items-center gap-1">
                  <div className="flex bg-ps-bg rounded-lg p-0.5">
                    <button 
                      onClick={() => setRoomPage(Math.max(0, roomPage - 1))}
                      disabled={roomPage === 0}
                      className="p-1 rounded text-ps-ink-2 hover:bg-ps-bg disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronLeft size={14}/></button>
                    <button 
                      onClick={() => setRoomPage(Math.min(maxRoomPages - 1, roomPage + 1))}
                      disabled={roomPage === maxRoomPages - 1}
                      className="p-1 rounded text-ps-ink-2 hover:bg-ps-bg disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronRight size={14}/></button>
                  </div>
                  <span className="text-xs font-medium text-ps-ink-2 text-center leading-tight">Page {roomPage + 1}/{maxRoomPages}</span>
                </div>
                {displayRooms.map((roomName) => {
                  const roomSessions = sessions.filter(s => s.room === roomName).length;
                  return (
                    <div key={roomName} className="flex-1 px-3 py-2.5 flex items-center justify-between border-l border-ps-border bg-ps-surface">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx(
                          'w-2 h-2 rounded-full shrink-0',
                          roomSessions > 0 ? 'bg-ps-primary' : 'bg-ps-ink-2/40'
                        )} />
                        <span className="text-xs font-semibold text-ps-ink-1 truncate capitalize">{roomName}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-ps-bg text-ps-ink-2 border border-ps-border">
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
                      <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                        {formatHour(hour)}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-3 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 96}px` }}
                  >
                    <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                      {formatHour(18)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex relative border-l border-ps-border">
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-ps-border' : 'border-dashed border-ps-border/60')} style={{ top: `${i * 96}px` }} />
                    ))}
                    {HOURS.slice(0, -1).map((_, i) => (
                      <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-ps-border/40 border-dashed" style={{ top: `${i * 96 + 48}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-ps-border" style={{ top: `${HOURS.length * 96}px` }} />
                  </div>

                  {displayRooms.map((roomName, colIdx) => (
                    <div key={roomName} className={clsx('flex-1 relative border-l border-ps-border')}>
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
              <div className="flex sticky top-0 z-30 bg-ps-surface border-b border-ps-border shadow-sm">
                <div className="w-16 shrink-0" />
                {WEEKDAYS.map((day, idx) => {
                  const dayDate = weekDates[idx];
                  const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                  const dateNum = dayDate.getDate();
                  const sessionCount = sessionsByDay[idx].length;

                  return (
                    <div key={day} className={clsx(
                      'flex-1 px-3 py-3 flex items-center justify-between border-l border-ps-border',
                      isToday ? 'bg-ps-accent-soft/70' : 'bg-ps-surface'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium',
                          isToday ? 'bg-ps-primary text-white shadow-sm' : 'bg-ps-bg text-ps-ink-2'
                        )}>
                          {dateNum}
                        </div>
                        <div>
                          <span className={clsx('text-xs font-medium ', isToday ? 'text-ps-accent' : 'text-ps-ink-2')}>
                            {WEEKDAYS_SHORT[idx]}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ps-bg text-ps-ink-2 border border-ps-border">
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
                      <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                        {formatHour(hour).replace(':00', '')}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-2 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 64}px` }}
                  >
                    <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                      {formatHour(18).replace(':00', '')}
                    </span>
                  </div>
                </div>

                {/* Day columns */}
                <div className="flex-1 flex relative border-l border-ps-border">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-ps-border' : 'border-dashed border-ps-border/60')} style={{ top: `${i * 64}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-ps-border" style={{ top: `${HOURS.length * 64}px` }} />
                  </div>

                  {WEEKDAYS.map((day, dayIdx) => {
                    const dayDate = weekDates[dayIdx];
                    const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                    return (
                      <div key={day} className={clsx(
                        'flex-1 relative border-l border-ps-border',
                        dayIdx === 0 && 'border-l-0',
                        isToday && 'bg-ps-accent-soft/20'
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
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              />
            )}
            <motion.div
              key="detail"
              initial={isMobile ? { y: '100%', opacity: 0 } : { x: 380, opacity: 0 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={clsx(
                "bg-ps-surface flex flex-col z-50",
                isMobile 
                  ? "fixed bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl shadow-md" 
                  : "w-[360px] shrink-0 border-l border-ps-border h-full relative"
              )}
            >
            {(() => {
              const cfg = TYPE_CONFIG[selectedSession.type] || TYPE_CONFIG.sped;
              const provider = staff.find(s => String(s.id) === String(selectedSession.therapistId));
              const hasConflict = isConflicted(selectedSession.id);
              return (
                <>
                  <div className={clsx('p-5 relative overflow-hidden', selectedSession.type === 'rehab' ? 'bg-sky-700' : selectedSession.type === 'sped' ? 'bg-purple-700' : cfg.gradient)}>
                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-white/70 text-xs font-medium ">{cfg.label}</span>
                        <div className="flex items-center gap-1">
                          {pendingDelete ? (
                            <>
                              <button
                                onClick={() => { deleteSession(selectedSession.id); setSelectedSessionId(null); }}
                                aria-label="Confirm delete session"
                                className="px-2.5 py-1.5 rounded-lg bg-ps-danger dark:bg-red-700 hover:opacity-90 text-white text-xs font-medium transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setPendingDelete(false)}
                                aria-label="Cancel delete"
                                className="px-2.5 py-1.5 rounded-lg bg-ps-ink-2 hover:opacity-90 text-white text-xs font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPendingDelete(true)}
                              aria-label="Delete session"
                              className="p-2 rounded-lg bg-white/20 hover:bg-ps-danger dark:hover:bg-red-700 text-white transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedSessionId(null); setPendingDelete(false); }}
                            aria-label="Close session details"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-lg leading-tight">{selectedSession.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                          <Clock size={11} /> {formatHour(selectedSession.startHour)} – {formatHour(selectedSession.startHour + selectedSession.span)}
                        </span>
                        <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                          <MapPin size={11} /> {selectedSession.room}
                        </span>
                        {provider && <span className="flex items-center gap-1 text-white/80 text-xs font-medium"><Users size={11} /> {provider.name}</span>}
                      </div>
                      {hasConflict && (
                        <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                          <AlertCircle size={13} className="text-white" />
                          <span className="text-white text-xs font-medium">Scheduling Conflict Detected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-ps-border">
                    {[
                      { key: 'info', label: 'Details', icon: Info },
                      { key: 'reschedule', label: 'Reschedule', icon: RefreshCw },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setDetailTab(tab.key)}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors',
                          detailTab === tab.key ? 'text-ps-accent border-ps-accent' : 'text-ps-ink-2 border-transparent hover:text-ps-ink-2'
                        )}
                      >
                        <tab.icon size={13} />
                        {tab.label}
                        {tab.key === 'reschedule' && hasConflict && (
                          <span className="w-2 h-2 rounded-full bg-ps-danger/100" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {detailTab === 'info' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {[
                          { icon: Users, label: 'Provider', value: provider?.name ?? '—', sub: provider?.role },
                          { icon: Clock, label: 'Time Slot', value: `${formatHour(selectedSession.startHour)} – ${formatHour(selectedSession.startHour + selectedSession.span)}`, sub: `${selectedSession.span}h duration` },
                          { icon: MapPin, label: 'Venue', value: selectedSession.room },
                          { icon: TrendingUp, label: 'Students', value: `${selectedSession.studentIds?.length ?? 0} enrolled` },
                        ].map(row => (
                          <div key={row.label} className="flex items-start gap-3 p-3 bg-ps-bg rounded-xl">
                            <div className="p-2 bg-ps-surface rounded-lg border border-ps-border shrink-0">
                              <row.icon size={14} className="text-ps-ink-2" />
                            </div>
                            <div>
                              <p className="text-xs font-medium  text-ps-ink-2">{row.label}</p>
                              <p className="text-sm font-medium text-ps-ink-1 mt-0.5">{row.value}</p>
                              {row.sub && <p className="text-xs text-ps-ink-2 font-medium">{row.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {detailTab === 'reschedule' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {hasConflict && (
                          <div className="p-4 bg-ps-danger/10 border border-ps-danger/20 rounded-xl">
                            <p className="text-xs font-medium text-ps-danger flex items-center gap-2 mb-1">
                              <AlertCircle size={13} /> Conflict Detected
                            </p>
                            <p className="text-xs text-ps-danger font-medium leading-relaxed">
                              This session overlaps with another session for the same therapist or room.
                            </p>
                          </div>
                        )}

                        <div>
                          <h5 className="text-xs font-semibold text-ps-ink-2  mb-3 flex items-center gap-2">
                            <Zap size={12} className="text-ps-warn" /> Smart Suggestions
                          </h5>
                          <div className="space-y-2">
                            {(() => {
                              const suggestions = [1, 2, 3]
                                .map(offset => selectedSession.startHour + offset)
                                .filter(newHour => newHour + selectedSession.span <= 17 && !slotHasConflict(newHour));
                              if (suggestions.length === 0) {
                                return (
                                  <p className="text-xs text-ps-ink-2 font-medium">No suggested slots left today (last start 17:00) — drag the session to another room or day.</p>
                                );
                              }
                              return suggestions.map(newHour => (
                                <motion.button
                                  key={newHour}
                                  whileHover={{ scale: 1.01 }}
                                  onClick={() => handleReschedule(newHour)}
                                  className="w-full text-left p-3.5 rounded-xl border-2 border-ps-success/20 bg-ps-success/5 hover:border-ps-success/40 hover:shadow-sm transition-all group"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium text-ps-success text-sm">{formatHour(newHour)}</span>
                                      <span className="text-ps-success text-xs mx-1">→</span>
                                      <span className="font-medium text-ps-success text-sm">{formatHour(newHour + selectedSession.span)}</span>
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 bg-ps-primary text-white rounded-lg transition-colors">
                                      Move
                                    </span>
                                  </div>
                                  <p className="text-xs text-ps-success font-semibold mt-1">{selectedSession.room} · no conflict at this time</p>
                                </motion.button>
                              ));
                            })()}
                          </div>
                        </div>

                        {!hasConflict && (
                          <div className="p-4 bg-ps-accent-soft border border-ps-accent/20 rounded-xl flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-ps-accent shrink-0" />
                            <p className="text-xs text-ps-accent font-semibold">No conflicts — session is optimally placed.</p>
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
        addStaffAvailability={addStaffAvailability}
        removeStaffAvailability={removeStaffAvailability}
        notify={notify}
      />
    </div>
  );
};

export default ScheduleCalendar;
