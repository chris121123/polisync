import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import ItxSelect from '../../components/ItxSelect.jsx';
import { isTherapistOrTeacher } from './staff.js';

const EMPTY = { studentId: '', programId: '', sessionsPerWeek: 1, preferredDurationHours: 1, priority: 5, assignedTeacherId: '' };
const fieldCls = 'w-full px-3 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm tabular-nums text-[var(--sa-text-primary)]';
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
    <section className="itx-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="add-requirement-form"
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-[var(--x-radius-card)] hover:bg-[var(--sa-surface-2)] active:bg-[var(--sa-surface-warm)]"
      >
        <span className="flex items-center gap-2 sa-panel-title">
          <Plus size={16} strokeWidth={1.5} className="sa-t-muted" /> Add requirement
        </span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} className="sa-t-muted" /> : <ChevronDown size={16} strokeWidth={1.5} className="sa-t-muted" />}
      </button>

      {open && (
        <form id="add-requirement-form" onSubmit={submit} className="px-4 pb-4 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label htmlFor="req-student" className={labelCls}>Student *</label>
            <ItxSelect
              id="req-student"
              value={form.studentId}
              onChange={studentId => set({ studentId })}
              placeholder="Select student…"
              options={students.map(s => ({ value: String(s.id), label: s.name }))}
              required
            />
          </div>

          <div>
            <label htmlFor="req-program" className={labelCls}>Program *</label>
            <ItxSelect
              id="req-program"
              value={form.programId}
              onChange={programId => set({ programId })}
              placeholder="Select program…"
              options={programs.map(p => ({ value: String(p.id), label: p.name }))}
              required
            />
          </div>

          <div>
            <label htmlFor="req-sessions" className={labelCls}>Sessions per week</label>
            <input id="req-sessions" type="number" min="1" max="5" step="1" required value={form.sessionsPerWeek}
              aria-required="true"
              onChange={e => set({ sessionsPerWeek: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-duration" className={labelCls}>Preferred duration (hours)</label>
            <input id="req-duration" type="number" min="0.5" max="4" step="0.5" required value={form.preferredDurationHours}
              aria-required="true"
              onChange={e => set({ preferredDurationHours: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-priority" className={labelCls}>Priority (1–10)</label>
            <input id="req-priority" type="number" min="1" max="10" step="1" required value={form.priority}
              aria-required="true"
              onChange={e => set({ priority: e.target.value })} className={fieldCls} />
          </div>

          <div>
            <label htmlFor="req-teacher" className={labelCls}>Assigned teacher (optional)</label>
            <ItxSelect
              id="req-teacher"
              value={form.assignedTeacherId}
              onChange={assignedTeacherId => set({ assignedTeacherId })}
              placeholder="Any available"
              options={staff.filter(isTherapistOrTeacher).map(s => ({ value: String(s.id), label: `${s.name} — ${s.role}` }))}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving || !form.studentId || !form.programId}
              className="sa-btn sa-btn--primary"
            >
              <Plus size={16} strokeWidth={1.5} /> {saving ? 'Adding…' : 'Add requirement'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
