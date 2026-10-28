import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, CheckCircle2, Check, XCircle, AlertCircle, FileText, Calendar, ChevronLeft, ChevronRight, UserCheck, BookOpen, X } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, formatTime } from '../../lib/sessionDay';
import { StatCard } from '../admin/AdminDashboard';
import MyAvailabilityCard from '../../components/MyAvailabilityCard';

const TeacherDashboard = () => {
  const { user, sessions, students, fetchMyAssignments, myAssignments, markAttendance, fetchAttendance } = useGlobalState();
  
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(null);
  const [attendanceMarks, setAttendanceMarks] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState('');

  useEffect(() => {
    fetchMyAssignments();
  }, [fetchMyAssignments]);

  useEffect(() => {
    if (!showAttendanceModal) return;
    fetchAttendance(showAttendanceModal).then(rows => {
      const mapped = {};
      (rows || []).forEach(r => { mapped[r.student_id] = r.status; });
      setAttendanceMarks(mapped);
    });
  }, [showAttendanceModal, fetchAttendance]);

  const openAttendanceModal = (sessionId) => {
    setAttendanceMarks({});
    setAttendanceNotes('');
    setShowAttendanceModal(sessionId);
  };

  const mySessions = sessions.filter(s => String(s.therapistId) === String(user?.id));
  const selectedTab = selectedDay - 1;
  const todaySessions = mySessions.filter(s => sessionDayIndex(s) === selectedTab);
  const uniqueStudents = [...new Set(mySessions.flatMap(s => s.studentIds || []))].length;

  const handleMarkAttendance = async (sessionId, studentId, status) => {
    await markAttendance(sessionId, studentId, status, attendanceNotes);
    setAttendanceMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const getStudent = (id) => students.find(s => s.id === id || s.id === Number(id));

  const changeDay = (dir) => {
    setSelectedDay(prev => {
      let next = prev + dir;
      if (next < 1) next = 5;
      if (next > 5) next = 1;
      return next;
    });
  };

  const isToday = (idx) => {
    const d = new Date().getDay();
    return (d === 0 || d === 6) ? idx === 0 : (d - 1) === idx;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sa-rule-b">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDay(-1)} className="sa-btn">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <div className="text-center min-w-[130px] sm:min-w-[140px]">
            <h1 className="sa-title">{dayNames[selectedDay - 1]}</h1>
            <p className="sa-sub">Daily Schedule</p>
          </div>
          <button onClick={() => changeDay(1)} className="sa-btn">
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex w-fit max-w-full py-1 divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] overflow-x-auto hide-scrollbar">
          {dayNames.map((day, idx) => {
            const active = selectedDay === idx + 1;
            const current = isToday(idx);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(idx + 1)}
                className={clsx(
                  "px-3 sm:px-3.5 py-2 text-xs shrink-0",
                  active
                    ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                    : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]",
                  current && !active && "underline underline-offset-4"
                )}
              >
                {day.slice(0, 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Scheduled Blocks" 
          value={todaySessions.length} 
          icon={Clock} 
          subtext={`Today: ${dayNames[selectedDay-1]}`}
        />
        <StatCard
          title="Assigned Students"
          value={uniqueStudents}
          icon={Users}
          subtext="Total unique caseload"
        />
        <StatCard
          title="Week's Sessions"
          value={mySessions.length}
          icon={Calendar}
          subtext="Mon – Fri total"
        />
        <StatCard
          title="Assigned Programs"
          value={myAssignments.length}
          icon={FileText}
          subtext="Active curricula"
        />
      </div>

      <MyAvailabilityCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule List */}
        <div className="lg:col-span-2 sa-panel">
          <div className="sa-panel-head">
            <h2 className="sa-panel-title">Classroom Sessions</h2>
          </div>

          <div className="sa-list">
            {todaySessions.length > 0 ? todaySessions.map((session, i) => (
              <motion.div 
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="sa-row flex-col sm:flex-row"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-16 flex flex-col shrink-0">
                    <p className="text-[13px] tabular-nums text-[var(--sa-text-primary)]">{formatTime(session.startHour)}</p>
                    <p className="text-[11px] tabular-nums sa-t-muted">{session.span}h</p>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="sa-row-title leading-tight">{session.title}</h3>
                      {session.type && (
                        <span className="sa-badge">
                          {session.type}
                        </span>
                      )}
                    </div>

                    <p className="sa-row-meta flex flex-wrap items-center gap-2">
                      {session.room && <span className="whitespace-nowrap">{session.room}</span>}
                      {session.studentIds?.length > 0 && (
                        <span className="whitespace-nowrap">
                          {session.studentIds.length} {session.studentIds.length === 1 ? 'Student' : 'Students'}
                        </span>
                      )}
                    </p>

                    {session.studentIds?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {session.studentIds.map((sid, idx) => {
                          const student = getStudent(sid);
                          if (!student) return null;
                          return (
                            <span 
                              key={idx} 
                              title={student.name}
                              className="w-6 h-6 border border-[var(--sa-line-default)] flex items-center justify-center text-[11px] sa-t-muted"
                            >
                              {student.name.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openAttendanceModal(session.id)}
                  className="sa-btn shrink-0 sm:self-center"
                >
                  <UserCheck size={13} strokeWidth={1.5} />
                  <span>Mark Attendance</span>
                </button>
              </motion.div>
            )) : (
              <div className="sa-empty mt-4">
                <Calendar size={16} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                <p className="sa-empty-title">Free Period</p>
                <p className="sa-empty-sub">No classroom sessions scheduled for this day.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="sa-panel">
            <div className="sa-panel-head">
              <h2 className="sa-panel-title">Academic Programs</h2>
            </div>
            
            <div className="sa-list">
              {myAssignments.length > 0 ? myAssignments.map(a => (
                <div key={a.id} className="sa-row">
                  <span className="sa-marker" />
                  <p className="sa-row-title flex-1 min-w-0 truncate">{a.programs?.name}</p>
                </div>
              )) : (
                <div className="sa-empty mt-4">
                  <BookOpen size={16} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                  <p className="sa-empty-title">No programs assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && (
          <div 
            className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowAttendanceModal(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-ps-surface border border-ps-border max-w-lg w-full p-5 sm:p-6 lg:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sa-panel-head">
                <div>
                  <h3 className="sa-panel-title">Attendance Record</h3>
                  <p className="sa-panel-sub">Session Overview & Student Status</p>
                </div>
                <button onClick={() => setShowAttendanceModal(null)} className="sa-btn">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              <div>
                <label className="sa-label">Common Note (Optional)</label>
                <input
                  type="text"
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  placeholder="e.g. Traffic delay, family emergency..."
                  className="w-full px-3 py-2.5 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]"
                />
              </div>

              <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar sa-list">
                {(() => {
                  const session = sessions.find(s => s.id === showAttendanceModal);
                  return session?.studentIds?.map(sid => {
                    const student = getStudent(sid);
                    if (!student) return null;
                    const marked = attendanceMarks[sid];
                    
                    return (
                      <div key={sid} className="flex flex-col gap-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 border border-[var(--sa-line-default)] flex items-center justify-center text-sm sa-t-warm">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="sa-row-title truncate">{student.name}</p>
                            {marked && (
                              <p className="sa-row-meta">
                                Currently: {marked}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'present', icon: Check, label: 'P' },
                            { id: 'absent', icon: X, label: 'A' },
                            { id: 'late', icon: Clock, label: 'L' },
                            { id: 'excused', icon: FileText, label: 'E' }
                          ].map(status => (
                            <button
                              key={status.id}
                              onClick={() => handleMarkAttendance(showAttendanceModal, sid, status.id)}
                              className={clsx(
                                "sa-btn justify-center",
                                marked === status.id && "sa-btn--primary"
                              )}
                            >
                              <status.icon size={14} strokeWidth={1.5} />
                              <span>{status.id.slice(0, 1).toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setShowAttendanceModal(null)}
                className="sa-btn sa-btn--primary sa-btn--block"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherDashboard;
