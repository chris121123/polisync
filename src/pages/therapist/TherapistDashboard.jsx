import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Users, FileText, ChevronRight, Star, Activity, BookOpen } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { useNavigate } from 'react-router-dom';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TherapistDashboard = () => {
  const { user, sessions, students, fetchMyAssignments, myAssignments } = useGlobalState();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedSession, setSelectedSession] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteRating, setNoteRating] = useState(3);

  useEffect(() => {
    fetchMyAssignments();
  }, [fetchMyAssignments]);

  const mySessions = sessions.filter(s => String(s.therapistId) === String(user?.id));
  const todaySessions = mySessions.filter(s => (s.dayOfWeek ?? 0) === (selectedDay === 0 ? 0 : selectedDay - 1));

  const formatTime = (hour) => {
    const h = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:00 ${ampm}`;
  };

  const getStudent = (id) => students.find(s => s.id === id || s.id === Number(id));

  const totalHoursThisWeek = mySessions.reduce((sum, s) => sum + s.span, 0);
  const uniqueStudents = [...new Set(mySessions.flatMap(s => s.studentIds || []))].length;

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    setSelectedSession(null);
    setNoteContent('');
    setNoteRating(3);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Therapist Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Manage therapy sessions and track progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessions</p>
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
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hours / Week</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalHoursThisWeek}h</p>
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
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{uniqueStudents}</p>
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
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{myAssignments.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Activity size={18} className="text-teal-500" />
                  My Sessions
                </h2>
                <button
                  onClick={() => navigate('/therapist/notes')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  View All Notes →
                </button>
              </div>
              <div className="flex gap-1.5 mt-3">
                {dayNames.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(idx + 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedDay === idx + 1
                        ? 'bg-teal-600 text-white'
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
                <div key={session.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300">{formatTime(session.startHour)}</span>
                        <span className="text-[10px] text-teal-400">{session.span}h</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{session.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {session.room && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">{session.room}</span>
                        )}
                        {session.type && (
                          <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-md">{session.type}</span>
                        )}
                      </div>
                      {session.studentIds?.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {session.studentIds.map(sid => {
                            const student = getStudent(sid);
                            return student ? (
                              <span key={sid} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                                {student.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors shrink-0"
                    >
                      <FileText size={14} />
                      Add Note
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center">
                  <Calendar size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No sessions on {dayNames[selectedDay - 1]}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-teal-500" />
              My Programs
            </h3>
            <div className="space-y-3">
              {myAssignments.length > 0 ? myAssignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.programs?.color || '#0d9488' }} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.programs?.name}</span>
                </div>
              )) : (
                <p className="text-sm text-slate-400 text-center py-4">No program assignments</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Star size={16} className="text-teal-500" />
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Sessions this week</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{mySessions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total hours</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{totalHoursThisWeek}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Students assigned</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{uniqueStudents}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6"
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">Add Session Note</h3>
            <p className="text-sm text-slate-500 mb-4">{selectedSession.title} · {dayNames[selectedSession.dayOfWeek ?? 0]}</p>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Session Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setNoteRating(rating)}
                    className={`p-2 rounded-lg transition-colors ${noteRating >= rating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                  >
                    <Star size={24} fill={noteRating >= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Session observations, student progress, recommendations..."
                rows={4}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddNote}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
              >
                Save Note
              </button>
              <button
                onClick={() => { setSelectedSession(null); setNoteContent(''); setNoteRating(3); }}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TherapistDashboard;