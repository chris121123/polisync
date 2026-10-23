import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, CheckCircle2, Check, XCircle, AlertCircle, FileText, Calendar, ChevronLeft, ChevronRight, UserCheck, BookOpen, X } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, formatTime } from '../../lib/sessionDay';
import { StatCard } from '../admin/AdminDashboard';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ps-border/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => changeDay(-1)}
              className="p-2 rounded-xl hover:bg-ps-surface text-ps-ink-2 transition-colors border border-transparent hover:border-ps-border"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[130px] sm:min-w-[140px]">
              <h1 className="text-2xl font-display font-bold text-ps-ink-1">
                {dayNames[selectedDay - 1]}
              </h1>
              <p className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Daily Schedule</p>
            </div>
            <button 
              onClick={() => changeDay(1)}
              className="p-2 rounded-xl hover:bg-ps-surface text-ps-ink-2 transition-colors border border-transparent hover:border-ps-border"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 p-1.5 bg-ps-surface border border-ps-border rounded-2xl overflow-x-auto hide-scrollbar">
          {dayNames.map((day, idx) => {
            const active = selectedDay === idx + 1;
            const current = isToday(idx);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(idx + 1)}
                className={clsx(
                  "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                  active ? "bg-ps-accent dark:bg-indigo-600 text-white shadow-sm" : "text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1",
                  current && !active && "ring-2 ring-ps-accent/20"
                )}
              >
                {day.slice(0, 1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Schedule List */}
        <div className="lg:col-span-2 bg-ps-surface rounded-2xl shadow-md border border-ps-border overflow-hidden">
          <div className="p-6 lg:p-8 border-b border-ps-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-ps-accent-soft text-ps-accent rounded-xl">
                <Calendar size={20} />
              </div>
              <h2 className="text-lg font-display font-bold text-ps-ink-1">Classroom Sessions</h2>
            </div>
          </div>

          <div className="divide-y divide-ps-border">
            {todaySessions.length > 0 ? todaySessions.map((session, i) => (
              <motion.div 
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 hover:bg-ps-bg/30 transition-all group relative border-l-4 border-l-ps-accent flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 flex flex-col items-end shrink-0 pt-1">
                    <p className="text-sm font-bold text-ps-ink-1">{formatTime(session.startHour)}</p>
                    <p className="text-xs font-bold text-ps-ink-2 uppercase">{session.span}h</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-display font-bold text-ps-ink-1 leading-tight">{session.title}</h3>
                      {session.type && (
                        <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ps-accent-soft text-ps-accent">
                          {session.type}
                        </span>
                      )}
                      {session.room && (
                        <span className="text-xs font-bold text-ps-ink-2 bg-ps-bg px-2 py-0.5 rounded-md border border-ps-border">
                          {session.room}
                        </span>
                      )}
                    </div>

                    {session.studentIds?.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        {session.studentIds.map((sid, idx) => {
                          const student = getStudent(sid);
                          if (!student) return null;
                          return (
                            <div 
                              key={idx} 
                              className="w-7 h-7 rounded-full bg-ps-bg border-2 border-ps-surface flex items-center justify-center text-xs font-bold text-ps-ink-1 -ml-2 first:ml-0 shadow-sm relative group/avatar"
                              title={student.name}
                            >
                              {student.name.charAt(0)}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-ps-ink-1 text-ps-surface text-xs rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {student.name}
                              </div>
                            </div>
                          );
                        })}
                        <span className="text-xs font-bold text-ps-ink-2 ml-2">
                          {session.studentIds.length} {session.studentIds.length === 1 ? 'Student' : 'Students'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openAttendanceModal(session.id)}
                  className="px-4 py-2.5 bg-ps-accent dark:bg-indigo-600 hover:bg-ps-accent/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <UserCheck size={16} />
                  Mark Attendance
                </button>
              </motion.div>
            )) : (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-ps-bg rounded-full flex items-center justify-center mx-auto text-ps-ink-2/30">
                  <Calendar size={32} />
                </div>
                <div className="max-w-xs mx-auto">
                  <p className="text-sm font-bold text-ps-ink-1">Free Period</p>
                  <p className="text-xs text-ps-ink-2 mt-1">No classroom sessions scheduled for this day.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-ps-surface rounded-2xl p-6 shadow-md border border-ps-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-ps-accent-soft text-ps-accent rounded-xl">
                <BookOpen size={18} />
              </div>
              <h3 className="font-display font-bold text-ps-ink-1">Academic Programs</h3>
            </div>
            
            <div className="space-y-2.5">
              {myAssignments.length > 0 ? myAssignments.map(a => (
                <div key={a.id} className="p-3.5 rounded-2xl border border-ps-border bg-ps-bg/30 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.programs?.color || '#6366f1' }} />
                  <span className="text-sm font-bold text-ps-ink-1">{a.programs?.name}</span>
                </div>
              )) : (
                <p className="text-xs text-ps-ink-2 text-center py-4 italic">No programs assigned</p>
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-ps-surface rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full p-5 sm:p-6 lg:p-8 border border-ps-border space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-ps-ink-1">Attendance Record</h3>
                  <p className="text-xs text-ps-ink-2 mt-0.5">Session Overview & Student Status</p>
                </div>
                <button onClick={() => setShowAttendanceModal(null)} className="p-2 text-ps-ink-2 hover:bg-ps-bg rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Common Note (Optional)</label>
                <input
                  type="text"
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  placeholder="e.g. Traffic delay, family emergency..."
                  className="w-full p-3.5 bg-ps-bg border border-ps-border rounded-xl text-sm font-medium text-ps-ink-1 outline-none focus:border-ps-accent"
                />
              </div>

              <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {(() => {
                  const session = sessions.find(s => s.id === showAttendanceModal);
                  return session?.studentIds?.map(sid => {
                    const student = getStudent(sid);
                    if (!student) return null;
                    const marked = attendanceMarks[sid];
                    
                    return (
                      <div key={sid} className="p-4 rounded-2xl bg-ps-bg/30 border border-ps-border flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-ps-accent-soft flex items-center justify-center text-ps-accent font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ps-ink-1 truncate">{student.name}</p>
                            {marked && (
                              <p className="text-xs font-bold text-ps-success uppercase tracking-wide mt-0.5">
                                Currently: {marked}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'present', icon: Check, label: 'P', color: 'bg-ps-success' },
                            { id: 'absent', icon: X, label: 'A', color: 'bg-ps-danger' },
                            { id: 'late', icon: Clock, label: 'L', color: 'bg-ps-warn' },
                            { id: 'excused', icon: FileText, label: 'E', color: 'bg-ps-accent dark:bg-indigo-600' }
                          ].map(status => (
                            <button
                              key={status.id}
                              onClick={() => handleMarkAttendance(showAttendanceModal, sid, status.id)}
                              className={clsx(
                                "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all group/btn",
                                marked === status.id 
                                  ? `${status.color} border-transparent text-white shadow-sm` 
                                  : "bg-ps-surface border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-ink-1"
                              )}
                            >
                              <status.icon size={16} strokeWidth={3} />
                              <span className="text-xs font-bold">{status.id.slice(0, 1).toUpperCase()}</span>
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
                className="w-full py-3.5 bg-ps-accent dark:bg-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-colors"
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
