import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, CheckCircle2, Check, XCircle, AlertCircle, FileText, Calendar } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { DAY_NAMES as dayNames, sessionDayIndex, formatTime } from '../../lib/sessionDay';

import { StatCard } from '../admin/AdminDashboard';

const TeacherDashboard = () => {
  const { user, sessions, students, fetchMyAssignments, myAssignments, markAttendance, fetchAttendance } = useGlobalState();
  // Weekend defaults to Monday: tabs only cover Mon–Fri.
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

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Teacher Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Manage your daily schedule and mark attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="This Week" 
          value={mySessions.length} 
          icon={Calendar} 
          subtext="Total sessions"
          color="indigo" 
        />
        <StatCard 
          title="Students" 
          value={uniqueStudents} 
          icon={Users} 
          subtext="Total assigned"
          color="emerald" 
        />
        <StatCard 
          title="Today" 
          value={todaySessions.length} 
          icon={Clock} 
          subtext="Sessions today"
          color="amber" 
        />
        <StatCard 
          title="Programs" 
          value={myAssignments.length} 
          icon={FileText} 
          subtext="Active programs"
          color="rose" 
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-200">Daily Schedule</h2>
          <div className="flex gap-1.5">
            {dayNames.map((day, idx) => (
              <button
                key={day}
                onClick={() => setSelectedDay(idx + 1)}
                aria-pressed={selectedDay === idx + 1}
                aria-label={day}
                className={`px-3 py-1.5 min-h-[40px] min-w-[40px] rounded-lg text-xs font-bold transition-all ${
                  selectedDay === idx + 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {todaySessions.length > 0 ? todaySessions.map(session => (
            <div key={session.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 text-right">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatTime(session.startHour, session.span)}</p>
                  <p className="text-xs text-slate-500">{session.span}h session</p>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{session.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    {session.room && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                        {session.room}
                      </span>
                    )}
                    {session.type && (
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                        {session.type}
                      </span>
                    )}
                  </div>
                  {session.studentIds?.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">Students:</span>
                      {session.studentIds.map((sid, i) => {
                        const student = getStudent(sid);
                        return student ? (
                          <span key={i} className="text-xs px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg font-medium">
                            {student.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openAttendanceModal(session.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                >
                  <CheckCircle2 size={16} />
                  Attendance
                </button>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center">
              <Clock size={32} className="text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No sessions scheduled for {dayNames[selectedDay - 1] ?? dayNames[0]}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-indigo-500" />
          My Programs
        </h2>
        <div className="space-y-3">
          {myAssignments.length > 0 ? myAssignments.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.programs?.color || '#6366f1' }} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.programs?.name}</span>
            </div>
          )) : (
            <p className="text-sm text-slate-500 text-center py-4">No program assignments</p>
          )}
        </div>
      </div>

      {showAttendanceModal && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowAttendanceModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Mark Attendance</h3>
            <div className="mb-2">
              <label htmlFor="attendance-notes" className="block text-xs font-bold text-slate-500 mb-1.5">Note (applied to each mark)</label>
              <input
                id="attendance-notes"
                type="text"
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                placeholder="Optional note, e.g. reason for absence"
                className="w-full p-2.5 min-h-[40px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {(() => {
              const session = sessions.find(s => s.id === showAttendanceModal);
              return session?.studentIds?.map(sid => {
                const student = getStudent(sid);
                if (!student) return null;
                const marked = attendanceMarks[sid];
                return (
                  <div key={sid} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      {student.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {student.name}
                      {marked && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check size={12} /> {marked}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'present')}
                        aria-label={`Mark ${student.name} present`}
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'absent')}
                        aria-label={`Mark ${student.name} absent`}
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'late')}
                        aria-label={`Mark ${student.name} late`}
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <AlertCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'excused')}
                        aria-label={`Mark ${student.name} excused`}
                        className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                      >
                        <FileText size={18} />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
            <button
              onClick={() => setShowAttendanceModal(null)}
              className="mt-4 w-full py-2.5 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;