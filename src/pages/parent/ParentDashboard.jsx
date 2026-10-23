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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ps-border/60">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ps-ink-1">
            Hello, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-ps-ink-2 font-medium">Tracking your child's developmental progress and schedule.</p>
        </div>
      </div>

      {/* Child Selector (Pills) */}
      {parentChildren.length > 1 && (
        <div className="flex gap-2 flex-wrap bg-ps-surface p-1.5 rounded-2xl border border-ps-border w-fit max-w-full overflow-x-auto hide-scrollbar">
          {parentChildren.map(child => {
            const isActive = activeChild && String(activeChild.id) === String(child.id);
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={clsx(
                  "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                  isActive 
                    ? "bg-ps-accent dark:bg-indigo-600 text-white shadow-sm" 
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
          <div className="bg-ps-surface border border-ps-border rounded-2xl p-5 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-ps-bg flex items-center justify-center text-2xl sm:text-3xl font-display font-bold ring-2 ring-ps-border shadow-sm shrink-0 text-ps-ink-1">
                {activeChild.name.charAt(0)}
              </div>
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-ps-ink-1">{activeChild.name}</h2>
                    <span className="px-3 py-1 rounded-full bg-ps-bg text-xs font-bold uppercase tracking-wide border border-ps-border text-ps-ink-1">
                      Enrolled
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-ps-ink-2 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-ps-ink-2" /> {activeChild.diagnosis || 'Standard Enrollment'}</span>
                    {activeChild.start_date && (
                      <span className="flex items-center gap-1.5 text-ps-ink-2"><Calendar size={14} /> Since {new Date(activeChild.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-ps-bg border border-ps-border flex items-center gap-2">
                    <BookOpen size={14} className="text-ps-ink-2" />
                    <span className="text-xs font-bold text-ps-ink-1">{childPrograms.length} Programs Enrolled</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-ps-bg border border-ps-border flex items-center gap-2">
                    <Clock size={14} className="text-ps-ink-2" />
                    <span className="text-xs font-bold text-ps-ink-1">{upcomingSessions.length} Sessions this week</span>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {dayNames.map((day) => (
                <div key={day} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-3 pb-1">
                    <span className="text-xs font-bold text-ps-ink-2 uppercase tracking-wide">{day.slice(0, 3)}</span>
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
                        className="p-3 rounded-xl bg-ps-accent-soft border border-ps-accent/10 space-y-2 group hover:bg-white dark:hover:bg-ps-surface transition-colors hover:shadow-sm cursor-default"
                      >
                        <p className="text-xs font-bold text-ps-accent leading-tight truncate">{session.title}</p>
                        <div className="flex flex-col gap-1 text-xs text-ps-ink-2 font-medium">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Upcoming Timeline */}
            <div className="bg-ps-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md border border-ps-border space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-ps-accent-soft text-ps-accent rounded-xl">
                  <Calendar size={20} />
                </div>
                <h3 className="text-lg font-display font-bold text-ps-ink-1">Upcoming Sessions</h3>
              </div>
              
              <div className="space-y-0 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-ps-border">
                {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 4).map((s, i) => (
                  <div key={i} className="relative pl-12 pb-8 last:pb-0 group">
                    <div className="absolute left-3.5 top-1.5 w-3 h-3 rounded-full bg-ps-surface border-2 border-ps-accent z-10 group-hover:scale-125 transition-transform" />
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
              <div className="bg-ps-surface rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md border border-ps-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-ps-success/10 text-ps-success rounded-xl">
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
                      <span className="text-xs font-bold text-ps-ink-2 uppercase tracking-tight bg-ps-surface px-2 py-1 rounded-lg border border-ps-border">
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
        <div className="bg-ps-surface rounded-[40px] p-16 shadow-md border border-ps-border flex flex-col items-center justify-center text-center space-y-6">
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
          <button className="px-6 py-3 bg-ps-accent dark:bg-indigo-600 text-white font-bold rounded-2xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
