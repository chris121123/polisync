import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, UserCheck, X } from 'lucide-react';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import { HOURS, formatHour, formatDateISO, TYPE_CONFIG } from './calendarMath.js';
import { isTherapistOrTeacher } from './staff.js';

// Header tones carry white text at AA contrast (bg-sped is too light behind white).
const HEADER_TONES = {
  sped: 'bg-purple-700',
  rehab: 'bg-sky-700',
  playschool: 'bg-ps-wood-deep',
};

const createEmptyForm = (rooms) => ({
  title: '',
  therapistId: '',
  room: rooms[0]?.name || '',
  startHour: 9,
  span: 1,
  type: 'sped',
  studentIds: [],
  sessionDate: formatDateISO(new Date()),
});

// ─── Add Session Modal ────────────────────────────────────────────────────────
export const AddSessionModal = ({ isOpen, onClose, onAdd, staff, students, rooms, sessions, staffAvailability, onOpenAvailability }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => createEmptyForm(rooms));
  // Rooms can finish loading after this modal mounts, so fall back to the first room.
  const selectedRoom = formData.room || rooms[0]?.name || '';

  const reset = () => {
    setStep(1);
    setFormData(createEmptyForm(rooms));
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
    const { startHour, span, therapistId } = formData;
    const end = startHour + span;

    for (const s of sessions) {
      const sEnd = s.startHour + s.span;
      const overlaps = Math.max(startHour, s.startHour) < Math.min(end, sEnd);
      if (overlaps) {
        if (s.room === selectedRoom) return `Room "${selectedRoom}" is already booked during this time.`;
        if (String(s.therapistId) === String(therapistId)) return 'Provider is already booked during this time.';
      }
    }
    return null;
  }, [formData, sessions, step, selectedRoom]);

  const typeCfg = TYPE_CONFIG[formData.type];

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} labelledBy="add-session-title">
      <ModalHeader
        titleId="add-session-title"
        eyebrow={`New session · Step ${step} of 2`}
        title={formData.title || 'Untitled session'}
        onClose={handleClose}
        className={HEADER_TONES[formData.type]}
      >
        <div className="mt-5 flex gap-2">
          {[1, 2].map(s => (
            <div key={s} className="flex-1">
              <div className={clsx('h-1 rounded-full transition-colors', s <= step ? 'bg-white' : 'bg-white/25')} />
              <p className={clsx(
                'mt-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                s <= step ? 'text-white/90' : 'text-white/50'
              )}>
                {s === 1 ? 'Details' : 'Schedule'}
              </p>
            </div>
          ))}
        </div>
      </ModalHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="session-title" className="mb-2 block text-xs font-medium text-ps-ink-2">Session Title *</label>
              <input
                id="session-title"
                data-autofocus
                className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20"
                placeholder="e.g., SPED Group B Morning"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-ps-ink-2">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: key })}
                    className={clsx(
                      'rounded-xl border-2 py-3 text-xs font-medium transition-all',
                      formData.type === key
                        ? 'border-transparent bg-ps-primary text-white shadow-sm'
                        : 'border-ps-border bg-ps-bg text-ps-ink-2 hover:border-ps-accent/40'
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="session-date" className="mb-2 block text-xs font-medium text-ps-ink-2">Session Date *</label>
              <input
                id="session-date"
                type="date"
                value={formData.sessionDate}
                min={formatDateISO(new Date())}
                onChange={e => {
                  setFormData({ ...formData, sessionDate: e.target.value, therapistId: '' });
                }}
                className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20"
              />
              {formData.sessionDate && (
                <p className="mt-1 text-xs font-medium text-ps-ink-2">
                  {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {availableStaff.length > 0 && (
                    <span className="ml-2 text-ps-success">· {availableStaff.length} staff available</span>
                  )}
                </p>
              )}
              {formData.sessionDate && !availableStaff.length && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-ps-warn/20 bg-ps-warn/10 px-3 py-2.5">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-ps-warn" />
                  <div className="text-xs font-medium text-ps-warn">
                    No staff marked available for this date — staff mark their own availability on their dashboard.
                    <button type="button" onClick={onOpenAvailability} className="ml-1 underline">
                      View availability
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="session-provider" className="mb-1 block text-xs font-medium text-ps-ink-2">Provider / Therapist *</label>
              <p className="mb-2 text-xs font-medium text-ps-ink-2">
                The staff member (therapist or teacher) responsible for conducting this session.
              </p>
              <select
                id="session-provider"
                className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20"
                value={formData.therapistId}
                onChange={e => setFormData({ ...formData, therapistId: e.target.value })}
              >
                <option value="">{availableStaff.length === 0 ? 'No staff available for this date' : 'Select staff member…'}</option>
                {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
              </select>
              {formData.sessionDate && availableStaff.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ps-success">
                  <UserCheck size={10} /> Showing only available staff for {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="session-students" className="mb-2 block text-xs font-medium text-ps-ink-2">Assign Students</label>
              <select
                id="session-students"
                className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20"
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
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.studentIds.map(sid => {
                  const student = students.find(s => String(s.id) === String(sid));
                  return (
                    <span key={sid} className="flex items-center gap-1 rounded-lg bg-ps-accent-soft px-2 py-1 text-xs font-medium text-ps-accent">
                      {student?.name}
                      <button
                        type="button"
                        aria-label={`Remove ${student?.name || 'student'}`}
                        onClick={() => setFormData({ ...formData, studentIds: formData.studentIds.filter(id => id !== sid) })}
                        className="rounded-sm transition-opacity hover:opacity-70"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-ps-ink-2">Venue / Room</label>
              {rooms.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ps-border bg-ps-bg px-4 py-3 text-xs font-medium text-ps-ink-2">
                  No rooms available. Add a room first.
                </p>
              ) : (
                <div className="grid max-h-[160px] grid-cols-2 gap-2 overflow-y-auto pb-2 pr-1">
                  {rooms.map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, room: r.name })}
                      className={clsx(
                        'flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-xs font-medium transition-all',
                        selectedRoom === r.name
                          ? 'border-ps-accent/30 bg-ps-accent-soft text-ps-accent shadow-sm'
                          : 'border-ps-border bg-ps-bg text-ps-ink-2 hover:border-ps-accent/40'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', selectedRoom === r.name ? 'bg-ps-accent' : 'bg-ps-ink-2/40')} />
                        <span className="truncate">{r.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="session-start" className="mb-2 block text-xs font-medium text-ps-ink-2">Start Time</label>
                <select
                  id="session-start"
                  className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20"
                  value={formData.startHour}
                  onChange={e => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                >
                  {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-ps-ink-2">Duration</label>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, span: d })}
                      className={clsx(
                        'rounded-xl border-2 py-3 text-xs font-medium transition-all',
                        formData.span === d
                          ? 'border-ps-accent bg-ps-primary text-white shadow-sm'
                          : 'border-ps-border bg-ps-bg text-ps-ink-2 hover:border-ps-accent/40'
                      )}
                    >
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {conflictMessage && (
              <div className="flex items-start gap-2 rounded-xl border border-ps-danger/20 bg-ps-danger/10 p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-ps-danger" />
                <p className="text-xs font-semibold text-ps-danger">{conflictMessage}</p>
              </div>
            )}

            <div className={clsx('flex items-center gap-3 rounded-xl border-2 p-4', typeCfg.light, typeCfg.border)}>
              <div className={clsx('w-1 self-stretch rounded-full', typeCfg.gradient)} />
              <div>
                <p className={clsx('text-sm font-semibold', typeCfg.text)}>{formData.title || '(untitled)'}</p>
                <p className="mt-0.5 text-xs text-ps-ink-2">
                  {selectedRoom || 'No room'} · {formatHour(formData.startHour)} – {formatHour(formData.startHour + formData.span)} · {typeCfg.label}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-ps-border bg-ps-surface px-5 py-4 md:px-6">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="rounded-xl border border-ps-border px-5 py-3 text-sm font-medium text-ps-ink-2 transition-colors hover:bg-ps-bg"
          >
            Back
          </button>
        )}
        {step === 1 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!formData.title || !formData.therapistId}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ps-primary py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-default disabled:opacity-50"
          >
            Next: Choose Slot <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { onAdd({ ...formData, room: selectedRoom }); handleClose(); }}
            disabled={!!conflictMessage}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ps-primary py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-default disabled:opacity-50 disabled:grayscale"
          >
            <CheckCircle2 size={16} /> Create Session
          </button>
        )}
      </div>
    </AppModal>
  );
};
