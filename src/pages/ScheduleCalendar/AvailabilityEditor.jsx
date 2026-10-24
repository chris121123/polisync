import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const fieldCls = 'w-full px-3 py-2.5 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20 text-sm font-semibold text-ps-ink-1 transition-all';
const labelCls = 'text-xs font-medium text-ps-ink-2 mb-1.5 block';
const hhmm = (t) => String(t).slice(0, 5);

export const AvailabilityEditor = ({ studentId, studentName, onClose }) => {
  const { studentAvailability, addStudentAvailability, removeStudentAvailability, notify } = useGlobalState();
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-editor-title"
        className="bg-ps-surface rounded-t-2xl md:rounded-2xl shadow-md w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-5 border-b border-ps-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ps-ink-2">Student availability</p>
            <h2 id="availability-editor-title" className="text-lg font-semibold text-ps-ink-1">{studentName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close availability editor" className="p-2 rounded-full hover:bg-ps-bg text-ps-ink-2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-5 space-y-4 overflow-y-auto">
          {windows.length === 0 ? (
            <p className="text-sm font-medium text-ps-ink-2">No availability windows yet — the scheduler cannot place this student until one exists.</p>
          ) : (
            <ul className="space-y-2">
              {windows.map(w => (
                <li key={w.id} className="flex items-center justify-between gap-3 p-3 bg-ps-bg rounded-xl">
                  <span className="text-sm font-medium text-ps-ink-1">
                    {DAYS[w.day_of_week] ?? w.day_of_week} · {hhmm(w.start_time)}–{hhmm(w.end_time)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(w.id)}
                    aria-label={`Remove ${DAYS[w.day_of_week] ?? w.day_of_week} ${hhmm(w.start_time)}–${hhmm(w.end_time)}`}
                    className="p-2 rounded-lg text-ps-ink-2 hover:text-ps-danger hover:bg-ps-surface transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={add} className="space-y-3 border-t border-ps-border pt-4">
            <h3 className="text-xs font-semibold text-ps-ink-1">Add window</h3>
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
            {invalid && <p className="text-xs font-medium text-ps-danger">End time must be after start time.</p>}
            <button
              type="submit"
              disabled={saving || invalid}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ps-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Plus size={16} /> {saving ? 'Adding…' : 'Add window'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
