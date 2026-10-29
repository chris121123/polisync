import React, { useState } from 'react';
import {
  Users, UserCircle, DoorOpen, Calendar,
  ArrowRight, CheckCircle2, MapPin, CalendarDays,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { countAvailableStaff } from '../ScheduleCalendar/staff';
import { formatDateISO } from '../ScheduleCalendar/calendarMath';

export const StatCard = ({ title, value, icon: Icon, subtext, badge, badgeTone = '' }) => {
  return (
    <div className="sa-panel sa-kpi">
      <div className="sa-kpi-head">
        <Icon size={16} strokeWidth={1.5} className="sa-kpi-icon" />
        <p className="sa-micro">{title}</p>
      </div>
      <p className="sa-kpi-value tabular-nums">{value}</p>
      <div className="sa-kpi-foot">
        <p className="sa-kpi-sub">{subtext}</p>
        {badge && (
          <span className={badgeTone ? `sa-badge sa-badge--${badgeTone}` : 'sa-badge'}>{badge}</span>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { staff, students, rooms, sessions, conflicts, staffAvailability } = useGlobalState();
  const navigate = useNavigate();
  const [hoveredHour, setHoveredHour] = useState(null);

  const roomsInUseCount = new Set(sessions.map(s => s.room)).size;
  const activeStaff = staff.filter(s => s.is_active !== false).length;
  const availableToday = countAvailableStaff(staff, staffAvailability, formatDateISO(new Date()));
  const scheduledStudents = new Set(sessions.flatMap(s => s.studentIds || [])).size;
  const totalHours = sessions.reduce((acc, s) => acc + (s.span || 0), 0);

  const hours = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

  // Calculate peak hour
  const hourlyData = hours.map((hour, i) => {
    const displayHour = i + 8;
    const hourSessions = sessions.filter(s => displayHour >= s.startHour && displayHour < (s.startHour + s.span));
    return {
      hour,
      displayHour,
      count: hourSessions.length,
      sessions: hourSessions,
      label: `${hour}${hour === 12 ? 'pm' : (i < 4 ? 'am' : 'pm')}`
    };
  });

  const maxSessionCount = Math.max(...hourlyData.map(d => d.count), 1);
  const peakHourData = hourlyData.reduce((prev, curr) => curr.count > prev.count ? curr : prev, hourlyData[0]);

  // Today's sample active sessions
  const todaysSessions = [...sessions].slice(0, 4);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 animate-page-entry">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sa-rule-b">
        <div>
          <h1 className="sa-title">Dashboard</h1>
          <p className="sa-sub">
            Real-time clinical operations, staff allocation, and facility load overview.
          </p>
        </div>
        <button
          onClick={() => navigate('/schedule')}
          className="sa-btn sa-btn--primary self-start sm:self-auto"
        >
          <CalendarDays size={14} strokeWidth={1.5} />
          <span>Open Schedule</span>
        </button>
      </div>

      {/* ── Metric Cards Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={students.length}
          icon={Users}
          subtext={`${scheduledStudents} scheduled this week`}
          badge={`${students.length > 0 ? Math.round((scheduledStudents / students.length) * 100) : 0}% enrolled`}
          badgeTone="positive"
        />
        <StatCard
          title="Active Staff"
          value={staff.length}
          icon={UserCircle}
          subtext={`${availableToday} available today`}
          badge={`${activeStaff}/${staff.length} active`}
          badgeTone="positive"
        />
        <StatCard
          title="Room Occupancy"
          value={`${roomsInUseCount}/${rooms.length || 6}`}
          icon={DoorOpen}
          subtext={`${Math.round((roomsInUseCount / (rooms.length || 1)) * 100)}% utilization rate`}
          badge={roomsInUseCount > (rooms.length || 6) * 0.8 ? "High Load" : "Optimal"}
          badgeTone={roomsInUseCount > (rooms.length || 6) * 0.8 ? "warn" : "positive"}
        />
        <StatCard
          title="Weekly Sessions"
          value={sessions.length}
          icon={Calendar}
          subtext={`${totalHours} clinical hours booked`}
          badge="In Progress"
        />
      </div>

      {/* ── Main Operations Row: Conflicts & Load Chart ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Live Conflicts & Clinical Triage */}
        <div className="sa-panel flex flex-col">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Live Conflicts</h2>
              <p className="sa-panel-sub">Automatic Check</p>
            </div>
            {conflicts.length > 0 ? (
              <span className="sa-badge sa-badge--warn">
                {conflicts.length} Alert{conflicts.length === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="sa-badge sa-badge--positive">
                Clear
              </span>
            )}
          </div>

          {conflicts.length > 0 ? (
            <div className="sa-list">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className="sa-row">
                  <span className="sa-marker sa-marker--danger" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="sa-row-title">
                        {conflict.type === 'therapist' ? 'Therapist Double-Booked' : 'Room Capacity Overlap'}
                      </p>
                      <span className="sa-row-meta tabular-nums">
                        {conflict.startHour}:00
                      </span>
                    </div>
                    <p className="sa-row-meta">
                      {conflict.type === 'therapist'
                        ? `${staff.find(s => String(s.id) === String(conflict.therapistId))?.name || 'Staff'} has 2 concurrent sessions.`
                        : `${conflict.room} has overlapping therapy sessions.`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sa-empty mt-4">
              <CheckCircle2 size={16} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--sa-success)]" />
              <p className="sa-empty-title">All Systems Optimal</p>
              <p className="sa-empty-sub">
                No therapist clashes or room overlaps detected across current schedules.
              </p>
            </div>
          )}

          <div className="pt-4 mt-auto border-t border-[var(--sa-line-hairline)] flex items-center justify-between">
            <span className="text-xs sa-t-muted">Auto-scheduler active</span>
            <button
              onClick={() => navigate('/schedule')}
              className="sa-link"
            >
              Manage in Schedule <ArrowRight size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Clinical Load Chart (Sessions by Hour) */}
        <div className="lg:col-span-2 sa-panel flex flex-col justify-between">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Session Load by Hour</h2>
              <p className="sa-panel-sub">
                Hourly session distribution across all therapy rooms
              </p>
            </div>
            {peakHourData.count > 0 && (
              <span className="text-xs sa-t-muted shrink-0">
                Peak: <strong className="font-normal sa-t-warm tabular-nums">{peakHourData.label}</strong> ({peakHourData.count} sessions)
              </span>
            )}
          </div>

          {/* Interactive Histogram */}
          <div className="mt-4">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-4 px-2 pb-2 border-b border-[var(--sa-line-default)]">
              {hourlyData.map((d, i) => {
                const heightPercent = d.count > 0 ? (d.count / maxSessionCount) * 100 : 0;
                const isHovered = hoveredHour === d.hour;
                const isPeak = d === peakHourData && d.count > 0;

                return (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 min-w-0 h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredHour(d.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip / Counter */}
                    <div className={`text-xs tabular-nums mb-1 ${isHovered ? 'sa-t-warm' : 'sa-t-muted'}`}>
                      {d.count > 0 ? d.count : '—'}
                    </div>

                    {/* Bar */}
                    <div className="w-full h-32 flex items-end justify-center">
                      <div
                        className={`w-full max-w-[36px] ${isPeak ? 'bg-[var(--sa-bar-accent)]' : 'bg-[var(--sa-bar-primary)]'}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* X-axis Label */}
                    <span className={`text-xs mt-2 ${isHovered ? 'sa-t-warm' : 'sa-t-muted'}`}>
                      <span className="xs:hidden">{d.hour}</span>
                      <span className="hidden xs:inline">{d.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-xs sa-t-muted px-2 pt-2">
              <span>Clinic Opens (8:00 AM)</span>
              <span>Clinic Closes (5:00 PM)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Operational Row: Facilities & Schedule Peek ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">

        {/* Room Facility Status Summary */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <h2 className="sa-panel-title">Facility Status</h2>
            <button
              onClick={() => navigate('/rooms')}
              className="sa-link"
            >
              View Rooms <ChevronRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          <div className="sa-list">
            {rooms.slice(0, 6).map((room) => {
              const roomSessions = sessions.filter(s => s.room === room.name);
              const isOccupied = roomSessions.length > 0;
              const isOverCapacity = room.currentOccupancy && room.maxCapacity && room.currentOccupancy > room.maxCapacity;

              return (
                <div key={room.id} className="sa-row">
                  <span
                    className={`sa-marker${isOverCapacity ? ' sa-marker--danger' : isOccupied ? '' : ' sa-marker--creative'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="sa-row-title truncate">{room.name}</p>
                    <p className="sa-row-meta">{room.type || 'General SPED'}</p>
                  </div>
                  <span className={`text-xs shrink-0 ${isOverCapacity ? 'sa-t-danger' : 'sa-t-muted'}`}>
                    {isOverCapacity ? "Overload" : (isOccupied ? "In Use" : "Available")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Today's Schedule Overview */}
        <div className="lg:col-span-2 sa-panel">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Upcoming Program Sessions</h2>
              <p className="sa-panel-sub">Scheduled therapy and classroom groups today</p>
            </div>
          </div>

          <div className="sa-list">
            {todaysSessions.length > 0 ? todaysSessions.map((session) => {
              const provider = staff.find(s => String(s.id) === String(session.therapistId));
              return (
                <div
                  key={session.id}
                  onClick={() => navigate('/schedule')}
                  className="sa-row cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="sa-row-title truncate">
                      {session.title}
                    </p>
                    <p className="sa-row-meta flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 whitespace-nowrap"><MapPin size={11} strokeWidth={1.5} /> {session.room}</span>
                      <span className="whitespace-nowrap">• {provider ? provider.name : 'Unassigned'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sa-t-muted tabular-nums">
                      {session.startHour}:00 – {session.startHour + (session.span || 1)}:00
                    </span>
                    <span className="sa-badge">
                      {session.type || 'SPED'}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="sa-empty mt-4">
                <Calendar size={20} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                <p className="sa-empty-title">No sessions currently active</p>
                <p className="sa-empty-sub">Check schedule calendar to assign therapists.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
