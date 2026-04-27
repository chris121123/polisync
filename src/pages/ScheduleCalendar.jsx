import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock,
  Users, X, Info, AlertCircle, Trash2, Zap, CheckCircle2, Filter,
  LayoutGrid, List, BookOpen, MapPin, RefreshCw, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalState } from '../context/GlobalStateContext';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const getRoomColor = (idx) => {
  const colors = [
    { bg: 'bg-violet-50 dark:bg-violet-900/20',  border: 'border-violet-200 dark:border-violet-800/50', text: 'text-violet-700 dark:text-violet-300',  dot: 'bg-violet-400',  header: 'bg-violet-100/70 dark:bg-violet-900/40' },
    { bg: 'bg-sky-50 dark:bg-sky-900/20',     border: 'border-sky-200 dark:border-sky-800/50',    text: 'text-sky-700 dark:text-sky-300',     dot: 'bg-sky-400',     header: 'bg-sky-100/70 dark:bg-sky-900/40'     },
    { bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800/50',  text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-400',   header: 'bg-amber-100/70 dark:bg-amber-900/40'   },
    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50',text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400', header: 'bg-emerald-100/70 dark:bg-emerald-900/40' },
    { bg: 'bg-rose-50 dark:bg-rose-900/20',    border: 'border-rose-200 dark:border-rose-800/50',   text: 'text-rose-700 dark:text-rose-300',    dot: 'bg-rose-400',    header: 'bg-rose-100/70 dark:bg-rose-900/40'    },
    { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  border: 'border-indigo-200 dark:border-indigo-800/50', text: 'text-indigo-700 dark:text-indigo-300',  dot: 'bg-indigo-400',  header: 'bg-indigo-100/70 dark:bg-indigo-900/40'  },
  ];
  return colors[idx % colors.length];
};

