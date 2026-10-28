import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { isTherapistOrTeacher } from './staff.js';

const EMPTY = { studentId: '', programId: '', sessionsPerWeek: 1, preferredDurationHours: 1, priority: 5, assignedTeacherId: '' };
const fieldCls = 'w-full px-3 py-2.5 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm tabular-nums text-[var(--sa-text-primary)] focus:border-[var(--sa-gold)]';
const labelCls = 'sa-label';

export const AddRequirementForm = () => {
  const { students, programs, staff, addStudentProgram, notify } = useGlobalState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = patch => setForm(f => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await addStudentProgram({
      ...form,
      studentId: Number(form.studentId),
      programId: Number(form.programId),
      sessionsPerWeek: Number(form.sessionsPerWeek),
      preferredDurationHours: Number(form.preferredDurationHours),
      priority: Number(form.priority),
    });
    setSaving(false);
    if (result.success) {
      notify('Requirement added');
      setForm(EMPTY);
    }
  };

  return (
    <section className="border border-[var(--sa-line-default)]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="add-requirement-form"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 sa-panel-title">
          <Plus size={16} strokeWidth={1.5} className="sa-t-muted" /> Add requirement
        </span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} className="sa-t-muted" /> : <ChevronDown size={16} strokeWidth={1.5} className="sa-t-muted" />}
      </button>

      {open && (
        <form id="add-requirement-form" onSubmit={submit} className="px-4 pb-4 pt-4 border-t border-[var(--sa-line-hairline)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label htmlFor="req-student" className={labelCls}>Student *</label>
            <select id="req-student" required value={form.studentId} onChange={e => set({ studentId: e.target.value })} className={fieldCls}>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="req-program" className={labelCls}>Program *</label>
            <select id="req-program" required value={form.programId} onChange={e => set({ programId: e.target.value })} className={fieldCls}>
              <option value="">Select program…</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="req-sessions" className={labelCls}>Sessions per week</label>
            <input id="req-sessions" type="number" min="1" max="5" step="1" required value={form.sessionsPerWeek}
              onChange={e => set({ sessionsPerWeek: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-duration" className={labelCls}>Preferred duration (hours)</label>
            <input id="req-duration" type="number" min="0.5" max="4" step="0.5" required value={form.preferredDurationHours}
              onChange={e => set({ preferredDurationHours: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-priority" className={labelCls}>Priority (1–10)</label>
            <input id="req-priority" type="number" min="1" max="10" step="1" required value={form.priority}
              onChange={e => set({ priority: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-teacher" className={labelCls}>Assigned teacher (optional)</label>
            <select id="req-teacher" value={form.assignedTeacherId} onChange={e => set({ assignedTeacherId: e.target.value })} className={fieldCls}>
              <option value="">Any available</option>
              {staff.filter(isTherapistOrTeacher).map(s => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving || !form.studentId || !form.programId}
              className="sa-btn sa-btn--primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} strokeWidth={1.5} /> {saving ? 'Adding…' : 'Add requirement'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
