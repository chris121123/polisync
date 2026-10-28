import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, ShieldCheck, Sparkles, PlusCircle } from 'lucide-react';
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
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">Hello, {user?.name?.split(' ')[0]}</h1>
        <p className="sa-sub">Tracking your child's developmental progress and schedule.</p>
      </div>

      {/* Child selector: square hairline segmented control */}
      {parentChildren.length > 1 && (
        <div className="flex w-fit max-w-full py-1 divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] overflow-x-auto hide-scrollbar">
          {parentChildren.map(child => {
            const isActive = activeChild && String(activeChild.id) === String(child.id);
            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={clsx(
                  "px-3 sm:px-3.5 py-2 text-xs shrink-0",
                  isActive
                    ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                    : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                )}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      )}

      {activeChild ? (
        <>
          {/* Child identity */}
          <div className="sa-panel">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 border border-[var(--sa-line-default)] bg-[var(--sa-surface-warm)] flex items-center justify-center text-2xl text-[var(--sa-text-primary)] shrink-0">
                {activeChild.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-base text-[var(--sa-text-primary)]">{activeChild.name}</h2>
                  <span className="sa-badge">
                    Enrolled
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] sa-t-muted">
                  <span className="flex items-center gap-1.5"><ShieldCheck size={12} strokeWidth={1.5} /> {activeChild.diagnosis || 'Standard Enrollment'}</span>
                  {activeChild.start_date && (
                    <span className="flex items-center gap-1.5"><Calendar size={12} strokeWidth={1.5} /> Since {new Date(activeChild.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center divide-x divide-[var(--sa-line-default)] shrink-0">
                <span className="sa-badge pr-3">{childPrograms.length} Programs Enrolled</span>
                <span className="sa-badge pl-3">{upcomingSessions.length} Sessions this week</span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="sa-panel-title">Weekly Schedule</h2>
              <div className="flex items-start gap-2 text-[11px] sa-t-muted">
                <span className="sa-marker" />
                <span>Active session day</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {dayNames.map((day) => {
                const daySessions = weekSchedule[day] || [];
                return (
                  <div key={day} className="flex flex-col gap-3">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] sa-t-muted">{day.slice(0, 3)}</span>
                      {daySessions.length > 0 && <span className="sa-marker" />}
                    </div>
                    <div className={clsx(
                      "p-3 flex-1 flex flex-col gap-3 border border-[var(--sa-line-default)]",
                      daySessions.length > 0
                        ? "bg-[var(--sa-bg-base)]"
                        : "border-dashed items-center justify-center"
                    )}>
                      {daySessions.length > 0 ? daySessions.map((session, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-l-2 border-l-[var(--sa-gold)] pl-2.5 py-0.5"
                        >
                          <p className="text-[12px] text-[var(--sa-text-primary)] leading-tight truncate">{session.title}</p>
                          <div className="text-[11px] sa-t-muted mt-1">
                            <span className="block">{formatTime(session.startHour)}</span>
                            {session.room && <span className="block">{session.room}</span>}
                          </div>
                        </motion.div>
                      )) : (
                        <Sparkles size={16} strokeWidth={1.5} className="sa-t-muted" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              {/* Upcoming Sessions */}
              <div className="sa-panel">
                <div className="sa-panel-head">
                  <h2 className="sa-panel-title">Upcoming Sessions</h2>
                </div>

                {upcomingSessions.length > 0 ? (
                  <div className="sa-list">
                    {upcomingSessions.slice(0, 4).map((s, i) => (
                      <div key={i} className="sa-row">
                        <span className="sa-marker" />
                        <div className="flex-1 min-w-0">
                          <p className="sa-row-title truncate">{s.title}</p>
                          <p className="sa-row-meta">
                            {sessionDayName(s)} • {formatTime(s.startHour)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pt-4 text-[13px] sa-t-muted">No upcoming sessions found.</p>
                )}
              </div>

              {/* Specialized Care */}
              <div className="sa-panel">
                <div className="sa-panel-head">
                  <h2 className="sa-panel-title">Specialized Care</h2>
                </div>

                {childPrograms.length > 0 ? (
                  <div className="sa-list">
                    {childPrograms.map(p => (
                      <div key={p.id} className="sa-row">
                        <span className="sa-marker" />
                        <p className="sa-row-title flex-1 min-w-0 truncate">{p.name}</p>
                        <span className="text-[11px] sa-t-muted shrink-0">
                          {p.default_duration_hours}h / week
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="pt-4 text-[13px] sa-t-muted">No specialized programs enrolled yet.</p>
                )}
              </div>
            </div>

            <RequirementsUpload studentId={activeChild.id} />
          </div>
        </>
      ) : (
        /* No children state */
        <div className="sa-empty">
          <div className="relative w-16 h-16 mx-auto border border-[var(--sa-line-default)] flex items-center justify-center text-[var(--sa-text-muted)]">
            <User size={24} strokeWidth={1.5} />
            <PlusCircle size={16} strokeWidth={1.5} className="absolute bottom-1 right-1 sa-t-warm" />
          </div>
          <div className="max-w-md mx-auto mt-5 space-y-2">
            <h2 className="text-base text-[var(--sa-text-primary)]">Waiting to connect</h2>
            <p className="text-[13px] sa-t-muted">
              Your account isn't linked to any students yet. This usually happens while our administration processes your registration.
            </p>
          </div>
          <button
            onClick={() => { window.location.href = 'mailto:support@polisync.com?subject=PoliSync%20Support%20Request'; }}
            className="sa-btn sa-btn--primary mt-5"
          >
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
