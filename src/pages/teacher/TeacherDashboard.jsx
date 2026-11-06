import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, CheckCircle2, Check, XCircle, AlertCircle, FileText, Calendar, ChevronLeft, ChevronRight, UserCheck, BookOpen, X } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import clsx from 'clsx';
import { DAY_NAMES as dayNames, sessionDayIndex, formatTime } from '../../lib/sessionDay';
import { StatCard } from '../admin/AdminDashboard';
import MyAvailabilityCard from '../../components/MyAvailabilityCard';
import { AppModal, ModalHeader } from '../../components/AppModal';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDay(-1)} className="sa-btn" aria-label="Previous day">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <div className="text-center min-w-[130px] sm:min-w-[140px]">
            <h1 className="sa-title">{dayNames[selectedDay - 1]}</h1>
            <p className="sa-sub">Daily Schedule</p>
          </div>
          <button onClick={() => changeDay(1)} className="sa-btn" aria-label="Next day">
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex w-fit max-w-full items-center overflow-x-auto hide-scrollbar">
          {dayNames.map((day, idx) => {
            const active = selectedDay === idx + 1;
            const current = isToday(idx);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(idx + 1)}
                aria-pressed={active}
                className={clsx('itx-tab shrink-0', active && 'is-active')}
              >
                {day.slice(0, 1)}
                {current && <span className="sa-dot" aria-hidden="true" />}
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

          <div className="mt-1 space-y-1">
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
                              className="sa-badge"
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
            
            <div className="mt-1 space-y-1">
              {myAssignments.length > 0 ? myAssignments.map(a => (
                <div key={a.id} className="sa-row h-11">
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
      <AppModal
        isOpen={!!showAttendanceModal}
        onClose={() => setShowAttendanceModal(null)}
        labelledBy="attendance-record-title"
      >
        <ModalHeader
          titleId="attendance-record-title"
          title="Attendance Record"
          description="Session Overview & Student Status"
          onClose={() => setShowAttendanceModal(null)}
        />

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
          <div>
            <label className="sa-label">Common Note (Optional)</label>
            <input
              data-autofocus
              type="text"
              value={attendanceNotes}
              onChange={(e) => setAttendanceNotes(e.target.value)}
              placeholder="e.g. Traffic delay, family emergency..."
              className="w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--accent)]"
            />
          </div>

          <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const session = sessions.find(s => s.id === showAttendanceModal);
              return session?.studentIds?.map(sid => {
                const student = getStudent(sid);
                if (!student) return null;
                const marked = attendanceMarks[sid];

                return (
                  <div key={sid} className="flex flex-col gap-3 py-1">
                    <div className="flex items-center gap-3">
                      <div className="itx-avatar flex items-center justify-center">
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

                    <div className="itx-filter-track" role="group" aria-label={`Attendance for ${student.name}`}>
                      {[
                        { id: 'present', name: 'Present', icon: Check },
                        { id: 'absent', name: 'Absent', icon: X },
                        { id: 'late', name: 'Late', icon: Clock },
                        { id: 'excused', name: 'Excused', icon: FileText }
                      ].map(status => (
                        <button
                          key={status.id}
                          type="button"
                          onClick={() => handleMarkAttendance(showAttendanceModal, sid, status.id)}
                          aria-pressed={marked === status.id}
                          aria-label={status.name}
                          className="itx-filter-cell flex-1 gap-1.5 px-2"
                        >
                          <status.icon size={14} strokeWidth={1.5} aria-hidden="true" />
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
            className="sa-btn sa-btn--primary w-full justify-center"
          >
            Done
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default TeacherDashboard;
