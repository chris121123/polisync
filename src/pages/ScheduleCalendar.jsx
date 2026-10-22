import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock,
  Users, User, X, Info, AlertCircle, Trash2, Zap, CheckCircle2, Filter,
  LayoutGrid, List, BookOpen, MapPin, RefreshCw, TrendingUp, UserCheck
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const getRoomColor = () => ({
  bg: 'bg-ps-bg',
  border: 'border-ps-border',
  text: 'text-ps-ink-1',
  dot: 'bg-ps-accent',
  header: 'bg-ps-surface',
});

const TYPE_CONFIG = {
  sped:       { gradient: 'bg-sped',  light: 'bg-sped/10',  border: 'border-sped/20 dark:border-sped/20',  text: 'text-sped dark:text-sped',  badge: 'bg-sped/10 text-sped',  label: 'SPED'       },
  rehab:      { gradient: 'bg-rehab',       light: 'bg-rehab/10',     border: 'border-rehab/20 dark:border-rehab/20',     text: 'text-rehab dark:text-ps-ink-1',     badge: 'bg-rehab/10 text-rehab',        label: 'Rehab'      },
  playschool: { gradient: 'bg-ps-warn dark:bg-amber-700',   light: 'bg-ps-warn/10 dark:bg-amber-900/20',   border: 'border-ps-warn/20 dark:border-amber-800/50',   text: 'text-amber-900 dark:text-amber-100',   badge: 'bg-ps-warn/10 dark:bg-amber-900/40 text-ps-warn dark:text-amber-300',    label: 'Playschool' },
};

const formatHour = (h) => {
  if (h === 12) return '12:00 PM';
  if (h > 12)  return `${h - 12}:00 PM`;
  return `${h}:00 AM`;
};

// Assign sessions to weekdays deterministically based on session id
const getSessionDay = (session) => session.id % 5;

// Helper to filter eligible therapists and teachers (exclude parents, admins, superadmins)
const isTherapistOrTeacher = (s) => {
  if (!s) return false;
  const appRole = (s.app_role || '').toLowerCase();
  const role = (s.role || '').toLowerCase();

  // Explicitly exclude parent and admin roles
  if (appRole === 'parent' || role === 'parent') return false;
  if (['admin', 'superadmin', 'administrator', 'super administrator'].includes(appRole)) return false;
  if (['admin', 'administrator', 'super administrator'].includes(role)) return false;

  // If app_role is defined, must be therapist or teacher
  if (appRole) {
    return ['therapist', 'teacher'].includes(appRole);
  }

  // Fallback if app_role is not populated
  return Boolean(s.role);
};

// ─── Current-time indicator ──────────────────────────────────────────────────
const NowIndicator = ({ rowHeight = 96 }) => {
  const [top, setTop] = useState(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h >= 8 && h <= 18) setTop((h - 8) * rowHeight);
      else setTop(null);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [rowHeight]);

  if (top === null) return null;

  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
      <div className="flex items-center gap-0">
        <div className="w-2.5 h-2.5 rounded-full bg-ps-danger shadow-sm shrink-0 -ml-1" />
        <div className="flex-1 h-0.5 bg-ps-danger/80" />
      </div>
    </div>
  );
};

