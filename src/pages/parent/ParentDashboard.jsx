import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, BookOpen, ChevronRight, User, ShieldCheck, MapPin, Sparkles, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import RequirementsUpload from './RequirementsUpload';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, sessionDayName, formatTime } from '../../lib/sessionDay';

const ParentDashboard = () => {
  const { user, sessions, programs, studentPrograms, parentChildren, fetchParentChildren } = useGlobalState();
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    fetchParentChildren();
  }, [fetchParentChildren]);

  const activeChild = parentChildren.find(c => String(c.id) === String(selectedChild)) || parentChildren[0] || null;

  const childPrograms = useMemo(() => {
    if (!activeChild) return [];
    const ids = new Set(
      studentPrograms
        .filter(sp => String(sp.student_id) === String(activeChild.id))
        .map(sp => String(sp.program_id))
    );
    return programs.filter(p => ids.has(String(p.id)));
  }, [activeChild, studentPrograms, programs]);

  const weekSchedule = useMemo(() => {
    if (!activeChild) return {};
    const grouped = {};
    dayNames.forEach(day => { grouped[day] = []; });
    sessions
      .filter(s => s.studentIds?.includes(activeChild.id))
      .forEach(s => {
        const day = sessionDayName(s);
        if (grouped[day]) grouped[day].push(s);
      });
    return grouped;
  }, [activeChild, sessions]);

  const upcomingSessions = useMemo(() => {
    if (!activeChild) return [];
    return sessions
      .filter(s => s.studentIds?.includes(activeChild.id))
      .sort((a, b) => sessionDayIndex(a) - sessionDayIndex(b) || a.startHour - b.startHour);
  }, [activeChild, sessions]);

  return (
    <div className="space-y-8 animate-page-entry">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-ps-ink-1">
            Hello, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-ps-ink-2 font-medium">Tracking your child's developmental progress and schedule.</p>
        </div>
      </div>

      {/* Child Selector (Pills) */}
      {parentChildren.length > 1 && (
        <div className="flex gap-2 flex-wrap bg-ps-surface p-1.5 rounded-2xl border border-ps-border w-fit">
          {parentChildren.map(child => {
            const isActive = activeChild && String(activeChild.id) === String(child.id);
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  isActive 
                    ? "bg-ps-accent text-white shadow-lg shadow-ps-accent/20" 
                    : "text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1"
                )}
              >
                <div className={clsx("w-2 h-2 rounded-full", isActive ? "bg-white" : "bg-ps-accent")} />
                {child.name}
              </button>
            );
          })}
        </div>
      )}

      {activeChild ? (
        <>
          {/* Child Profile Hero Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-display font-bold ring-4 ring-white/30 shadow-2xl shrink-0">
                {activeChild.name.charAt(0)}
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-display font-bold">{activeChild.name}</h2>
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider border border-white/20">
                      Enrolled
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-indigo-100 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-indigo-200" /> {activeChild.diagnosis || 'Standard Enrollment'}</span>
                    {activeChild.start_date && (
                      <span className="flex items-center gap-1.5 opacity-80"><Calendar size={14} /> Since {new Date(activeChild.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                    <BookOpen size={14} className="text-indigo-200" />
                    <span className="text-xs font-bold">{childPrograms.length} Programs Enrolled</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                    <Clock size={14} className="text-indigo-200" />
                    <span className="text-xs font-bold">{upcomingSessions.length} Sessions this week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-ps-ink-1">Weekly Schedule</h2>
              <div className="flex items-center gap-2 text-xs font-bold text-ps-ink-2">
                <div className="w-2 h-2 rounded-full bg-ps-accent" /> Active session day
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {dayNames.map((day) => (
                <div key={day} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-3 pb-1">
                    <span className="text-xs font-bold text-ps-ink-2 uppercase tracking-widest">{day.slice(0, 3)}</span>
                    {weekSchedule[day]?.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-ps-accent" />}
                  </div>
                  <div className={clsx(
                    "rounded-2xl p-3 space-y-3 min-h-[220px] transition-colors",
                    weekSchedule[day]?.length > 0 ? "bg-ps-surface border border-ps-border shadow-sm" : "bg-ps-bg/20 border-2 border-dashed border-ps-border"
                  )}>
                    {weekSchedule[day]?.length > 0 ? weekSchedule[day].map((session, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl bg-ps-accent-soft border border-ps-accent/10 space-y-2 group hover:bg-white dark:hover:bg-ps-surface transition-colors hover:shadow-md cursor-default"
                      >
                        <p className="text-[11px] font-bold text-ps-accent leading-tight truncate">{session.title}</p>
                        <div className="flex flex-col gap-1 text-[10px] text-ps-ink-2 font-medium">
                          <span className="flex items-center gap-1"><Clock size={10} /> {formatTime(session.startHour)}</span>
                          {session.room && <span className="flex items-center gap-1"><MapPin size={10} /> {session.room}</span>}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                        <Sparkles size={20} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Timeline */}
            <div className="bg-ps-surface rounded-3xl p-8 shadow-sm border border-ps-border space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                  <Calendar size={20} />
                </div>
                <h3 className="text-lg font-display font-bold text-ps-ink-1">Upcoming Sessions</h3>
              </div>
              
              <div className="space-y-0 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-ps-border">
                {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 4).map((s, i) => (
                  <div key={i} className="relative pl-12 pb-8 last:pb-0 group">
                    <div className="absolute left-3.5 top-1.5 w-3 h-3 rounded-full bg-ps-surface border-2 border-indigo-500 z-10 group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between bg-ps-bg/30 group-hover:bg-ps-bg p-4 rounded-2xl border border-transparent group-hover:border-ps-border transition-all">
                      <div>
                        <p className="text-sm font-bold text-ps-ink-1 leading-none mb-1">{s.title}</p>
                        <p className="text-xs text-ps-ink-2 font-medium">
                          {sessionDayName(s)} • {formatTime(s.startHour)}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-ps-surface flex items-center justify-center text-ps-ink-2 group-hover:text-ps-accent transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-ps-ink-2 py-4 italic">No upcoming sessions found.</p>
                )}
              </div>
            </div>

            {/* Programs & Requirements */}
            <div className="space-y-6">
              <div className="bg-ps-surface rounded-3xl p-8 shadow-sm border border-ps-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="text-lg font-display font-bold text-ps-ink-1">Specialized Care</h3>
                </div>
                
                <div className="space-y-3">
                  {childPrograms.length > 0 ? childPrograms.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl border-l-4 border-l-ps-accent bg-ps-bg/30 flex items-center justify-between group hover:bg-ps-bg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#6366f1' }} />
                        <span className="text-sm font-bold text-ps-ink-1">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-ps-ink-2 uppercase tracking-tighter bg-ps-surface px-2 py-1 rounded-lg border border-ps-border">
                        {p.default_duration_hours}h / week
                      </span>
                    </div>
                  )) : (
                    <p className="text-sm text-ps-ink-2 py-4 italic">No specialized programs enrolled yet.</p>
                  )}
                </div>
              </div>

              <RequirementsUpload studentId={activeChild.id} />
            </div>
          </div>
        </>
      ) : (
        /* No children state */
        <div className="bg-ps-surface rounded-[40px] p-16 shadow-sm border border-ps-border flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-ps-bg text-ps-ink-2/20 rounded-full flex items-center justify-center relative">
            <User size={48} />
            <PlusCircle size={24} className="absolute bottom-1 right-1 text-ps-accent bg-ps-surface rounded-full" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-display font-bold text-ps-ink-1">Waiting to connect</h2>
            <p className="text-ps-ink-2 font-medium">
              Your account isn't linked to any students yet. This usually happens while our administration processes your registration.
            </p>
          </div>
          <button className="px-6 py-3 bg-ps-accent text-white font-bold rounded-2xl shadow-lg shadow-ps-accent/20 hover:scale-[1.02] active:scale-95 transition-all">
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
