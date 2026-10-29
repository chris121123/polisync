import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const fieldCls = 'w-full px-3 py-2.5 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm tabular-nums text-[var(--sa-text-primary)] focus:border-[var(--sa-gold)]';
const labelCls = 'sa-label';
const hhmm = (t) => String(t).slice(0, 5);

export const AvailabilityEditor = ({ studentId, studentName, onClose }) => {
  const { studentAvailability, addStudentAvailability, removeStudentAvailability, notify } = useGlobalState();
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  const windows = studentAvailability
    .filter(a => Number(a.student_id) === Number(studentId) && a.is_active !== false)
    .sort((a, b) => a.day_of_week - b.day_of_week || String(a.start_time).localeCompare(String(b.start_time)));
  const invalid = startTime >= endTime;

  const add = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    const result = await addStudentAvailability({ studentId, dayOfWeek, startTime, endTime });
    setSaving(false);
    if (result.success) notify('Availability added');
  };

  const remove = async (id) => {
    const result = await removeStudentAvailability(id);
    if (result.success) notify('Availability removed');
  };

  return (
    <AppModal isOpen onClose={onClose} labelledBy="availability-editor-title">
      <ModalHeader
        titleId="availability-editor-title"
        eyebrow="Student availability"
        title={studentName}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 p-4 md:p-5 space-y-4 overflow-y-auto">
        {windows.length === 0 ? (
          <p className="sa-empty-sub">No availability windows yet — the scheduler cannot place this student until one exists.</p>
        ) : (
          <ul className="sa-list">
            {windows.map(w => (
              <li key={w.id} className="sa-row justify-between">
                <span className="text-sm tabular-nums text-[var(--sa-text-primary)]">
                  {DAYS[w.day_of_week] ?? w.day_of_week} · {hhmm(w.start_time)}–{hhmm(w.end_time)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  aria-label={`Remove ${DAYS[w.day_of_week] ?? w.day_of_week} ${hhmm(w.start_time)}–${hhmm(w.end_time)}`}
                  className="p-2 text-[var(--sa-text-muted)] hover:text-[var(--sa-danger)]"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="space-y-3 border-t border-[var(--sa-line-hairline)] pt-4">
          <h3 className="sa-micro">Add window</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="avail-day" className={labelCls}>Day</label>
              <select id="avail-day" value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className={fieldCls}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="avail-start" className={labelCls}>Start</label>
              <input id="avail-start" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="avail-end" className={labelCls}>End</label>
              <input id="avail-end" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className={fieldCls} />
            </div>
          </div>
          {invalid && <p className="text-[11px] sa-t-danger">End time must be after start time.</p>}
          <button
            type="submit"
            disabled={saving || invalid}
            className="sa-btn sa-btn--primary justify-center min-h-11 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={1.5} /> {saving ? 'Adding…' : 'Add window'}
          </button>
        </form>
      </div>
    </AppModal>
  );
};
