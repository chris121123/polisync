import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, UserCheck, X } from 'lucide-react';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import { HOURS, formatHour, formatDateISO, TYPE_CONFIG } from './calendarMath.js';
import { isTherapistOrTeacher } from './staff.js';

// One neutral header tone: the session type is carried by its label, not a fill.
const HEADER_TONE = 'bg-[var(--sa-surface-warm)]';

const fieldCls = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]';
const chipCls = 'px-3 py-3 text-xs border';
const chipOn = 'border-[var(--sa-gold)] text-[var(--sa-text-primary)]';
const chipOff = 'border-[var(--sa-line-default)] text-[var(--sa-text-muted)] hover:border-[var(--sa-line-strong)]';

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
        className={HEADER_TONE}
      >
        <div className="mt-5 flex gap-2">
          {[1, 2].map(s => (
            <div key={s} className="flex-1">
              <div className={clsx('h-1 transition-colors', s <= step ? 'bg-[var(--sa-text-primary)]' : 'bg-[var(--sa-line-default)]')} />
              <p className={clsx(
                'mt-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors',
                s <= step ? 'text-[var(--sa-text-primary)]' : 'text-[var(--sa-text-muted)]'
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
              <label htmlFor="session-title" className="sa-label">Session Title *</label>
              <input
                id="session-title"
                data-autofocus
                className={fieldCls}
                placeholder="e.g., SPED Group B Morning"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="sa-label">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: key })}
                    className={clsx(
                      chipCls,
                      formData.type === key ? chipOn : chipOff
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="session-date" className="sa-label">Session Date *</label>
              <input
                id="session-date"
                type="date"
                value={formData.sessionDate}
                min={formatDateISO(new Date())}
                onChange={e => {
                  setFormData({ ...formData, sessionDate: e.target.value, therapistId: '' });
                }}
                className={fieldCls}
              />
              {formData.sessionDate && (
                <p className="mt-1 text-[11px] sa-t-muted">
                  {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {availableStaff.length > 0 && (
                    <span className="ml-2 text-[var(--sa-success)]">· {availableStaff.length} staff available</span>
                  )}
                </p>
              )}
              {formData.sessionDate && !availableStaff.length && (
                <div className="mt-2 flex items-start gap-2 border border-[var(--sa-gold)] px-3 py-2.5">
                  <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                  <div className="text-[11px] sa-t-warm">
                    No staff marked available for this date — staff mark their own availability on their dashboard.
                    <button type="button" onClick={onOpenAvailability} className="ml-1 underline">
                      View availability
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="session-provider" className="sa-label">Provider / Therapist *</label>
              <p className="mb-2 text-[11px] sa-t-muted">
                The staff member (therapist or teacher) responsible for conducting this session.
              </p>
              <select
                id="session-provider"
                className={fieldCls}
                value={formData.therapistId}
                onChange={e => setFormData({ ...formData, therapistId: e.target.value })}
              >
                <option value="">{availableStaff.length === 0 ? 'No staff available for this date' : 'Select staff member…'}</option>
                {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
              </select>
              {formData.sessionDate && availableStaff.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--sa-success)]">
                  <UserCheck size={10} strokeWidth={1.5} /> Showing only available staff for {new Date(formData.sessionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="session-students" className="sa-label">Assign Students</label>
              <select
                id="session-students"
                className={fieldCls}
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
                    <span key={sid} className="flex items-center gap-1 border border-[var(--sa-line-default)] px-2 py-1 text-[11px] text-[var(--sa-text-secondary)]">
                      {student?.name}
                      <button
                        type="button"
                        aria-label={`Remove ${student?.name || 'student'}`}
                        onClick={() => setFormData({ ...formData, studentIds: formData.studentIds.filter(id => id !== sid) })}
                        className="text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                      >
                        <X size={12} strokeWidth={1.5} />
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
              <label className="sa-label">Venue / Room</label>
              {rooms.length === 0 ? (
                <p className="border border-dashed border-[var(--sa-line-default)] px-3 py-2.5 text-[11px] sa-t-muted">
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
                        'flex items-center justify-between gap-2 border px-3 py-2.5 text-xs',
                        selectedRoom === r.name ? chipOn : chipOff
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={clsx('h-1.5 w-1.5 shrink-0', selectedRoom === r.name ? 'bg-[var(--sa-gold)]' : 'bg-[var(--sa-line-strong)]')} />
                        <span className="truncate">{r.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="session-start" className="sa-label">Start Time</label>
                <select
                  id="session-start"
                  className={fieldCls}
                  value={formData.startHour}
                  onChange={e => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                >
                  {HOURS.slice(0, -1).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="sa-label">Duration</label>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, span: d })}
                      className={clsx(
                        'py-3 text-xs border',
                        formData.span === d ? chipOn : chipOff
                      )}
                    >
                      {d}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {conflictMessage && (
              <div className="flex items-start gap-2 border border-[var(--sa-danger)] p-3 sa-t-danger">
                <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <p className="text-[11px]">{conflictMessage}</p>
              </div>
            )}

            <div className="flex items-center gap-3 border border-[var(--sa-line-default)] p-4">
              <div className={clsx('w-1 self-stretch', typeCfg.gradient)} />
              <div>
                <p className="text-sm text-[var(--sa-text-primary)]">{formData.title || '(untitled)'}</p>
                <p className="mt-0.5 text-[11px] tabular-nums sa-t-muted">
                  {selectedRoom || 'No room'} · {formatHour(formData.startHour)} – {formatHour(formData.startHour + formData.span)} · {typeCfg.label}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="sa-btn justify-center min-h-11"
          >
            Back
          </button>
        )}
        {step === 1 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!formData.title || !formData.therapistId}
            className="sa-btn sa-btn--primary flex-1 justify-center min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next: Choose Slot <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { onAdd({ ...formData, room: selectedRoom }); handleClose(); }}
            disabled={!!conflictMessage}
            className="sa-btn sa-btn--primary flex-1 justify-center min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={16} strokeWidth={1.5} /> Create Session
          </button>
        )}
      </div>
    </AppModal>
  );
};
