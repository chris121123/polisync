import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Users, FileText, Star, Activity, BookOpen, Edit3, X, MapPin } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, sessionDayName, formatTime } from '../../lib/sessionDay';
import { StatCard } from '../admin/AdminDashboard';
import MyAvailabilityCard from '../../components/MyAvailabilityCard';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sa-rule-b">
        <div>
          <h1 className="sa-title">
            My Caseload
          </h1>
          <p className="sa-sub">
            Clinical management and developmental notes for your weekly students.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Caseload Hours" 
          value={`${totalHoursThisWeek} hrs`} 
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

      <MyAvailabilityCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Panel */}
        <div className="lg:col-span-2">
          <div className="sa-panel">
            {/* Header & Tabs */}
            <div className="sa-panel-head">
              <h2 className="sa-panel-title">Daily Schedule</h2>
              <button
                onClick={() => navigate('/therapist/notes')}
                className="sa-link"
              >
                All Clinical Notes →
              </button>
            </div>

            {/* Day Pill Selector */}
            <div className="flex w-fit max-w-full py-1 divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] my-4 overflow-x-auto">
              {dayNames.map((day, idx) => {
                const count = mySessions.filter(s => sessionDayIndex(s) === idx).length;
                const isActive = selectedDay === idx + 1;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(idx + 1)}
                    className={clsx(
                      "px-3 py-2 text-xs flex items-center gap-2 shrink-0",
                      isActive
                        ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                        : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                    )}
                  >
                    <span>{day.slice(0, 3)}</span>
                    <span className="tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Session List */}
            <div className="sa-list">
              {todaySessions.length > 0 ? (
                todaySessions.map((session, i) => (
                  <motion.div 
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="sa-row flex-col sm:flex-row border-l-2 border-l-[var(--sa-gold)] pl-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Time Column */}
                      <div className="w-16 shrink-0">
                        <p className="text-[13px] tabular-nums text-[var(--sa-text-primary)]">{formatTime(session.startHour)}</p>
                        <p className="text-[11px] tabular-nums sa-t-muted">{session.span}h</p>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="sa-row-title leading-tight">
                            {session.title}
                          </h3>
                          {session.type && (
                            <span className="sa-badge">
                              {session.type}
                            </span>
                          )}
                        </div>

                        <p className="sa-row-meta flex flex-wrap items-center gap-2">
                          {session.room && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} strokeWidth={1.5} /> {session.room}
                            </span>
                          )}
                        </p>

                        {/* Students */}
                        {session.studentIds?.length > 0 && (
                          <p className="text-[11px] sa-t-muted flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                            {session.studentIds.map((sid, i) => {
                              const student = getStudent(sid);
                              return student ? (
                                <span key={sid} className="whitespace-nowrap">{i > 0 && '· '}{student.name}</span>
                              ) : null;
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Add Note Action */}
                    <button
                      onClick={() => openNoteModal(session)}
                      className="sa-btn shrink-0 sm:self-center"
                    >
                      <Edit3 size={13} strokeWidth={1.5} />
                      <span>Add Note</span>
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="sa-empty mt-4">
                  <Calendar size={16} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                  <p className="sa-empty-title">No Clinical Sessions Scheduled</p>
                  <p className="sa-empty-sub">Enjoy your open preparation time for {dayNames[selectedDay - 1]}.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Assigned Programs */}
          <div className="sa-panel">
            <div className="sa-panel-head">
              <h2 className="sa-panel-title">My Programs</h2>
            </div>
            
            <div className="sa-list">
              {myAssignments.length > 0 ? (
                myAssignments.map(a => (
                  <div key={a.id} className="sa-row border-l-2 border-l-[var(--sa-gold)] pl-3">
                    <p className="sa-row-title flex-1 min-w-0 truncate">{a.programs?.name}</p>
                    <span className="sa-badge shrink-0">
                      Active
                    </span>
                  </div>
                ))
              ) : (
                <div className="sa-empty mt-4">
                  <BookOpen size={16} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                  <p className="sa-empty-title">No programs assigned currently.</p>
                </div>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-ps-surface border border-ps-border max-w-lg w-full p-5 sm:p-6 lg:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sa-panel-head">
                <div>
                  <h3 className="sa-panel-title">Session Note</h3>
                  <p className="sa-panel-sub">{selectedSession.title} • {sessionDayName(selectedSession)}</p>
                </div>
                <button onClick={closeNoteModal} className="sa-btn">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              {/* Student Select */}
              <div>
                <label className="sa-label">Select Student</label>
                <select
                  value={noteStudentId}
                  onChange={(e) => setNoteStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] text-sm text-[var(--sa-text-primary)] focus:border-[var(--sa-gold)]"
                >
                  {(selectedSession.studentIds || []).map(sid => {
                    const student = getStudent(sid);
                    return <option key={sid} value={String(sid)}>{student?.name || `Student ${sid}`}</option>;
                  })}
                </select>
              </div>

              {/* Star Rating */}
              <div>
                <label className="sa-label">Progress & Engagement Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onMouseEnter={() => setHoverRating(rating)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNoteRating(rating)}
                      className="p-1.5 text-ps-warn"
                    >
                      <Star 
                        size={22} 
                        fill={(hoverRating || noteRating) >= rating ? 'currentColor' : 'none'} 
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Note Content */}
              <div>
                <label className="sa-label">Clinical Observations & Plan</label>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Record behavioral response, milestone breakthroughs, or parent recommendations..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  className="sa-btn sa-btn--primary flex-1 justify-center min-h-11 disabled:opacity-40"
                >
                  Save Progress Note
                </button>
                <button
                  onClick={closeNoteModal}
                  className="sa-btn justify-center min-h-11"
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
