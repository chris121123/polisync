import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, Bell, ChevronRight, User } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ParentDashboard = () => {
  const { user, sessions, programs, parentChildren, fetchParentChildren, notifications } = useGlobalState();
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    fetchParentChildren();
  }, [fetchParentChildren]);

  const activeChild = selectedChild || parentChildren[0] || null;

  const weekSchedule = useMemo(() => {
    if (!activeChild) return {};
    const grouped = {};
    dayNames.forEach(day => { grouped[day] = []; });
    sessions
      .filter(s => s.studentIds?.includes(activeChild.id))
      .forEach(s => {
        const day = dayNames[s.dayOfWeek ?? 0];
        if (grouped[day]) grouped[day].push(s);
      });
    return grouped;
  }, [activeChild, sessions]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const formatTime = (hour) => {
    const h = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:00 ${ampm}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Your child's schedule at a glance</p>
        </div>
        <div className="relative">
          <Bell size={22} className="text-slate-500 dark:text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {parentChildren.length > 1 && (
        <div className="flex gap-3 flex-wrap">
          {parentChildren.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                (selectedChild === child.id || (!selectedChild && child === parentChildren[0]) || (!selectedChild && child === parentChildren[0]))
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}
            >
              <User size={16} />
              {child.name}
            </button>
          ))}
        </div>
      )}

      {activeChild && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                {activeChild.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeChild.name}</h2>
                <p className="text-sm text-slate-500">
                  {activeChild.diagnosis || 'Enrolled student'}
                  {activeChild.start_date && ` · Started ${new Date(activeChild.start_date).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">This Week's Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {dayNames.map(day => (
                <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[200px]">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className={`w-2 h-2 rounded-full ${weekSchedule[day]?.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{day}</h3>
                  </div>
                  <div className="space-y-2">
                    {weekSchedule[day]?.length > 0 ? weekSchedule[day].map((session, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-tight">{session.title}</p>
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500">
                          <Clock size={10} />
                          {formatTime(session.startHour)} ({session.span}h)
                        </div>
                        {session.room && (
                          <p className="text-xs text-slate-400 mt-0.5">{session.room}</p>
                        )}
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 text-center py-4">No sessions</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                Programs Enrolled
              </h3>
              <div className="space-y-3">
                {programs.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#6366f1' }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="ml-auto text-xs text-slate-400">{p.default_duration_hours}h / session</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Upcoming Sessions
              </h3>
              <div className="space-y-3">
                {sessions
                  .filter(s => s.studentIds?.includes(selectedChild.id))
                  .slice(0, 3)
                  .map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.title}</p>
                        <p className="text-xs text-slate-500">{dayNames[s.dayOfWeek ?? 0]} · {formatTime(s.startHour)}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  ))}
                {sessions.filter(s => s.studentIds?.includes(selectedChild.id)).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No upcoming sessions scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ParentDashboard;