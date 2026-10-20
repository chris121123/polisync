import React from 'react';
import { Users, UserCircle, DoorOpen, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';

export const StatCard = ({ title, value, icon: Icon, subtext }) => {
  return (
    <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
      <div className="flex items-center gap-2">
        <Icon size={16} strokeWidth={1.75} className="text-ps-ink-2" />
        <p className="text-xs font-medium text-ps-ink-2">{title}</p>
      </div>
      <p className="mt-2 text-2xl font-display font-semibold text-ps-ink-1">{value}</p>
      <p className="mt-1 text-xs text-ps-ink-2">{subtext}</p>
    </div>
  );
};

const AdminDashboard = () => {
  const { staff, students, rooms, sessions, conflicts } = useGlobalState();
  const navigate = useNavigate();

  const roomsInUseCount = new Set(sessions.map(s => s.room)).size;
  const activeStaff = staff.filter(s => s.is_active !== false).length;
  const scheduledStudents = new Set(sessions.flatMap(s => s.studentIds || [])).size;
  const totalHours = sessions.reduce((acc, s) => acc + (s.span || 0), 0);

  const hours = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

  return (
    <div className="space-y-6 animate-page-entry">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-semibold text-ps-ink-1">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={students.length}
          icon={Users}
          subtext={`${scheduledStudents} scheduled this week`}
        />
        <StatCard
          title="Active Staff"
          value={staff.length}
          icon={UserCircle}
          subtext={`${activeStaff} active`}
        />
        <StatCard
          title="Room Occupancy"
          value={`${roomsInUseCount}/${rooms.length}`}
          icon={DoorOpen}
          subtext={`${Math.round((roomsInUseCount / (rooms.length || 1)) * 100)}% occupied`}
        />
        <StatCard
          title="Week's Sessions"
          value={sessions.length}
          icon={Calendar}
          subtext={`${totalHours}h this week`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conflict Panel */}
        <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-display font-semibold text-ps-ink-1">Live Conflicts</h2>
            <span className="text-xs font-medium text-ps-ink-2">{conflicts.length}</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {conflicts.length > 0 ? conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-ps-border bg-ps-bg/50"
              >
                <div className="flex gap-3">
                  <AlertCircle size={16} className="text-ps-danger shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ps-ink-1">
                      {conflict.type === 'therapist' ? 'Therapist Clash' : 'Room Overlap'}
                    </p>
                    <p className="text-xs text-ps-ink-2 mt-1 leading-relaxed">
                      {conflict.type === 'therapist'
                        ? `${staff.find(s => String(s.id) === String(conflict.therapistId))?.name} is double-booked at ${conflict.startHour}:00.`
                        : `${conflict.room} has overlapping sessions at ${conflict.startHour}:00.`}
                    </p>
                    <button
                      onClick={() => navigate('/schedule')}
                      className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ps-ink-1 underline decoration-ps-accent decoration-2 underline-offset-4 hover:text-ps-accent"
                    >
                      Resolve in Schedule <ArrowRight size={14} className="text-ps-accent" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-ps-ink-2">No conflicts. Every session has a unique therapist and room.</p>
            )}
          </div>
        </div>

        {/* Activity Load Chart */}
        <div className="lg:col-span-2 bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
          <h2 className="text-base font-display font-semibold text-ps-ink-1 mb-6">Sessions by hour</h2>

          <div className="h-40 flex items-end justify-between gap-3 sm:gap-6 px-2 border-b border-ps-border">
            {hours.map((hour, i) => {
              const displayHour = i + 8;
              const count = sessions.filter(s => displayHour >= s.startHour && displayHour < (s.startHour + s.span)).length;
              const maxCount = Math.max(...hours.map((_, idx) => {
                const dh = idx + 8;
                return sessions.filter(s => dh >= s.startHour && dh < (s.startHour + s.span)).length;
              }), 1);
              const height = count > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                  <span className="text-xs font-medium text-ps-ink-2">{count}</span>
                  <div className="w-full h-28 flex items-end justify-center">
                    <div
                      className="w-full max-w-[48px] rounded-t bg-ps-accent"
                      style={{ height: height > 0 ? `${height}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-ps-ink-2">
                    {hour}{hour === 12 ? 'pm' : (i < 4 ? 'am' : 'pm')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
