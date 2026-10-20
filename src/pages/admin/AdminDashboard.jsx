import React, { useState } from 'react';
import { 
  Users, UserCircle, DoorOpen, Calendar, AlertCircle, 
  ArrowRight, CheckCircle2, Clock, MapPin, CalendarDays,
  ShieldCheck, Activity, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';

export const StatCard = ({ title, value, icon: Icon, subtext, badge, badgeColor }) => {
  return (
    <div className="bg-ps-surface rounded-2xl p-5 shadow-sm border border-ps-border flex flex-col justify-between transition-all hover:border-ps-border/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-ps-bg text-ps-ink-2 border border-ps-border">
            <Icon size={16} strokeWidth={2} />
          </div>
          <p className="text-xs font-medium text-ps-ink-2">{title}</p>
        </div>
        {badge && (
          <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", badgeColor || "bg-ps-bg text-ps-ink-2")}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-display font-semibold text-ps-ink-1 tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-ps-ink-2 font-medium">{subtext}</p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { staff, students, rooms, sessions, conflicts } = useGlobalState();
  const navigate = useNavigate();
  const [hoveredHour, setHoveredHour] = useState(null);

  const roomsInUseCount = new Set(sessions.map(s => s.room)).size;
  const activeStaff = staff.filter(s => s.is_active !== false).length;
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
    <div className="space-y-6 animate-page-entry pb-10">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ps-border/60">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ps-ink-1">Dashboard</h1>
          <p className="text-xs text-ps-ink-2 font-medium mt-0.5">
            Real-time clinical operations, staff allocation, and facility load overview.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/schedule')}
            className="flex items-center gap-2 bg-ps-accent hover:opacity-90 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <CalendarDays size={16} strokeWidth={2} />
            <span>Open Schedule</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Students"
          value={students.length}
          icon={Users}
          subtext={`${scheduledStudents} scheduled this week`}
          badge={`${students.length > 0 ? Math.round((scheduledStudents / students.length) * 100) : 0}% enrolled`}
          badgeColor="bg-ps-accent-soft text-ps-accent"
        />
        <StatCard
          title="Active Staff"
          value={staff.length}
          icon={UserCircle}
          subtext={`${activeStaff} currently available`}
          badge={`${activeStaff}/${staff.length} active`}
          badgeColor="bg-ps-success/10 text-ps-success"
        />
        <StatCard
          title="Room Occupancy"
          value={`${roomsInUseCount}/${rooms.length || 6}`}
          icon={DoorOpen}
          subtext={`${Math.round((roomsInUseCount / (rooms.length || 1)) * 100)}% utilization rate`}
          badge={roomsInUseCount > (rooms.length || 6) * 0.8 ? "High Load" : "Optimal"}
          badgeColor={roomsInUseCount > (rooms.length || 6) * 0.8 ? "bg-ps-warn/10 text-ps-warn" : "bg-ps-success/10 text-ps-success"}
        />
        <StatCard
          title="Weekly Sessions"
          value={sessions.length}
          icon={Calendar}
          subtext={`${totalHours} clinical hours booked`}
          badge="In Progress"
          badgeColor="bg-ps-bg text-ps-ink-2"
        />
      </div>

      {/* ── Main Operations Row: Conflicts & Load Chart ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Conflicts & Clinical Triage */}
        <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-semibold text-ps-ink-1">Live Conflicts</h2>
                {conflicts.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-ps-danger/10 text-ps-danger border border-ps-danger/20">
                    {conflicts.length} Alert{conflicts.length === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ps-success/10 text-ps-success border border-ps-success/20">
                    Clear
                  </span>
                )}
              </div>
              <span className="text-xs text-ps-ink-2 font-medium">Automatic Check</span>
            </div>

            <div className="space-y-3">
              {conflicts.length > 0 ? conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-ps-danger/20 bg-ps-danger/5"
                >
                  <div className="flex gap-3">
                    <AlertCircle size={16} className="text-ps-danger shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-ps-danger uppercase tracking-wide">
                          {conflict.type === 'therapist' ? 'Therapist Double-Booked' : 'Room Capacity Overlap'}
                        </p>
                        <span className="text-xs font-mono font-medium text-ps-ink-2">
                          {conflict.startHour}:00
                        </span>
                      </div>
                      <p className="text-xs text-ps-ink-1 mt-1 leading-relaxed">
                        {conflict.type === 'therapist'
                          ? `${staff.find(s => String(s.id) === String(conflict.therapistId))?.name || 'Staff'} has 2 concurrent sessions.`
                          : `${conflict.room} has overlapping therapy sessions.`}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-6 rounded-xl border border-dashed border-ps-border text-center flex flex-col items-center justify-center bg-ps-bg/40">
                  <div className="w-10 h-10 rounded-full bg-ps-success/10 text-ps-success flex items-center justify-center mb-2">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-sm font-semibold text-ps-ink-1">All Systems Optimal</p>
                  <p className="text-xs text-ps-ink-2 mt-1 max-w-[200px]">
                    No therapist clashes or room overlaps detected across current schedules.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-ps-border/70 flex items-center justify-between">
            <span className="text-xs text-ps-ink-2 font-medium">Auto-scheduler active</span>
            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-1.5 text-xs font-semibold text-ps-accent hover:underline decoration-2 underline-offset-4"
            >
              Manage in Schedule <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Clinical Load Chart (Sessions by Hour) */}
        <div className="lg:col-span-2 bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-semibold text-ps-ink-1">Session Load by Hour</h2>
                <Activity size={16} className="text-ps-ink-2" />
              </div>
              <p className="text-xs text-ps-ink-2 font-medium mt-0.5">
                Hourly session distribution across all therapy rooms
              </p>
            </div>
            {peakHourData.count > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-ps-bg border border-ps-border text-ps-ink-1">
                Peak: <strong className="text-ps-accent">{peakHourData.label}</strong> ({peakHourData.count} sessions)
              </span>
            )}
          </div>

          {/* Interactive Histogram */}
          <div className="mt-4">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 border-b border-ps-border">
              {hourlyData.map((d, i) => {
                const heightPercent = d.count > 0 ? (d.count / maxSessionCount) * 100 : 0;
                const isHovered = hoveredHour === d.hour;

                return (
                  <div 
                    key={i} 
                    className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer"
                    onMouseEnter={() => setHoveredHour(d.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip / Counter */}
                    <div className={clsx(
                      "text-xs font-medium transition-all mb-1",
                      isHovered ? "text-ps-accent font-semibold scale-110" : "text-ps-ink-2"
                    )}>
                      {d.count > 0 ? d.count : '—'}
                    </div>

                    {/* Bar Track & Fill */}
                    <div className="w-full h-32 flex items-end justify-center bg-ps-bg/80 rounded-t-md p-0.5">
                      <div
                        className={clsx(
                          "w-full max-w-[36px] rounded-t transition-all duration-300",
                          isHovered 
                            ? "bg-ps-accent shadow-sm scale-y-105 origin-bottom" 
                            : (d.count > 0 ? "bg-ps-accent/80 hover:bg-ps-accent" : "bg-transparent")
                        )}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* X-axis Label */}
                    <span className={clsx(
                      "text-xs mt-2 transition-colors",
                      isHovered ? "text-ps-accent font-semibold" : "text-ps-ink-2"
                    )}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-xs text-ps-ink-2 font-medium px-2 pt-2">
              <span>Clinic Opens (8:00 AM)</span>
              <span>Clinic Closes (5:00 PM)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Operational Row: Facilities & Schedule Peek ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Room Facility Status Summary */}
        <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-semibold text-ps-ink-1">Facility Status</h3>
            <button
              onClick={() => navigate('/rooms')}
              className="text-xs font-medium text-ps-accent hover:underline flex items-center gap-1"
            >
              View Rooms <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {rooms.slice(0, 5).map((room) => {
              const roomSessions = sessions.filter(s => s.room === room.name);
              const isOccupied = roomSessions.length > 0;
              const isOverCapacity = room.currentOccupancy && room.maxCapacity && room.currentOccupancy > room.maxCapacity;

              return (
                <div key={room.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ps-bg border border-ps-border/70">
                  <div className="flex items-center gap-2.5">
                    <span className={clsx(
                      "w-2 h-2 rounded-full shrink-0",
                      isOverCapacity ? "bg-ps-danger" : (isOccupied ? "bg-ps-accent" : "bg-ps-success")
                    )} />
                    <div>
                      <p className="text-xs font-semibold text-ps-ink-1 leading-tight">{room.name}</p>
                      <p className="text-xs text-ps-ink-2 font-medium">{room.type || 'General SPED'}</p>
                    </div>
                  </div>
                  <span className={clsx(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    isOverCapacity ? "bg-ps-danger/10 text-ps-danger" : (isOccupied ? "bg-ps-accent-soft text-ps-accent" : "bg-ps-success/10 text-ps-success")
                  )}>
                    {isOverCapacity ? "Overload" : (isOccupied ? "In Use" : "Available")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Today's Schedule Overview */}
        <div className="lg:col-span-2 bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-display font-semibold text-ps-ink-1">Upcoming Program Sessions</h3>
              <p className="text-xs text-ps-ink-2 font-medium">Scheduled therapy and classroom groups today</p>
            </div>
            <button
              onClick={() => navigate('/schedule')}
              className="text-xs font-medium text-ps-accent hover:underline flex items-center gap-1"
            >
              Full Calendar <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5">
            {todaysSessions.length > 0 ? todaysSessions.map((session) => {
              const provider = staff.find(s => String(s.id) === String(session.therapistId));
              return (
                <div 
                  key={session.id}
                  onClick={() => navigate('/schedule')}
                  className="flex items-center justify-between p-3 rounded-xl bg-ps-bg border border-ps-border/70 hover:border-ps-accent/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-ps-accent-soft text-ps-accent flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ps-ink-1 truncate group-hover:text-ps-accent transition-colors">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-ps-ink-2 font-medium mt-0.5">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {session.room}</span>
                        <span>•</span>
                        <span>{provider ? provider.name : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ps-surface border border-ps-border text-ps-ink-2">
                      {session.startHour}:00 – {session.startHour + (session.span || 1)}:00
                    </span>
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-md bg-ps-accent-soft text-ps-accent">
                      {session.type || 'SPED'}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center bg-ps-bg/50 rounded-xl border border-dashed border-ps-border">
                <Calendar size={28} className="mx-auto mb-2 text-ps-ink-2 opacity-40" />
                <p className="text-xs font-semibold text-ps-ink-1">No sessions currently active</p>
                <p className="text-xs text-ps-ink-2 mt-0.5">Check schedule calendar to assign therapists.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;