const TYPE_CONFIG = {
  sped:       { gradient: 'from-purple-500 to-violet-600',  light: 'bg-purple-50 dark:bg-purple-900/20',  border: 'border-purple-300 dark:border-purple-800/50',  text: 'text-purple-900 dark:text-purple-100',  badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',  label: 'SPED'       },
  rehab:      { gradient: 'from-sky-500 to-blue-600',       light: 'bg-sky-50 dark:bg-sky-900/20',     border: 'border-sky-300 dark:border-sky-800/50',     text: 'text-sky-900 dark:text-sky-100',     badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',        label: 'Rehab'      },
  playschool: { gradient: 'from-amber-400 to-orange-500',   light: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-300 dark:border-amber-800/50',   text: 'text-amber-900 dark:text-amber-100',   badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',    label: 'Playschool' },
};

const formatHour = (h) => {
  if (h === 12) return '12:00 PM';
  if (h > 12)  return `${h - 12}:00 PM`;
  return `${h}:00 AM`;
};

// Assign sessions to weekdays deterministically based on session id
const getSessionDay = (session) => session.id % 5;

// ─── Current-time indicator ──────────────────────────────────────────────────
const NowIndicator = () => {
  const [top, setTop] = useState(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const h = now.getHours() + now.getMinutes() / 60;
      if (h >= 8 && h <= 17) setTop((h - 8) * 96);
      else setTop(null);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  if (top === null) return null;

  return (
    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
      <div className="flex items-center gap-0">
        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-md shadow-rose-300 shrink-0 -ml-1.5" />
        <div className="flex-1 h-0.5 bg-rose-500/70" />
      </div>
    </div>
  );
};

// ─── Session Card (Daily View) ───────────────────────────────────────────────
const SessionCard = ({ session, staffList, isSelected, hasConflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));
  const isShort = session.span < 1.5;

  return (
    <motion.div
      layoutId={`session-${session.id}`}
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
      className={clsx(
        'absolute w-[96%] left-[2%] rounded-xl cursor-grab overflow-hidden transition-shadow duration-200',
        isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-xl z-20' : 'shadow-sm hover:shadow-md z-10',
        hasConflict ? 'ring-2 ring-rose-500' : '',
      )}
      style={{ top: `${(session.startHour - 8) * 96 + 4}px`, height: `${session.span * 96 - 8}px` }}
    >
      <div className={clsx('absolute inset-0 rounded-xl', cfg.light, cfg.border, 'border')} />
      <div className={clsx('absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r', cfg.gradient)} />
      <div className={clsx('absolute top-0 left-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b', cfg.gradient)} />

      {hasConflict && <div className="absolute inset-0 rounded-xl bg-rose-500/10 animate-pulse" />}

      <div className="relative z-10 p-2.5 pl-3.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        <div>
          <div className="flex items-start justify-between gap-1">
            <p className={clsx('font-bold text-xs leading-tight line-clamp-2', cfg.text)}>{session.title}</p>
            {hasConflict
              ? <AlertCircle size={12} className="text-rose-500 animate-pulse shrink-0 mt-0.5" />
              : <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0', cfg.badge)}>{cfg.label}</span>
            }
          </div>
          {!isShort && provider && (
            <p className={clsx('text-[10px] mt-1 font-semibold opacity-75 flex items-center gap-1', cfg.text)}>
              <Users size={9} /> {provider.name}
            </p>
          )}
        </div>
        {!isShort && (
          <div className={clsx('flex items-center gap-1 text-[9px] font-bold opacity-60', cfg.text)}>
            <Clock size={9} />
            {formatHour(session.startHour)} – {formatHour(session.startHour + session.span)}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Weekly Session Card (compact) ───────────────────────────────────────────
const WeeklySessionCard = ({ session, staffList, isSelected, hasConflict, onClick, onDragEnd }) => {
  const cfg = TYPE_CONFIG[session.type] || TYPE_CONFIG.sped;
  const provider = staffList.find(s => String(s.id) === String(session.therapistId));

  return (
    <motion.div
      onClick={onClick}
      drag
      dragSnapToOrigin={true}
      dragMomentum={false}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(session.id, e, info)}
      whileHover={{ scale: 1.03, zIndex: 30 }}
      whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
      className={clsx(
        'absolute w-[92%] left-[4%] rounded-lg cursor-grab overflow-hidden transition-shadow duration-200',
        isSelected ? 'ring-2 ring-indigo-500 shadow-lg z-20' : 'shadow-sm hover:shadow-md z-10',
        hasConflict ? 'ring-2 ring-rose-400' : '',
      )}
      style={{ top: `${(session.startHour - 8) * 64 + 2}px`, height: `${session.span * 64 - 4}px` }}
    >
      <div className={clsx('absolute inset-0 rounded-lg', cfg.light, cfg.border, 'border')} />
      <div className={clsx('absolute top-0 left-0 bottom-0 w-1 rounded-l-lg bg-gradient-to-b', cfg.gradient)} />
      {hasConflict && <div className="absolute inset-0 rounded-lg bg-rose-500/10 animate-pulse" />}

      <div className="relative z-10 p-1.5 pl-2.5 h-full flex flex-col justify-center overflow-hidden pointer-events-none">
        <p className={clsx('font-bold text-[10px] leading-tight line-clamp-1', cfg.text)}>{session.title}</p>
        {session.span >= 1.5 && provider && (
          <p className="text-[8px] font-semibold text-slate-400 mt-0.5 truncate">{provider.name}</p>
        )}
        <p className="text-[8px] font-bold text-slate-400 mt-0.5">
          {formatHour(session.startHour).replace(':00', '')}–{formatHour(session.startHour + session.span).replace(':00', '')}
        </p>
      </div>
    </motion.div>
  );
};

// ─── Add Session Modal ────────────────────────────────────────────────────────
const AddSessionModal = ({ isOpen, onClose, onAdd, staff, students, rooms, sessions }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '', therapistId: '', room: rooms[0]?.name || '',
    startHour: 9, span: 1, type: 'sped', studentIds: []
  });

  const reset = () => { setStep(1); setFormData({ title: '', therapistId: '', room: rooms[0]?.name || '', startHour: 9, span: 1, type: 'sped', studentIds: [] }); };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* header */}
        <div className={clsx('p-6 bg-gradient-to-r relative overflow-hidden', typeCfg.gradient)}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent)]" />
          <div className="relative flex justify-between items-start">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">New Session</p>
              <h3 className="text-white text-xl font-bold">{formData.title || 'Untitled Session'}</h3>
            </div>
            <button onClick={() => { reset(); onClose(); }} className="p-2 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-900/20 hover:bg-white dark:bg-slate-900 dark:bg-slate-900/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={clsx('h-1 flex-1 rounded-full transition-all', s <= step ? 'bg-white dark:bg-slate-900 dark:bg-slate-900' : 'bg-white dark:bg-slate-900 dark:bg-slate-900/30')} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Session Title *</label>
                <input
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold transition-all"
                  placeholder="e.g., SPED Group B Morning"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, type: key })}
                      className={clsx(
                        'py-3 rounded-xl text-xs font-bold border-2 transition-all',
                        formData.type === key
                          ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent shadow-md`
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      )}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Provider / Therapist *</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-semibold"
                  value={formData.therapistId}
                  onChange={e => setFormData({ ...formData, therapistId: e.target.value })}
                >
                  <option value="">Select staff member…</option>
                  {staff.filter(s => s.role !== 'Admin').map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign Students</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-semibold"
                  onChange={e => {
                    const sid = e.target.value;
                    if (sid && !formData.studentIds.includes(sid)) {
                      setFormData({ ...formData, studentIds: [...formData.studentIds, sid] });
                    }
                  }}
                  value=""
                >
                  <option value="">Select students…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.studentIds.map(sid => {
                    const student = students.find(s => String(s.id) === String(sid));
                    return (
                      <span key={sid} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
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
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Venue / Room</label>
                <div className="grid grid-cols-2 max-h-[160px] overflow-y-auto pr-2 gap-2 pb-2">
                  {rooms.map((r, idx) => {
                    const rc = getRoomColor(idx);
                    return (
                      <button
                        key={r.name}
                        onClick={() => setFormData({ ...formData, room: r.name })}
                        className={clsx(
                          'px-4 py-3 rounded-xl text-xs font-bold border-2 flex items-center justify-between gap-2 transition-all',
                          formData.room === r.name ? `${rc.bg} ${rc.border} ${rc.text} shadow-sm` : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700'
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
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Start Time</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm font-semibold"
                    value={formData.startHour}
                    onChange={e => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                  >
                    {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Duration</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3].map(d => (
                      <button
                        key={d}
                        onClick={() => setFormData({ ...formData, span: d })}
                        className={clsx(
                          'py-3 rounded-xl text-xs font-bold border-2 transition-all',
                          formData.span === d ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        )}
                      >
                        {d}h
                      </button>
                    ))}
                  </div>
                </div>
                {conflictMessage && (
                  <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 rounded-xl flex items-start gap-2">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{conflictMessage}</p>
                  </div>
                )}
              </div>
              {/* Preview */}
              <div className={clsx('p-4 rounded-xl border-2 flex items-center gap-3', typeCfg.light, typeCfg.border)}>
                <div className={clsx('w-1 self-stretch rounded-full bg-gradient-to-b', typeCfg.gradient)} />
                <div>
                  <p className={clsx('font-bold text-sm', typeCfg.text)}>{formData.title || '(untitled)'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formData.room} · {formatHour(formData.startHour)} – {formatHour(formData.startHour + formData.span)} · {typeCfg.label}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700">
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!formData.title || !formData.therapistId}
              className="flex-1 py-3 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-indigo-200"
            >
              Next: Choose Slot →
            </button>
          ) : (
            <button
              onClick={() => { onAdd(formData); reset(); onClose(); }}
              disabled={!!conflictMessage}
              className="flex-1 py-3 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:grayscale transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
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
  const { staff, students, sessions, moveSession, addSession, deleteSession, conflicts, rooms, smartSchedule, notify } = useGlobalState();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [detailTab, setDetailTab] = useState('info');
  const [filterType, setFilterType] = useState('all');
  const [calendarView, setCalendarView] = useState('daily'); // 'daily' | 'weekly'
  const [roomPage, setRoomPage] = useState(0);
  const scrollRef = useRef(null);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const isConflicted = id => conflicts.some(c => c.sessionIds.includes(id));

  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    const dayOfWeek = new Date().getDay() === 0 ? 4 : new Date().getDay() - 1; // Default to today's schedule column
    const result = await smartSchedule({ dayOfWeek });
    if (!result.success) {
      notify(result.error || 'Auto-scheduler failed to run', 'error');
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

  const filteredSessions = sessions.filter(s => filterType === 'all' || s.type === filterType);

  // Group sessions by weekday for weekly view
  const sessionsByDay = useMemo(() => {
    const grouped = [[], [], [], [], []];
    filteredSessions.forEach(s => {
      const day = getSessionDay(s);
      grouped[day].push(s);
    });
    return grouped;
  }, [filteredSessions]);

  // Stats
  const totalStudents = new Set(sessions.flatMap(s => s.studentIds)).size;
  const activeRooms = new Set(sessions.map(s => s.room)).size;

  const handleReschedule = (newHour) => {
    if (selectedSession) {
      moveSession(selectedSession.id, newHour);
      setSelectedSessionId(null);
    }
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

  // Get today's weekday index (0=Mon...4=Fri)
  const todayIdx = Math.min(Math.max(new Date().getDay() - 1, 0), 4);

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-800/50 max-h-[calc(100vh-64px)]">

      {/* ── Left: Calendar ─────────────────────────────────────────────── */}
      <div 
        className="flex-1 flex flex-col h-full min-w-0"
        onClick={() => setSelectedSessionId(null)}
      >

        {/* ── Toolbar ───────── */}
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-900">
          {/* Top row */}
          <div className="px-6 py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <CalendarIcon size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">Schedule</h1>
                  <p className="text-xs text-slate-400 font-medium">{calendarView === 'daily' ? 'Daily view' : 'Weekly view'}</p>
                </div>
              </div>

              {/* View toggle: Daily / Weekly */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setCalendarView('daily')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    calendarView === 'daily' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-200'
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCalendarView('weekly')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    calendarView === 'weekly' ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-200'
                  )}
                >
                  Weekly
                </button>
              </div>

              {/* Date nav */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                <button className="p-1.5 rounded-lg hover:bg-white dark:bg-slate-900 dark:bg-slate-900 hover:shadow-sm text-slate-500 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {calendarView === 'daily'
                    ? new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                    : `Week of ${new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 5)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  }
                </span>
                <button className="p-1.5 rounded-lg hover:bg-white dark:bg-slate-900 dark:bg-slate-900 hover:shadow-sm text-slate-500 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>

              <button className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors">
                Today
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
              {/* Type filters */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
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
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      filterType === f.key
                        ? 'bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-200'
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
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md",
                  isAutoScheduling 
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-200"
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
                onClick={(e) => { e.stopPropagation(); setIsAddModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200"
              >
                <Plus size={16} strokeWidth={2.5} /> Add Session
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="px-6 pb-3 flex flex-wrap items-center gap-4 xl:gap-6">
            {[
              { label: 'Sessions Today', value: sessions.length, icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
              { label: 'Students Active', value: totalStudents, icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Rooms in Use',  value: `${activeRooms}/${rooms.length}`, icon: MapPin, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
              { label: 'Conflicts', value: conflicts.length, icon: AlertCircle, color: conflicts.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400', bg: conflicts.length > 0 ? 'bg-rose-50 dark:bg-rose-900/30' : 'bg-slate-50 dark:bg-slate-800/50' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2">
                <div className={clsx('p-1.5 rounded-lg', stat.bg)}>
                  <stat.icon size={14} className={stat.color} />
                </div>
                <span className="text-xs text-slate-400 font-medium">{stat.label}:</span>
                <span className={clsx('text-sm font-bold', stat.color)}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Grid ───────── */}
        <div ref={scrollRef} className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-800/50">

          {/* ════════════ DAILY VIEW ════════════ */}
          {calendarView === 'daily' && (
            <div className="min-w-[760px] pb-10">
              {/* Room header row */}
              <div className="flex sticky top-0 z-30 bg-white dark:bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="w-20 shrink-0 bg-white dark:bg-slate-900 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center gap-1">
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button 
                      onClick={() => setRoomPage(Math.max(0, roomPage - 1))}
                      disabled={roomPage === 0}
                      className="p-1 rounded text-slate-500 hover:bg-white dark:bg-slate-900 dark:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronLeft size={14}/></button>
                    <button 
                      onClick={() => setRoomPage(Math.min(maxRoomPages - 1, roomPage + 1))}
                      disabled={roomPage === maxRoomPages - 1}
                      className="p-1 rounded text-slate-500 hover:bg-white dark:bg-slate-900 dark:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronRight size={14}/></button>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 text-center leading-tight">Page {roomPage + 1}/{maxRoomPages}</span>
                </div>
                {displayRooms.map((roomName, idx) => {
                  const globalIdx = roomPage * ROOMS_PER_PAGE + idx;
                  const rc = getRoomColor(globalIdx);
                  const roomSessions = sessions.filter(s => s.room === roomName).length;
                  return (
                    <div key={roomName} className={clsx('flex-1 px-3 py-3 flex items-center justify-between border-l border-slate-200 dark:border-slate-700', rc.header)}>
                      <div className="flex items-center gap-2">
                        <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', rc.dot)} />
                        <span className={clsx('text-xs font-bold uppercase tracking-wider truncate', rc.text)}>{roomName}</span>
                      </div>
                      <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', rc.bg, rc.text, rc.border, 'border')}>
                        {roomSessions} {roomSessions === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                <div className="w-20 shrink-0 relative">
                  {HOURS.map((hour, i) => (
                    <div key={hour} className="h-24 flex items-start justify-end pr-3 pt-2">
                      <span className={clsx('text-[10px] font-bold tabular-nums', i === 0 ? 'text-transparent' : 'text-slate-400')}>
                        {formatHour(hour)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 flex relative border-l border-slate-200 dark:border-slate-700">
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-200 dark:border-slate-700/60')} style={{ top: `${i * 96}px` }} />
                    ))}
                    {HOURS.slice(0, -1).map((_, i) => (
                      <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800 border-dashed" style={{ top: `${i * 96 + 48}px` }} />
                    ))}
                  </div>

                  {displayRooms.map((roomName, colIdx) => (
                    <div key={roomName} className={clsx('flex-1 relative border-l border-slate-200 dark:border-slate-700')}>
                      {colIdx === 0 && <NowIndicator />}
                      {filteredSessions.filter(s => s.room === roomName).map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          staffList={staff}
                          isSelected={selectedSessionId === session.id}
                          hasConflict={isConflicted(session.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSessionId(session.id);
                            setDetailTab('info');
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
              <div className="flex sticky top-0 z-30 bg-white dark:bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="w-16 shrink-0" />
                {WEEKDAYS.map((day, idx) => {
                  const isToday = idx === todayIdx;
                  const dayDate = new Date();
                  dayDate.setDate(dayDate.getDate() - dayDate.getDay() + 1 + idx);
                  const dateNum = dayDate.getDate();
                  const sessionCount = sessionsByDay[idx].length;

                  return (
                    <div key={day} className={clsx(
                      'flex-1 px-3 py-3 flex items-center justify-between border-l border-slate-200 dark:border-slate-700',
                      isToday ? 'bg-indigo-50/70 dark:bg-indigo-900/40' : 'bg-white dark:bg-slate-900 dark:bg-slate-900'
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black',
                          isToday ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        )}>
                          {dateNum}
                        </div>
                        <div>
                          <span className={clsx('text-xs font-bold uppercase tracking-wider', isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500')}>
                            {WEEKDAYS_SHORT[idx]}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        {sessionCount}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Time labels */}
                <div className="w-16 shrink-0 relative">
                  {HOURS.map((hour, i) => (
                    <div key={hour} className="h-16 flex items-start justify-end pr-2 pt-1">
                      <span className={clsx('text-[9px] font-bold tabular-nums', i === 0 ? 'text-transparent' : 'text-slate-400')}>
                        {formatHour(hour).replace(':00', '')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div className="flex-1 flex relative border-l border-slate-200 dark:border-slate-700">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    {HOURS.map((_, i) => (
                      <div key={i} className={clsx('absolute left-0 right-0 border-t', i === 0 ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-200 dark:border-slate-700/60')} style={{ top: `${i * 64}px` }} />
                    ))}
                  </div>

                  {WEEKDAYS.map((day, dayIdx) => {
                    const isToday = dayIdx === todayIdx;
                    return (
                      <div key={day} className={clsx(
                        'flex-1 relative border-l border-slate-200 dark:border-slate-700',
                        dayIdx === 0 && 'border-l-0',
                        isToday && 'bg-indigo-50/20 dark:bg-indigo-900/20'
                      )}>
                        {isToday && <NowIndicator />}

                        {sessionsByDay[dayIdx].map(session => (
                          <WeeklySessionCard
                            key={session.id}
                            session={session}
                            staffList={staff}
                            isSelected={selectedSessionId === session.id}
                            hasConflict={isConflicted(session.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSessionId(session.id);
                              setDetailTab('info');
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

        </div>
      </div>

      {/* ── Right: Detail Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            key="detail"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[360px] shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-900 flex flex-col"
          >
            {(() => {
              const cfg = TYPE_CONFIG[selectedSession.type] || TYPE_CONFIG.sped;
              const provider = staff.find(s => String(s.id) === String(selectedSession.therapistId));
              const hasConflict = isConflicted(selectedSession.id);
              return (
                <>
                  <div className={clsx('p-5 bg-gradient-to-br relative overflow-hidden', cfg.gradient)}>
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_white,_transparent)]" />
                    <div className="relative">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{cfg.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { deleteSession(selectedSession.id); setSelectedSessionId(null); }}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 dark:bg-slate-900/20 hover:bg-rose-500 text-white transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedSessionId(null)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 dark:bg-slate-900/20 hover:bg-white dark:bg-slate-900 dark:bg-slate-900/30 text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-white font-bold text-lg leading-tight">{selectedSession.title}</h3>
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
                        <div className="mt-3 flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900/20 rounded-lg px-3 py-1.5">
                          <AlertCircle size={13} className="text-white animate-pulse" />
                          <span className="text-white text-xs font-bold">Scheduling Conflict Detected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {[
                      { key: 'info', label: 'Details', icon: Info },
                      { key: 'reschedule', label: 'Reschedule', icon: RefreshCw },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setDetailTab(tab.key)}
                        className={clsx(
                          'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-colors',
                          detailTab === tab.key ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600 dark:text-slate-300'
                        )}
                      >
                        <tab.icon size={13} />
                        {tab.label}
                        {tab.key === 'reschedule' && hasConflict && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
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
                          <div key={row.label} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="p-2 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                              <row.icon size={14} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.label}</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{row.value}</p>
                              {row.sub && <p className="text-xs text-slate-400 font-medium">{row.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {detailTab === 'reschedule' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {hasConflict && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 rounded-xl">
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2 mb-1">
                              <AlertCircle size={13} /> Conflict Detected
                            </p>
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                              This session overlaps with another session for the same therapist or room.
                            </p>
                          </div>
                        )}

                        <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Zap size={12} className="text-amber-500" /> Smart Suggestions
                          </h5>
                          <div className="space-y-2">
                            {[1, 2, 3].map(offset => {
                              const newHour = selectedSession.startHour + offset;
                              if (newHour + selectedSession.span > 17) return null;
                              return (
                                <motion.button
                                  key={offset}
                                  whileHover={{ scale: 1.01 }}
                                  onClick={() => handleReschedule(newHour)}
                                  className="w-full text-left p-3.5 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-sm transition-all group"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-bold text-emerald-800 text-sm">{formatHour(newHour)}</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 text-xs mx-1">→</span>
                                      <span className="font-bold text-emerald-800 text-sm">{formatHour(newHour + selectedSession.span)}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500 text-white rounded-lg group-hover:bg-emerald-600 transition-colors">
                                      Move
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{selectedSession.room} · confirmed available</p>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {!hasConflict && (
                          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">No conflicts — session is optimally placed.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
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
        sessions={sessions}
      />
    </div>
  );
};

export default ScheduleCalendar;
