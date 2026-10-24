import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Users, FileText, Star, Activity, BookOpen, Edit3, X, MapPin } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, sessionDayName, formatTime } from '../../lib/sessionDay';
import { StatCard } from '../admin/AdminDashboard';

const TherapistDashboard = () => {
  const { user, sessions, students, fetchMyAssignments, myAssignments, addSessionNote } = useGlobalState();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteRating, setNoteRating] = useState(3);
  const [hoverRating, setHoverRating] = useState(0);
  const [noteStudentId, setNoteStudentId] = useState('');

  useEffect(() => {
    fetchMyAssignments();
  }, [fetchMyAssignments]);

  const mySessions = sessions.filter(s => String(s.therapistId) === String(user?.id));
  const selectedTab = selectedDay - 1;
  const todaySessions = mySessions.filter(s => sessionDayIndex(s) === selectedTab);

  const getStudent = (id) => students.find(s => s.id === id || s.id === Number(id));

  const totalHoursThisWeek = mySessions.reduce((sum, s) => sum + s.span, 0);
  const uniqueStudents = [...new Set(mySessions.flatMap(s => s.studentIds || []))].length;

  const openNoteModal = (session) => {
    setSelectedSession(session);
    setNoteStudentId(String(session.studentIds?.[0] ?? ''));
    setNoteContent('');
    setNoteRating(3);
  };

  const closeNoteModal = () => {
    setSelectedSession(null);
    setNoteContent('');
    setNoteRating(3);
    setNoteStudentId('');
    setHoverRating(0);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !selectedSession) return;
    const res = await addSessionNote({
      sessionId: selectedSession.id,
      studentId: noteStudentId || selectedSession.studentIds?.[0],
      noteType: 'general',
      content: noteContent.trim(),
      rating: noteRating,
    });
    if (res) closeNoteModal();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-ps-border/60">
        <div className="space-y-1.5">
          <div className="inline-block relative">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ps-ink-1">
              My Caseload
            </h1>
            <div className="h-1 w-full bg-ps-primary rounded-full mt-1 opacity-80" />
          </div>
          <p className="text-xs sm:text-sm text-ps-ink-2 font-medium">
            Clinical management and developmental notes for your weekly students.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Caseload Hours" 
          value={`${totalHoursThisWeek}h`} 
          icon={Clock} 
          subtext="Contact time this week"
        />
        <StatCard
          title="Active Students"
          value={uniqueStudents}
          icon={Users}
          subtext="Unique children"
        />
        <StatCard
          title="Scheduled Sessions"
          value={mySessions.length}
          icon={Calendar}
          subtext="Total clinical blocks"
        />
        <StatCard
          title="Active Programs"
          value={myAssignments.length}
          icon={FileText}
          subtext="Assigned specializations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Sessions Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-ps-surface rounded-2xl p-6 lg:p-8 shadow-md border border-ps-border">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ps-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-ps-accent-soft text-ps-accent rounded-xl">
                  <Activity size={20} />
                </div>
                <h2 className="text-lg font-display font-bold text-ps-ink-1">Daily Schedule</h2>
              </div>
              <button
                onClick={() => navigate('/therapist/notes')}
                className="text-xs font-bold text-ps-accent hover:underline flex items-center gap-1"
              >
                All Clinical Notes →
              </button>
            </div>

            {/* Day Pill Selector */}
            <div className="flex items-center gap-2 py-4 overflow-x-auto">
              {dayNames.map((day, idx) => {
                const count = mySessions.filter(s => sessionDayIndex(s) === idx).length;
                const isActive = selectedDay === idx + 1;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(idx + 1)}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                      isActive 
                        ? "bg-ps-primary text-white shadow-sm" 
                        : "bg-ps-bg text-ps-ink-2 hover:bg-ps-border hover:text-ps-ink-1"
                    )}
                  >
                    <span>{day.slice(0, 3)}</span>
                    <span className={clsx(
                      "w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold",
                      isActive ? "bg-black/25 text-white" : "bg-ps-surface text-ps-ink-2 shadow-xs"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Session List */}
            <div className="space-y-4 pt-2">
              {todaySessions.length > 0 ? (
                todaySessions.map((session, i) => (
                  <motion.div 
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-2xl border border-ps-border bg-ps-bg/30 hover:bg-ps-surface hover:shadow-sm transition-all group relative border-l-4 border-l-ps-accent flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Time Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-ps-accent-soft text-ps-accent flex flex-col items-center justify-center shrink-0 border border-ps-accent/10">
                        <span className="text-xs font-bold">{formatTime(session.startHour)}</span>
                        <span className="text-xs font-medium opacity-70">{session.span}h</span>
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-display font-bold text-ps-ink-1 leading-tight">
                            {session.title}
                          </h3>
                          {session.type && (
                            <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ps-accent-soft text-ps-accent">
                              {session.type}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-ps-ink-2">
                          {session.room && (
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin size={12} className="text-ps-accent" /> {session.room}
                            </span>
                          )}
                        </div>

                        {/* Students Avatar Clusters */}
                        {session.studentIds?.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {session.studentIds.map(sid => {
                              const student = getStudent(sid);
                              return student ? (
                                <div key={sid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ps-surface border border-ps-border text-xs font-medium text-ps-ink-1">
                                  <div className="w-4 h-4 rounded-full bg-ps-primary/10 text-ps-accent text-xs font-bold flex items-center justify-center">
                                    {student.name.charAt(0)}
                                  </div>
                                  <span>{student.name}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Note Action */}
                    <button
                      onClick={() => openNoteModal(session)}
                      className="px-3 py-2 rounded-xl border border-ps-accent/20 dark:border-ps-accent/20 text-ps-accent font-bold text-xs hover:bg-ps-accent-soft dark:hover:bg-ps-accent-soft transition-all flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 shrink-0 self-end sm:self-center"
                    >
                      <Edit3 size={14} />
                      <span>Add Note</span>
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center bg-ps-bg/20 rounded-2xl border-2 border-dashed border-ps-border">
                  <div className="w-12 h-12 bg-ps-accent-soft text-ps-accent rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Calendar size={24} />
                  </div>
                  <p className="text-sm font-bold text-ps-ink-1">No Clinical Sessions Scheduled</p>
                  <p className="text-xs text-ps-ink-2 mt-1">Enjoy your open preparation time for {dayNames[selectedDay - 1]}.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Assigned Programs */}
          <div className="bg-ps-surface rounded-2xl p-6 shadow-md border border-ps-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ps-accent-soft text-ps-accent rounded-xl">
                <BookOpen size={18} />
              </div>
              <h3 className="font-display font-bold text-ps-ink-1">My Programs</h3>
            </div>
            
            <div className="space-y-2.5">
              {myAssignments.length > 0 ? (
                myAssignments.map(a => (
                  <div key={a.id} className="p-3.5 rounded-2xl border border-ps-border bg-ps-bg/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.programs?.color || '#4f46e5' }} />
                      <span className="text-sm font-bold text-ps-ink-1">{a.programs?.name}</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-ps-ink-2 bg-ps-surface px-2 py-0.5 rounded-full border border-ps-border">
                      Active
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ps-ink-2 py-2 text-center">No programs assigned currently.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Note Modal */}
      <AnimatePresence>
        {selectedSession && (
          <div 
            className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeNoteModal}
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
                  <h3 className="text-xl font-display font-bold text-ps-ink-1">Session Note</h3>
                  <p className="text-xs text-ps-ink-2 mt-0.5">{selectedSession.title} • {sessionDayName(selectedSession)}</p>
                </div>
                <button onClick={closeNoteModal} className="p-2 text-ps-ink-2 hover:bg-ps-bg rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {/* Student Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Select Student</label>
                <select
                  value={noteStudentId}
                  onChange={(e) => setNoteStudentId(e.target.value)}
                  className="w-full p-3.5 bg-ps-bg border border-ps-border rounded-xl text-sm font-medium text-ps-ink-1 outline-none focus:border-ps-accent"
                >
                  {(selectedSession.studentIds || []).map(sid => {
                    const student = getStudent(sid);
                    return <option key={sid} value={String(sid)}>{student?.name || `Student ${sid}`}</option>;
                  })}
                </select>
              </div>

              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Progress & Engagement Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onMouseEnter={() => setHoverRating(rating)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNoteRating(rating)}
                      className="p-1 text-ps-warn hover:scale-110 transition-transform"
                    >
                      <Star 
                        size={28} 
                        fill={(hoverRating || noteRating) >= rating ? 'currentColor' : 'none'} 
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Note Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ps-ink-2">Clinical Observations & Plan</label>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Record behavioral response, milestone breakthroughs, or parent recommendations..."
                  rows={4}
                  className="w-full p-4 bg-ps-bg border border-ps-border rounded-xl text-sm font-medium text-ps-ink-1 outline-none focus:border-ps-accent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  className="flex-1 py-3.5 bg-ps-primary hover:bg-ps-primary/90 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  Save Progress Note
                </button>
                <button
                  onClick={closeNoteModal}
                  className="px-5 py-3.5 border border-ps-border text-ps-ink-2 font-bold rounded-xl hover:bg-ps-bg transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TherapistDashboard;
