import { useState, useMemo } from 'react';
import { X, AlertCircle, UserCheck, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { HOURS, formatHour, formatDateISO, TYPE_CONFIG } from './calendarMath.js';
import { isTherapistOrTeacher } from './staff.js';

const getRoomColor = () => ({
  bg: 'bg-ps-bg',
  border: 'border-ps-border',
  text: 'text-ps-ink-1',
  dot: 'bg-ps-primary',
  header: 'bg-ps-surface',
});

// ─── Add Session Modal ────────────────────────────────────────────────────────
export const AddSessionModal = ({ isOpen, onClose, onAdd, staff, students, rooms, sessions, staffAvailability, onOpenAvailability }) => {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '', therapistId: '', room: rooms[0]?.name || '',
    startHour: 9, span: 1, type: 'sped', studentIds: [],
    sessionDate: formatDateISO(new Date())
  });

  const reset = () => { setStep(1); setFormData({ title: '', therapistId: '', room: rooms[0]?.name || '', startHour: 9, span: 1, type: 'sped', studentIds: [], sessionDate: formatDateISO(new Date()) }); };

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
                          ? `bg-ps-primary text-white border-transparent shadow-md`
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
                  min={formatDateISO(new Date())}
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
                  <p className="text-xs text-ps-warn bg-ps-warn/10 dark:text-ps-warn font-medium mt-1 flex flex-wrap items-center gap-1 px-2 py-1 rounded-lg">
                    <AlertCircle size={10} /> No staff marked available for this date — staff mark their own availability on their dashboard. Check back once someone marks the date.
                    <button onClick={onOpenAvailability} className="ml-1 underline font-medium">View availability</button>
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
                          formData.span === d ? 'bg-ps-primary text-white border-ps-accent shadow-md' : 'bg-ps-bg text-ps-ink-2 border-ps-border'
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
              className="flex-1 py-3 text-sm font-medium bg-ps-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-default transition-all shadow-sm"
            >
              Next: Choose Slot →
            </button>
          ) : (
            <button
              onClick={() => { onAdd(formData); reset(); onClose(); }}
              disabled={!!conflictMessage}
              className="flex-1 py-3 text-sm font-medium bg-ps-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-default disabled:grayscale transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Create Session
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