// ─── Session Card (Daily View) ───────────────────────────────────────────────
const SessionCard = ({ session, staffList, isSelected, hasConflict, conflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));
  const studentCount = session.studentIds?.length || 0;

  const conflictLabel = conflict?.type === 'therapist' 
    ? 'Staff Clash' 
    : (conflict?.type === 'room' ? 'Room Overlap' : 'Conflict');

  return (
    <motion.div
      layoutId={`session-${session.id}`}
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.01, zIndex: 30 }}
      whileDrag={{ scale: 1.03, zIndex: 50, cursor: 'grabbing', opacity: 0.95 }}
      className={clsx(
        'absolute left-1.5 right-1.5 rounded-xl cursor-grab transition-all duration-200 select-none overflow-hidden',
        'bg-ps-surface border shadow-xs hover:shadow-md',
        isSelected ? 'ring-2 ring-ps-accent ring-offset-1 z-20 border-transparent' : 'border-ps-border hover:border-ps-accent/40 z-10',
        hasConflict ? 'border-ps-danger/50 ring-1 ring-ps-danger/50 bg-ps-danger/5' : ''
      )}
      style={{
        top: `${(session.startHour - 8) * 96 + 2}px`,
        height: `${session.span * 96 - 4}px`,
      }}
    >
      {/* 3.5px solid left accent strip */}
      <div className={clsx(
        'absolute left-0 top-0 bottom-0 w-1',
        hasConflict ? 'bg-ps-danger' : cfg.gradient
      )} />

      <div className="relative z-10 p-2.5 pl-3.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        
        {/* Top line: Title & Badges */}
        <div>
          <div className="flex items-start justify-between gap-1.5 min-w-0">
            <p className={clsx(
              'font-semibold text-xs leading-snug line-clamp-1 truncate',
              hasConflict ? 'text-ps-danger font-bold' : 'text-ps-ink-1'
            )}>
              {session.title}
            </p>

            <div className="flex items-center gap-1 shrink-0">
              {hasConflict ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-ps-danger/15 text-ps-danger border border-ps-danger/30">
                  <AlertCircle size={10} className="shrink-0" />
                  <span>{conflictLabel}</span>
                </span>
              ) : (
                <span className={clsx('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md shrink-0', cfg.badge)}>
                  {cfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Time range */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ps-ink-2 mt-1">
            <Clock size={11} className="shrink-0 opacity-70" />
            <span>{formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}</span>
          </div>
        </div>

        {/* Bottom line: Provider and Student count */}
        <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-ps-border/50 text-ps-ink-2 mt-auto">
          <div className="flex items-center gap-1 truncate font-medium text-ps-ink-1 min-w-0">
            <User size={11} className="shrink-0 text-ps-ink-2" />
            <span className="truncate">{provider ? provider.name : 'Unassigned'}</span>
          </div>
          {studentCount > 0 && (
            <div className="flex items-center gap-1 shrink-0 text-ps-ink-2 font-medium">
              <Users size={11} className="shrink-0" />
              <span>{studentCount}</span>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};

// ─── Weekly Session Card (compact) ───────────────────────────────────────────
const WeeklySessionCard = ({ session, staffList, isSelected, hasConflict, conflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));

  const conflictLabel = conflict?.type === 'therapist' 
    ? 'Clash' 
    : (conflict?.type === 'room' ? 'Overlap' : 'Conflict');

  return (
    <motion.div
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileDrag={{ scale: 1.04, zIndex: 50, cursor: 'grabbing', opacity: 0.95 }}
      className={clsx(
        'absolute left-1 right-1 rounded-lg cursor-grab select-none overflow-hidden transition-all duration-200',
        'bg-ps-surface border shadow-xs hover:shadow-md',
        isSelected ? 'ring-2 ring-ps-accent z-20 border-transparent' : 'border-ps-border z-10',
        hasConflict ? 'border-ps-danger/60 ring-1 ring-ps-danger/60 bg-ps-danger/5' : ''
      )}
      style={{
        top: `${(session.startHour - 8) * 64 + 2}px`,
        height: `${session.span * 64 - 4}px`,
      }}
    >
      <div className={clsx(
        'absolute left-0 top-0 bottom-0 w-1',
        hasConflict ? 'bg-ps-danger' : cfg.gradient
      )} />

      <div className="relative z-10 p-1.5 pl-2.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        <div>
          <div className="flex items-center justify-between gap-1">
            <p className={clsx(
              'font-semibold text-xs leading-tight truncate',
              hasConflict ? 'text-ps-danger' : 'text-ps-ink-1'
            )}>
              {session.title}
            </p>
            {hasConflict ? (
              <span className="text-[9px] font-semibold px-1 rounded bg-ps-danger/15 text-ps-danger">
                {conflictLabel}
              </span>
            ) : (
              <span className={clsx('text-[9px] font-semibold uppercase px-1 rounded shrink-0', cfg.badge)}>
                {cfg.label}
              </span>
            )}
          </div>
          <p className="text-[10px] font-medium text-ps-ink-2 mt-0.5 flex items-center gap-1">
            <Clock size={9} className="opacity-70" />
            {formatHour(session.startHour).replace(':00', '')}–{formatHour(session.startHour + session.span).replace(':00', '')}
          </p>
        </div>

        {provider && (
          <p className="text-[10px] font-medium text-ps-ink-1 truncate pt-0.5 border-t border-ps-border/40 flex items-center gap-1">
            <User size={9} className="shrink-0 text-ps-ink-2" />
            <span className="truncate">{provider.name}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Manage Staff Availability Modal ──────────────────────────────────────────
const ManageAvailabilityModal = ({ isOpen, onClose, staff, staffAvailability, addStaffAvailability, removeStaffAvailability, notify }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  if (!isOpen) return null;

  const therapistsAndTeachers = staff.filter(isTherapistOrTeacher);

  const availableIdsForDate = staffAvailability
    .filter(a => a.available_date === selectedDate)
    .map(a => a.staff_id);

  const availableStaffForDate = therapistsAndTeachers.filter(s => availableIdsForDate.includes(s.id));

  const handleToggle = async (staffId) => {
    if (availableIdsForDate.includes(staffId)) {
      await removeStaffAvailability(staffId, selectedDate);
    } else {
      await addStaffAvailability(staffId, selectedDate);
    }
  };

  const handleSelectAll = async () => {
    const allSelected = therapistsAndTeachers.length > 0 && therapistsAndTeachers.every(s => availableIdsForDate.includes(s.id));
    if (allSelected) {
      // Deselect all
      for (const s of therapistsAndTeachers) {
        if (availableIdsForDate.includes(s.id)) {
          await removeStaffAvailability(s.id, selectedDate);
        }
      }
    } else {
      // Select all
      for (const s of therapistsAndTeachers) {
        if (!availableIdsForDate.includes(s.id)) {
          await addStaffAvailability(s.id, selectedDate);
        }
      }
    }
  };

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        className="bg-ps-surface rounded-t-2xl md:rounded-2xl shadow-md w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-6 bg-ps-success dark:bg-emerald-700 relative shrink-0">
          <div className="relative flex justify-between items-start">
            <div>
              <p className="text-white text-xs md:text-xs font-medium  mb-1">Staff Availability</p>
              <h3 className="text-white text-lg md:text-xl font-semibold">Manage Schedule</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-ps-surface/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Date Picker */}
          <div>
            <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-success focus:ring-2 focus:ring-ps-success/20 text-sm font-semibold transition-all"
            />
            <p className="text-xs text-ps-ink-2 font-medium mt-1">{dayLabel}</p>
          </div>

          {/* Available Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ps-ink-2">
              <span className="text-ps-success font-medium">{availableStaffForDate.length}</span> / {therapistsAndTeachers.length} available
            </p>
            <button
              onClick={handleSelectAll}
              className="text-xs font-medium text-ps-success hover:text-ps-success transition-colors px-3 py-1.5 rounded-lg hover:bg-ps-success/10"
            >
              {therapistsAndTeachers.length > 0 && therapistsAndTeachers.every(s => availableIdsForDate.includes(s.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Staff Checklist */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {therapistsAndTeachers.map(person => {
              const isAvailable = availableIdsForDate.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => handleToggle(person.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    isAvailable
                      ? 'border-ps-success/20 bg-ps-success/10'
                      : 'border-ps-border bg-ps-surface hover:border-ps-border'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isAvailable ? 'bg-ps-success dark:bg-emerald-700 text-white' : 'bg-ps-bg text-ps-ink-2'
                  )}>
                    {isAvailable ? <CheckCircle2 size={16} /> : <UserCheck size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold truncate', isAvailable ? 'text-ps-success' : 'text-ps-ink-2')}>
                      {person.name}
                    </p>
                    <p className="text-xs font-medium text-ps-ink-2 truncate">{person.role} · {person.department || 'General'}</p>
                  </div>
                  {isAvailable && (
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-ps-success/10 text-ps-success shrink-0">
                      Available
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <button
            onClick={() => { notify(`Availability saved for ${dayLabel}`); onClose(); }}
            className="w-full py-3 text-sm font-medium bg-ps-accent dark:bg-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Add Session Modal ────────────────────────────────────────────────────────
const AddSessionModal = ({ isOpen, onClose, onAdd, staff, students, rooms, sessions, staffAvailability, onOpenAvailability }) => {
  const [step, setStep] = useState(1);

  // Helper: get today's date in local timezone as YYYY-MM-DD
  const getLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const [formData, setFormData] = useState({
    title: '', therapistId: '', room: rooms[0]?.name || '',
    startHour: 9, span: 1, type: 'sped', studentIds: [],
    sessionDate: getLocalToday()
  });

  const reset = () => { setStep(1); setFormData({ title: '', therapistId: '', room: rooms[0]?.name || '', startHour: 9, span: 1, type: 'sped', studentIds: [], sessionDate: getLocalToday() }); };

  // Filter staff by availability on the selected date
  const availableStaff = useMemo(() => {
    if (!formData.sessionDate) {
      return []; // Must choose a date first to see available staff
    }
    
    // If we have no availability records at all or none for this date, nobody is available
    if (!staffAvailability || staffAvailability.length === 0) {
      return [];
    }

    const availableIds = staffAvailability
      .filter(a => a.available_date === formData.sessionDate)
      .map(a => a.staff_id);
      
    if (availableIds.length === 0) return [];
    
    return staff.filter(s => isTherapistOrTeacher(s) && availableIds.includes(s.id));
  }, [staff, staffAvailability, formData.sessionDate]);

  const conflictMessage = useMemo(() => {
    if (step !== 2) return null;
    const { startHour, span, room, therapistId } = formData;
    const end = startHour + span;

    for (const s of sessions) {
      const sEnd = s.startHour + s.span;
      const overlaps = Math.max(startHour, s.startHour) < Math.min(end, sEnd);
      if (overlaps) {
        if (s.room === room) return `Room "${room}" is already booked during this time.`;
        if (String(s.therapistId) === String(therapistId)) return `Provider is already booked during this time.`;
      }
    }
    return null;
  }, [formData, sessions, step]);

  if (!isOpen) return null;

  const typeCfg = TYPE_CONFIG[formData.type];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      onClick={() => { reset(); onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        className="bg-ps-surface rounded-t-2xl md:rounded-2xl shadow-md w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className={clsx('p-4 md:p-6 relative shrink-0', formData.type === 'rehab' ? 'bg-sky-700' : formData.type === 'sped' ? 'bg-purple-700' : typeCfg.gradient)}>
          <div className="relative flex justify-between items-start">
            <div>
              <p className="text-white text-xs md:text-xs font-medium  mb-1">New Session</p>
              <h3 className="text-white text-lg md:text-xl font-semibold">{formData.title || 'Untitled Session'}</h3>
            </div>
            <button onClick={() => { reset(); onClose(); }} className="p-2 rounded-full bg-ps-surface/20 hover:bg-ps-surface/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={clsx('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-ps-surface' : 'bg-white/30')} />
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Session Title *</label>
                <input
                  autoFocus
                  className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20 text-sm font-semibold transition-all"
                  placeholder="e.g., SPED Group B Morning"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, type: key })}
                      className={clsx(
                        'py-3 rounded-xl text-xs font-medium border-2 transition-all',
                        formData.type === key
                          ? `bg-ps-accent dark:bg-indigo-600 text-white border-transparent shadow-md`
                          : 'bg-ps-bg text-ps-ink-2 border-ps-border hover:border-ps-border'
                      )}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Session Date */}
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Session Date *</label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  min={getLocalToday()}
                  onChange={e => {
                    setFormData({ ...formData, sessionDate: e.target.value, therapistId: '' });
                  }}
                  className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20 text-sm font-semibold transition-all"
                />
                {formData.sessionDate && (
                  <p className="text-xs text-ps-ink-2 font-medium mt-1">
                    {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {availableStaff.length > 0 && (
                      <span className="text-ps-success ml-2">· {availableStaff.length} staff available</span>
                    )}
                  </p>
                )}
                {formData.sessionDate && !availableStaff.length && (
                  <p className="text-xs text-ps-warn bg-ps-warn/10 dark:text-ps-warn font-medium mt-1 flex items-center gap-1 px-2 py-1 rounded-lg">
                    <AlertCircle size={10} /> No staff marked available for this date —
                    <button onClick={onOpenAvailability} className="ml-1 underline font-medium">Open Availability</button> to mark staff first.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Provider / Therapist *</label>
                <p className="text-xs text-ps-ink-2 font-medium mb-2 -mt-1">
                  The staff member (therapist or teacher) responsible for conducting this session.
                </p>
                <select
                  className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-semibold"
                  value={formData.therapistId}
                  onChange={e => setFormData({ ...formData, therapistId: e.target.value })}
                >
                  <option value="">{availableStaff.length === 0 ? 'No staff available for this date' : 'Select staff member…'}</option>
                  {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                </select>
                {formData.sessionDate && availableStaff.length > 0 && (
                  <p className="text-xs text-ps-success font-medium mt-1 flex items-center gap-1">
                    <UserCheck size={10} /> Showing only available staff for {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Assign Students</label>
                <select
                  className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-semibold"
                  onChange={e => {
                    const sid = e.target.value;
                    if (sid && !formData.studentIds.includes(sid)) {
                      setFormData({ ...formData, studentIds: [...formData.studentIds, sid] });
                    }
                  }}
                  value=""
                >
                  <option value="" disabled hidden>— Add a student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.studentIds.map(sid => {
                    const student = students.find(s => String(s.id) === String(sid));
                    return (
                      <span key={sid} className="px-2 py-1 bg-ps-accent-soft text-ps-accent text-xs font-medium rounded-lg flex items-center gap-1">
                        {student?.name}
                        <button onClick={() => setFormData({ ...formData, studentIds: formData.studentIds.filter(id => id !== sid) })}>
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Venue / Room</label>
                <div className="grid grid-cols-2 max-h-[160px] overflow-y-auto pr-2 gap-2 pb-2">
                  {rooms.map((r, idx) => {
                    const rc = getRoomColor(idx);
                    return (
                      <button
                        key={r.name}
                        onClick={() => setFormData({ ...formData, room: r.name })}
                        className={clsx(
                          'px-4 py-3 rounded-xl text-xs font-medium border-2 flex items-center justify-between gap-2 transition-all',
                          formData.room === r.name ? `${rc.bg} ${rc.border} ${rc.text} shadow-sm` : 'bg-ps-bg text-ps-ink-2 border-ps-border'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', rc.dot)} />
                          <span className="truncate">{r.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Start Time</label>
                  <select
                    className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent text-sm font-semibold"
                    value={formData.startHour}
                    onChange={e => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                  >
                    {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Duration</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3].map(d => (
                      <button
                        key={d}
                        onClick={() => setFormData({ ...formData, span: d })}
                        className={clsx(
                          'py-3 rounded-xl text-xs font-medium border-2 transition-all',
                          formData.span === d ? 'bg-ps-accent dark:bg-indigo-600 text-white border-ps-accent shadow-md' : 'bg-ps-bg text-ps-ink-2 border-ps-border'
                        )}
                      >
                        {d}h
                      </button>
                    ))}
                  </div>
                </div>
                {conflictMessage && (
                  <div className="mt-4 p-3 bg-ps-danger/10 border border-ps-danger/20 rounded-xl flex items-start gap-2">
                    <AlertCircle size={14} className="text-ps-danger shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-ps-danger">{conflictMessage}</p>
                  </div>
                )}
              </div>
              {/* Preview */}
              <div className={clsx('p-4 rounded-xl border-2 flex items-center gap-3', typeCfg.light, typeCfg.border)}>
                <div className={clsx('w-1 self-stretch rounded-full', typeCfg.gradient)} />
                <div>
                  <p className={clsx('font-semibold text-sm', typeCfg.text)}>{formData.title || '(untitled)'}</p>
                  <p className="text-xs text-ps-ink-2 mt-0.5">
                    {formData.room} · {formatHour(formData.startHour)} – {formatHour(formData.startHour + formData.span)} · {typeCfg.label}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-medium text-ps-ink-2 hover:bg-ps-bg rounded-xl transition-colors border border-ps-border">
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!formData.title || !formData.therapistId}
              className="flex-1 py-3 text-sm font-medium bg-ps-accent dark:bg-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-default transition-all shadow-sm"
            >
              Next: Choose Slot →
            </button>
          ) : (
            <button
              onClick={() => { onAdd(formData); reset(); onClose(); }}
              disabled={!!conflictMessage}
              className="flex-1 py-3 text-sm font-medium bg-ps-accent dark:bg-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-default disabled:grayscale transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Create Session
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ScheduleCalendar = () => {
  const { staff, students, sessions, moveSession, addSession, deleteSession, conflicts, rooms, smartSchedule, notify, staffAvailability, addStaffAvailability, removeStaffAvailability } = useGlobalState();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [pendingDelete, setPendingDelete] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [calendarView, setCalendarView] = useState('daily'); // 'daily' | 'weekly'
  const [roomPage, setRoomPage] = useState(0);
  const scrollRef = useRef(null);

  // ── Selected Date State ──
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const selectedDateISO = formatDateISO(selectedDate);

  const navigateDate = (offset) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset);
      return next;
    });
  };

  const navigateWeek = (offset) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (offset * 7));
      return next;
    });
  };

  const goToToday = () => setSelectedDate(new Date());

  // Get the Monday of the selected week
  const getWeekStart = (d) => {
    const day = d.getDay(); // 0=Sun, 1=Mon...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
    const mon = new Date(d);
    mon.setDate(diff);
    return mon;
  };

  const weekStart = getWeekStart(selectedDate);
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Count available staff for selected date (excluding parents/admins)
  const availableStaffCount = useMemo(() => {
    const eligibleIds = new Set((staff || []).filter(isTherapistOrTeacher).map(s => s.id));
    return staffAvailability?.filter(a => a.available_date === selectedDateISO && eligibleIds.has(a.staff_id)).length || 0;
  }, [staff, staffAvailability, selectedDateISO]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const isConflicted = id => conflicts.some(c => c.sessionIds.includes(id));
  const getConflictForSession = id => conflicts.find(c => c.sessionIds?.includes(id));

  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    const dayOfWeek = selectedDate.getDay() === 0 ? 4 : selectedDate.getDay() - 1;
    const result = await smartSchedule({ dayOfWeek, sessionDate: selectedDateISO });
    if (!result.success) {
      notify(result.error || 'Auto-scheduler failed to run', 'error');
    } else if (!result.scheduled || result.scheduled.length === 0) {
      notify('Auto-scheduler: No pending student programs found to schedule for this day.', 'info');
    }
    setIsAutoScheduling(false);
  };

  // Display 4 rooms at a time in Daily View
  const ROOMS_PER_PAGE = 4;
  const maxRoomPages = Math.ceil(rooms.length / ROOMS_PER_PAGE);
  const displayRooms = rooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE).map(r => r.name);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  // Filter sessions by type AND by selected date
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(s => filterType === 'all' || s.type === filterType);
    if (calendarView === 'daily') {
      // Show sessions matching the selected date, or sessions with no date (legacy)
      filtered = filtered.filter(s => {
        if (s.sessionDate) return s.sessionDate === selectedDateISO;
        // Legacy fallback: match by day_of_week
        const dow = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
        return s.dayOfWeek === dow || s.dayOfWeek === undefined || s.dayOfWeek === null;
      });
    }
    return filtered;
  }, [sessions, filterType, calendarView, selectedDateISO, selectedDate]);

  // Group sessions by weekday for weekly view
  const sessionsByDay = useMemo(() => {
    const grouped = [[], [], [], [], []];
    const typeFiltered = sessions.filter(s => filterType === 'all' || s.type === filterType);
    typeFiltered.forEach(s => {
      if (s.sessionDate) {
        // Match sessions to weekDates
        const idx = weekDates.findIndex(d => formatDateISO(d) === s.sessionDate);
        if (idx >= 0) grouped[idx].push(s);
      } else {
        const day = getSessionDay(s);
        grouped[day].push(s);
      }
    });
    return grouped;
  }, [sessions, filterType, weekDates]);

  // Stats for the selected date
  const totalStudents = new Set(filteredSessions.flatMap(s => s.studentIds)).size;
  const activeRooms = new Set(filteredSessions.map(s => s.room)).size;

  const handleReschedule = (newHour) => {
    if (selectedSession) {
      moveSession(selectedSession.id, newHour);
      setSelectedSessionId(null);
    }
  };

  // True when moving the selected session to `hour` would double-book the
  // same therapist or room (same overlap logic as AddSessionModal.conflictMessage).
  const slotHasConflict = (hour) => {
    const s = selectedSession;
    if (!s) return true;
    const end = hour + s.span;
    const dayOf = s => s.sessionDate || s.dayOfWeek;
    return sessions.some(o =>
      o.id !== s.id &&
      dayOf(o) === dayOf(s) &&
      Math.max(hour, o.startHour) < Math.min(end, o.startHour + o.span) &&
      (String(o.therapistId) === String(s.therapistId) || o.room === s.room)
    );
  };

  const handleDragEnd = (sessionId, e, info, isWeekly = false) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Calculate vertical (row/time) movement
    const rowHeight = isWeekly ? 64 : 96;
    const offsetRows = Math.round(info.offset.y / rowHeight);
    let newStartHour = session.startHour + offsetRows;
    
    // Clamp to valid hours
    if (newStartHour < 8) newStartHour = 8;
    if (newStartHour + session.span > 18) newStartHour = 18 - session.span;

    // Calculate horizontal (column/room) movement
    let newRoom = session.room;
    
    if (!isWeekly && displayRooms.includes(session.room)) {
      // Find the visual width of a column so we know how far they dragged
      const colElement = e.target.closest('.flex-1.relative.border-l') || e.target.parentElement;
      const colWidth = colElement ? colElement.offsetWidth : 100;
      
      const offsetCols = Math.round(info.offset.x / colWidth);
      const origColIdx = displayRooms.indexOf(session.room);
      let newColIdx = origColIdx + offsetCols;
      
      // Clamp to visible columns to prevent crashing
      if (newColIdx < 0) newColIdx = 0;
      if (newColIdx >= displayRooms.length) newColIdx = displayRooms.length - 1;
      
      newRoom = displayRooms[newColIdx];
    }
    
    if (newStartHour !== session.startHour || newRoom !== session.room) {
      moveSession(sessionId, newStartHour, newRoom);
    }
  };

  // Removed unused todayIdx

  return (
    <div className="flex h-full w-full overflow-hidden bg-ps-bg max-h-[calc(100vh-64px)]">

      {/* ── Left: Calendar ─────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col h-full min-w-0"
        onClick={() => setSelectedSessionId(null)}
      >

        {/* ── Toolbar ───────── */}
        <div className="flex-shrink-0 border-b border-ps-border bg-ps-surface">
          {/* Top row */}
          <div className="px-6 py-3.5 sm:py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-ps-accent dark:bg-indigo-600 flex items-center justify-center">
                  <CalendarIcon size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-ps-ink-1 leading-none">Schedule</h1>
                  <p className="text-xs text-ps-ink-2 font-medium">{calendarView === 'daily' ? 'Daily view' : 'Weekly view'}</p>
                </div>
              </div>

              {/* View toggle: Daily / Weekly */}
              <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1">
                <button
                  onClick={() => setCalendarView('daily')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    calendarView === 'daily' ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1'
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCalendarView('weekly')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    calendarView === 'weekly' ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1'
                  )}
                >
                  Weekly
                </button>
              </div>

              {/* Date nav */}
              <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1">
                <button 
                  onClick={() => calendarView === 'daily' ? navigateDate(-1) : navigateWeek(-1)}
                  className="p-1.5 rounded-lg hover:bg-ps-bg hover:shadow-sm text-ps-ink-2 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-medium text-ps-ink-1">
                  {calendarView === 'daily'
                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                    : `Week of ${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[4].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </span>
                <button 
                  onClick={() => calendarView === 'daily' ? navigateDate(1) : navigateWeek(1)}
                  className="p-1.5 rounded-lg hover:bg-ps-bg hover:shadow-sm text-ps-ink-2 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-medium text-ps-accent bg-ps-accent-soft hover:bg-ps-accent-soft border border-ps-accent/20 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto mt-2 xl:mt-0">
              {/* Type filters */}
              <div className="flex items-center gap-1 bg-ps-bg rounded-xl p-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'sped', label: 'SPED' },
                  { key: 'rehab', label: 'Rehab' },
                  { key: 'playschool', label: 'Play' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filterType === f.key
                        ? 'bg-ps-surface text-ps-ink-1 shadow-sm'
                        : 'text-ps-ink-2 hover:text-ps-ink-1'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAutoSchedule}
                disabled={isAutoScheduling}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isAutoScheduling 
                    ? "bg-ps-border text-ps-ink-2 cursor-not-allowed" 
                    : "border border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-accent"
                )}
              >
                {isAutoScheduling ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} strokeWidth={2.5} />
                )}
                {isAutoScheduling ? 'Scheduling...' : 'Auto-Schedule'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAvailabilityModalOpen(true); }}
                className="flex items-center gap-2 border border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-accent px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <UserCheck size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">Availability</span>
                {availableStaffCount > 0 && (
                  <span className="bg-ps-accent-soft text-ps-accent text-xs font-medium px-1.5 py-0.5 rounded-full">{availableStaffCount}</span>
                )}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }}
                className="flex items-center gap-2 bg-ps-accent dark:bg-indigo-600 hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> Add Session
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="px-6 py-2.5 border-t border-ps-border/60 flex flex-wrap items-center gap-4 sm:gap-6 bg-ps-bg/30">
            {[
              { label: 'Sessions', value: filteredSessions.length, icon: BookOpen, color: 'text-ps-ink-1' },
              { label: 'Students', value: totalStudents, icon: Users, color: 'text-ps-ink-1' },
              { label: 'Rooms Utilized', value: `${activeRooms}/${rooms.length}`, icon: MapPin, color: 'text-ps-ink-1' },
              { label: 'Available Staff', value: availableStaffCount, icon: UserCheck, color: availableStaffCount > 0 ? 'text-ps-success font-semibold' : 'text-ps-ink-2' },
              { label: 'Conflicts', value: conflicts.length, icon: AlertCircle, color: conflicts.length > 0 ? 'text-ps-danger font-semibold' : 'text-ps-ink-2' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <stat.icon size={13} className="text-ps-ink-2 shrink-0" />
                <span className="text-xs text-ps-ink-2 font-medium">{stat.label}:</span>
                <span className={clsx('text-xs font-medium', stat.color)}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ───────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-ps-bg">

          {/* ════════════ MOBILE LIST VIEW ════════════ */}
          {isMobile ? (
            <div className="p-4 space-y-4 pb-20">
              {[...filteredSessions].sort((a, b) => a.startHour - b.startHour).map(session => {
                const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
                const provider = staff.find(s => String(s.id) === String(session.therapistId));
                const hasConflict = isConflicted(session.id);
                return (
                  <div 
                    key={session.id} 
                    onClick={() => { setSelectedSessionId(session.id); setDetailTab('info'); setPendingDelete(false); }}
                    className={clsx(
                      "bg-ps-surface p-4 rounded-2xl border shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform",
                      hasConflict ? "border-ps-danger/20 ring-2 ring-ps-danger/20" : cfg.border,
                      selectedSessionId === session.id ? "ring-2 ring-ps-accent" : ""
                    )}
                  >
                    <div className={clsx('absolute left-0 top-0 bottom-0 w-1.5', cfg.gradient)} />
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h3 className={clsx("font-semibold text-base leading-tight pr-4", cfg.text)}>{session.title}</h3>
                      {hasConflict ? (
                        <span className="shrink-0 px-2 py-1 bg-ps-danger/10 text-ps-danger text-xs font-medium rounded-lg flex items-center gap-1"><AlertCircle size={10}/> Conflict</span>
                      ) : (
                        <span className={clsx('text-xs font-medium px-2 py-1 rounded-lg shrink-0', cfg.badge)}>{cfg.label}</span>
                      )}
                    </div>
                    <div className="space-y-1.5 pl-2 mt-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                        <Clock size={14} className="opacity-70" /> {formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                        <MapPin size={14} className="opacity-70" /> {session.room}
                      </div>
                      {provider && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-ps-ink-2">
                          <Users size={14} className="opacity-70" /> {provider.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredSessions.length === 0 && (
                <div className="text-center p-8 bg-ps-surface rounded-2xl border border-dashed border-ps-border text-ps-ink-2">
                  <CalendarIcon size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-sm">No sessions found</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ════════════ DAILY VIEW ════════════ */}
              {calendarView === 'daily' && (
                <div className="min-w-[760px] pb-10">
              {/* Room header row */}
              <div className="flex sticky top-0 z-30 bg-ps-surface border-b border-ps-border shadow-sm">
                <div className="w-20 shrink-0 bg-ps-surface border-r border-ps-border flex flex-col justify-center items-center gap-1">
                  <div className="flex bg-ps-bg rounded-lg p-0.5">
                    <button 
                      onClick={() => setRoomPage(Math.max(0, roomPage - 1))}
                      disabled={roomPage === 0}
                      className="p-1 rounded text-ps-ink-2 hover:bg-ps-bg disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronLeft size={14}/></button>
                    <button 
                      onClick={() => setRoomPage(Math.min(maxRoomPages - 1, roomPage + 1))}
                      disabled={roomPage === maxRoomPages - 1}
                      className="p-1 rounded text-ps-ink-2 hover:bg-ps-bg disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronRight size={14}/></button>
                  </div>
                  <span className="text-xs font-medium text-ps-ink-2 text-center leading-tight">Page {roomPage + 1}/{maxRoomPages}</span>
                </div>
                {displayRooms.map((roomName) => {
                  const roomSessions = sessions.filter(s => s.room === roomName).length;
                  return (
                    <div key={roomName} className="flex-1 px-3 py-2.5 flex items-center justify-between border-l border-ps-border bg-ps-surface">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx(
                          'w-2 h-2 rounded-full shrink-0',
                          roomSessions > 0 ? 'bg-ps-accent' : 'bg-ps-ink-2/40'
                        )} />
                        <span className="text-xs font-semibold text-ps-ink-1 truncate capitalize">{roomName}</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-ps-bg text-ps-ink-2 border border-ps-border">
                        {roomSessions} {roomSessions === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time gutter */}
                <div className="w-20 shrink-0 relative select-none" style={{ height: `${HOURS.length * 96}px` }}>
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className={clsx(
                        "absolute right-0 pr-3 flex items-center justify-end",
                        i === 0 ? "top-0 pt-0.5" : "-translate-y-1/2"
                      )}
                      style={{ top: i === 0 ? '1px' : `${i * 96}px` }}
                    >
                      <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                        {formatHour(hour)}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-3 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 96}px` }}
                  >
                    <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                      {formatHour(18)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex relative border-l border-ps-border">
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-ps-border' : 'border-dashed border-ps-border/60')} style={{ top: `${i * 96}px` }} />
                    ))}
                    {HOURS.slice(0, -1).map((_, i) => (
                      <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-ps-border/40 border-dashed" style={{ top: `${i * 96 + 48}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-ps-border" style={{ top: `${HOURS.length * 96}px` }} />
                  </div>

                  {displayRooms.map((roomName, colIdx) => (
                    <div key={roomName} className={clsx('flex-1 relative border-l border-ps-border')}>
                      {colIdx === 0 && <NowIndicator rowHeight={96} />}
                      {filteredSessions.filter(s => s.room === roomName).map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          staffList={staff}
                          isSelected={selectedSessionId === session.id}
                          hasConflict={isConflicted(session.id)}
                          conflict={getConflictForSession(session.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionId(session.id);
                            setDetailTab('info');
                            setPendingDelete(false);
                          }}
                          onDragEnd={(id, e, info) => handleDragEnd(id, e, info, false)}
                        />
                      ))}
                      <div style={{ height: `${HOURS.length * 96}px` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════ WEEKLY VIEW ════════════ */}
          {calendarView === 'weekly' && (
            <div className="min-w-[800px]">
              {/* Day header row */}
              <div className="flex sticky top-0 z-30 bg-ps-surface border-b border-ps-border shadow-sm">
                <div className="w-16 shrink-0" />
                {WEEKDAYS.map((day, idx) => {
                  const dayDate = weekDates[idx];
                  const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                  const dateNum = dayDate.getDate();
                  const sessionCount = sessionsByDay[idx].length;

                  return (
                    <div key={day} className={clsx(
                      'flex-1 px-3 py-3 flex items-center justify-between border-l border-ps-border',
                      isToday ? 'bg-ps-accent-soft/70' : 'bg-ps-surface'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium',
                          isToday ? 'bg-ps-accent dark:bg-indigo-600 text-white shadow-sm' : 'bg-ps-bg text-ps-ink-2'
                        )}>
                          {dateNum}
                        </div>
                        <div>
                          <span className={clsx('text-xs font-medium ', isToday ? 'text-ps-accent' : 'text-ps-ink-2')}>
                            {WEEKDAYS_SHORT[idx]}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ps-bg text-ps-ink-2 border border-ps-border">
                        {sessionCount}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time labels */}
                <div className="w-16 shrink-0 relative select-none" style={{ height: `${HOURS.length * 64}px` }}>
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className={clsx(
                        "absolute right-0 pr-2 flex items-center justify-end",
                        i === 0 ? "top-0 pt-0.5" : "-translate-y-1/2"
                      )}
                      style={{ top: i === 0 ? '1px' : `${i * 64}px` }}
                    >
                      <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                        {formatHour(hour).replace(':00', '')}
                      </span>
                    </div>
                  ))}
                  <div
                    className="absolute right-0 pr-2 flex items-center justify-end -translate-y-1/2"
                    style={{ top: `${HOURS.length * 64}px` }}
                  >
                    <span className="text-xs font-medium text-ps-ink-2 tabular-nums">
                      {formatHour(18).replace(':00', '')}
                    </span>
                  </div>
                </div>

                {/* Day columns */}
                <div className="flex-1 flex relative border-l border-ps-border">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-ps-border' : 'border-dashed border-ps-border/60')} style={{ top: `${i * 64}px` }} />
                    ))}
                    {/* Bottom closing border line */}
                    <div className="absolute left-0 right-0 border-t border-ps-border" style={{ top: `${HOURS.length * 64}px` }} />
                  </div>

                  {WEEKDAYS.map((day, dayIdx) => {
                    const dayDate = weekDates[dayIdx];
                    const isToday = formatDateISO(dayDate) === formatDateISO(new Date());
                    return (
                      <div key={day} className={clsx(
                        'flex-1 relative border-l border-ps-border',
                        dayIdx === 0 && 'border-l-0',
                        isToday && 'bg-ps-accent-soft/20'
                      )}>
                        {isToday && <NowIndicator rowHeight={64} />}

                        {sessionsByDay[dayIdx].map(session => (
                          <WeeklySessionCard
                            key={session.id}
                            session={session}
                            staffList={staff}
                            isSelected={selectedSessionId === session.id}
                            hasConflict={isConflicted(session.id)}
                            conflict={getConflictForSession(session.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSessionId(session.id);
                              setDetailTab('info');
                              setPendingDelete(false);
                            }}
                            onDragEnd={(id, e, info) => handleDragEnd(id, e, info, true)}
                          />
                        ))}

                        <div style={{ height: `${HOURS.length * 64}px` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </div>
      </div>

      {/* ── Right: Detail Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSession && (
          <>
            {/* Mobile Overlay Backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSessionId(null)}
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              />
            )}
            <motion.div
              key="detail"
              initial={isMobile ? { y: '100%', opacity: 0 } : { x: 380, opacity: 0 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { x: 380, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={clsx(
                "bg-ps-surface flex flex-col z-50",
                isMobile 
                  ? "fixed bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl shadow-md" 
                  : "w-[360px] shrink-0 border-l border-ps-border h-full relative"
              )}
            >
            {(() => {
              const cfg = TYPE_CONFIG[selectedSession.type] || TYPE_CONFIG.sped;
              const provider = staff.find(s => String(s.id) === String(selectedSession.therapistId));
              const hasConflict = isConflicted(selectedSession.id);
              return (
                <>
                  <div className={clsx('p-5 relative overflow-hidden', selectedSession.type === 'rehab' ? 'bg-sky-700' : selectedSession.type === 'sped' ? 'bg-purple-700' : cfg.gradient)}>
                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-white/70 text-xs font-medium ">{cfg.label}</span>
                        <div className="flex items-center gap-1">
                          {pendingDelete ? (
                            <>
                              <button
                                onClick={() => { deleteSession(selectedSession.id); setSelectedSessionId(null); }}
                                aria-label="Confirm delete session"
                                className="px-2.5 py-1.5 rounded-lg bg-ps-danger dark:bg-red-700 hover:opacity-90 text-white text-xs font-medium transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setPendingDelete(false)}
                                aria-label="Cancel delete"
                                className="px-2.5 py-1.5 rounded-lg bg-ps-ink-2 hover:opacity-90 text-white text-xs font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPendingDelete(true)}
                              aria-label="Delete session"
                              className="p-2 rounded-lg bg-white/20 hover:bg-ps-danger dark:hover:bg-red-700 text-white transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedSessionId(null); setPendingDelete(false); }}
                            aria-label="Close session details"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-lg leading-tight">{selectedSession.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                          <Clock size={11} /> {formatHour(selectedSession.startHour)} – {formatHour(selectedSession.startHour + selectedSession.span)}
                        </span>
                        <span className="flex items-center gap-1 text-white/80 text-xs font-medium">
                          <MapPin size={11} /> {selectedSession.room}
                        </span>
                        {provider && <span className="flex items-center gap-1 text-white/80 text-xs font-medium"><Users size={11} /> {provider.name}</span>}
                      </div>
                      {hasConflict && (
                        <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                          <AlertCircle size={13} className="text-white" />
                          <span className="text-white text-xs font-medium">Scheduling Conflict Detected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-ps-border">
                    {[
                      { key: 'info', label: 'Details', icon: Info },
                      { key: 'reschedule', label: 'Reschedule', icon: RefreshCw },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setDetailTab(tab.key)}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors',
                          detailTab === tab.key ? 'text-ps-accent border-ps-accent' : 'text-ps-ink-2 border-transparent hover:text-ps-ink-2'
                        )}
                      >
                        <tab.icon size={13} />
                        {tab.label}
                        {tab.key === 'reschedule' && hasConflict && (
                          <span className="w-2 h-2 rounded-full bg-ps-danger/100" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {detailTab === 'info' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {[
                          { icon: Users, label: 'Provider', value: provider?.name ?? '—', sub: provider?.role },
                          { icon: Clock, label: 'Time Slot', value: `${formatHour(selectedSession.startHour)} – ${formatHour(selectedSession.startHour + selectedSession.span)}`, sub: `${selectedSession.span}h duration` },
                          { icon: MapPin, label: 'Venue', value: selectedSession.room },
                          { icon: TrendingUp, label: 'Students', value: `${selectedSession.studentIds?.length ?? 0} enrolled` },
                        ].map(row => (
                          <div key={row.label} className="flex items-start gap-3 p-3 bg-ps-bg rounded-xl">
                            <div className="p-2 bg-ps-surface rounded-lg border border-ps-border shrink-0">
                              <row.icon size={14} className="text-ps-ink-2" />
                            </div>
                            <div>
                              <p className="text-xs font-medium  text-ps-ink-2">{row.label}</p>
                              <p className="text-sm font-medium text-ps-ink-1 mt-0.5">{row.value}</p>
                              {row.sub && <p className="text-xs text-ps-ink-2 font-medium">{row.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {detailTab === 'reschedule' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {hasConflict && (
                          <div className="p-4 bg-ps-danger/10 border border-ps-danger/20 rounded-xl">
                            <p className="text-xs font-medium text-ps-danger flex items-center gap-2 mb-1">
                              <AlertCircle size={13} /> Conflict Detected
                            </p>
                            <p className="text-xs text-ps-danger font-medium leading-relaxed">
                              This session overlaps with another session for the same therapist or room.
                            </p>
                          </div>
                        )}

                        <div>
                          <h5 className="text-xs font-semibold text-ps-ink-2  mb-3 flex items-center gap-2">
                            <Zap size={12} className="text-ps-warn" /> Smart Suggestions
                          </h5>
                          <div className="space-y-2">
                            {(() => {
                              const suggestions = [1, 2, 3]
                                .map(offset => selectedSession.startHour + offset)
                                .filter(newHour => newHour + selectedSession.span <= 17 && !slotHasConflict(newHour));
                              if (suggestions.length === 0) {
                                return (
                                  <p className="text-xs text-ps-ink-2 font-medium">No suggested slots left today (last start 17:00) — drag the session to another room or day.</p>
                                );
                              }
                              return suggestions.map(newHour => (
                                <motion.button
                                  key={newHour}
                                  whileHover={{ scale: 1.01 }}
                                  onClick={() => handleReschedule(newHour)}
                                  className="w-full text-left p-3.5 rounded-xl border-2 border-ps-success/20 bg-ps-success/5 hover:border-ps-success/40 hover:shadow-sm transition-all group"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium text-ps-success text-sm">{formatHour(newHour)}</span>
                                      <span className="text-ps-success text-xs mx-1">→</span>
                                      <span className="font-medium text-ps-success text-sm">{formatHour(newHour + selectedSession.span)}</span>
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 bg-ps-accent dark:bg-indigo-600 text-white rounded-lg transition-colors">
                                      Move
                                    </span>
                                  </div>
                                  <p className="text-xs text-ps-success font-semibold mt-1">{selectedSession.room} · no conflict at this time</p>
                                </motion.button>
                              ));
                            })()}
                          </div>
                        </div>

                        {!hasConflict && (
                          <div className="p-4 bg-ps-accent-soft border border-ps-accent/20 rounded-xl flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-ps-accent shrink-0" />
                            <p className="text-xs text-ps-accent font-semibold">No conflicts — session is optimally placed.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </>
              );
            })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Empty state hint when nothing selected */}
      {/* Empty state hint removed as requested */}

      <AddSessionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addSession}
        staff={staff}
        students={students}
        rooms={rooms}
        sessions={filteredSessions}
        staffAvailability={staffAvailability}
        onOpenAvailability={() => setIsAvailabilityModalOpen(true)}
      />

      <ManageAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        staff={staff}
        staffAvailability={staffAvailability}
        addStaffAvailability={addStaffAvailability}
        removeStaffAvailability={removeStaffAvailability}
        notify={notify}
      />
    </div>
  );
};

export default ScheduleCalendar;
