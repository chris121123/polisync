import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, CheckCircle2, XCircle, AlertCircle, FileText, Calendar } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TeacherDashboard = () => {
  const { user, sessions, students, fetchMyAssignments, myAssignments, markAttendance } = useGlobalState();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showAttendanceModal, setShowAttendanceModal] = useState(null);

  useEffect(() => {
    fetchMyAssignments();
  }, [fetchMyAssignments]);

  const mySessions = sessions.filter(s => String(s.therapistId) === String(user?.id));

  const todaySessions = mySessions.filter(s => (s.dayOfWeek ?? 0) === (selectedDay === 0 ? 0 : selectedDay - 1));

  const formatTime = (hour, span = 1) => {
    const start = hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
    const endHour = hour + span;
    const end = endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`;
    return `${start} - ${end}`;
  };

  const handleMarkAttendance = async (sessionId, studentId, status) => {
    await markAttendance(sessionId, studentId, status, '');
    setShowAttendanceModal(null);
  };

  const getStudent = (id) => students.find(s => s.id === id || s.id === Number(id));

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Teacher Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Manage your daily schedule and mark attendance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Week</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{mySessions.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{myAssignments.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{todaySessions.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{myAssignments.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-200">Daily Schedule</h2>
          <div className="flex gap-1.5">
            {dayNames.map((day, idx) => (
              <button
                key={day}
                onClick={() => setSelectedDay(idx + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                  <p className="text-xs text-slate-400">{session.span}h session</p>
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
                  onClick={() => setShowAttendanceModal(session.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                >
                  <CheckCircle2 size={16} />
                  Attendance
                </button>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center">
              <Clock size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No sessions scheduled for {dayNames[selectedDay - 1]}</p>
            </div>
          )}
        </div>
      </div>

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Mark Attendance</h3>
            {(() => {
              const session = sessions.find(s => s.id === showAttendanceModal);
              return session?.studentIds?.map(sid => {
                const student = getStudent(sid);
                if (!student) return null;
                return (
                  <div key={sid} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                      {student.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-300">{student.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'present')}
                        className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        title="Present"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'absent')}
                        className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                        title="Absent"
                      >
                        <XCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(showAttendanceModal, sid, 'late')}
                        className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                        title="Late"
                      >
                        <AlertCircle size={18} />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
            <button
              onClick={() => setShowAttendanceModal(null)}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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