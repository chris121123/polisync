import { useState } from 'react';
import { CalendarCheck, CalendarClock, CheckCircle2, Loader2, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AddRequirementForm } from './AddRequirementForm.jsx';
import { AvailabilityEditor } from './AvailabilityEditor.jsx';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const primaryBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ps-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm';
const ghostBtn = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-ps-border text-ps-ink-2 hover:border-ps-accent hover:text-ps-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all';

export const PendingPanel = ({ selectedDateISO, dayOfWeek }) => {
  const { studentPrograms, sessions, students, programs, staff, studentAvailability, smartSchedule, notify } = useGlobalState();
  const [selectedIds, setSelectedIds] = useState([]);
  const [scope, setScope] = useState('whole-week');
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [availabilityFor, setAvailabilityFor] = useState(null);

  const isWeekend = dayOfWeek < 0 || dayOfWeek > 4;

  // Sessions already linked to each requirement drive the "scheduled n/m" counter.
  const linked = new Map();
  for (const s of sessions) {
    const id = s.studentProgramId ?? s.student_program_id;
    if (id != null) linked.set(id, (linked.get(id) ?? 0) + 1);
  }
  const linkedCount = id => linked.get(id) ?? 0;

  const pending = studentPrograms.filter(sp =>
    sp.status !== 'cancelled' && sp.status !== 'completed' && linkedCount(sp.id) < (sp.sessions_per_week || 1)
  );

  const studentName = id => students.find(s => Number(s.id) === Number(id))?.name ?? `Student #${id}`;
  const programName = id => programs.find(p => p.id === Number(id))?.name ?? `Program #${id}`;
  const dayChips = id => [...new Set(studentAvailability
    .filter(a => Number(a.student_id) === Number(id) && a.is_active !== false)
    .map(a => a.day_of_week))].sort((a, b) => a - b);

  const selected = selectedIds.filter(id => pending.some(sp => sp.id === id));
  const allSelected = pending.length > 0 && selected.length === pending.length;
  const toggle = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(allSelected ? [] : pending.map(sp => sp.id));

  const run = async (ids) => {
    setRunning(true);
    const result = await smartSchedule({
      scope,
      sessionDate: selectedDateISO,
      ...(scope === 'selected-day' ? { dayOfWeek } : {}),
      ...(ids ? { studentProgramIds: ids } : {}),
    });
    setRunning(false);
    setLastRun(result);
    if (!result.success) notify(result.error || 'Auto-scheduler failed to run', 'error');
    else if (!result.scheduled?.length) notify('Auto-scheduler: nothing scheduled', 'info');
    else notify(`Scheduled ${result.scheduled.length} session${result.scheduled.length === 1 ? '' : 's'}`);
  };

  const blocked = running || (scope === 'selected-day' && isWeekend);
  const unscheduled = lastRun?.unscheduled
    ? [...new Map(lastRun.unscheduled.map(u => [`${u.studentId}|${u.reason}`, u])).values()]
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ps-ink-1 flex items-center gap-2">
            <CalendarClock size={18} className="text-ps-ink-2" /> Pending requirements
          </h2>
          <p className="text-xs text-ps-ink-2 font-medium mt-0.5">
            {pending.length} awaiting sessions · whole week spreads them across Mon–Fri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-ps-bg rounded-xl p-1 gap-1" role="group" aria-label="Scheduling scope">
            {[['whole-week', 'Whole week'], ['selected-day', 'This day only']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                aria-pressed={scope === key}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  scope === key ? 'bg-ps-surface text-ps-ink-1 shadow-sm' : 'text-ps-ink-2 hover:text-ps-ink-1')}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => run(selected)} disabled={blocked || selected.length === 0} className={primaryBtn}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Schedule selected ({selected.length})
          </button>
          <button type="button" onClick={() => run()} disabled={blocked || pending.length === 0} className={ghostBtn}>
            <CalendarCheck size={16} /> Schedule all pending
          </button>
        </div>
      </div>

      {scope === 'selected-day' && isWeekend && (
        <p className="text-xs font-medium text-ps-warn">Mon–Fri only — pick a weekday to schedule just one day.</p>
      )}

      {pending.length === 0 ? (
        <div className="p-8 text-center bg-ps-surface border border-dashed border-ps-border rounded-2xl">
          <p className="text-sm font-semibold text-ps-ink-1">No pending requirements</p>
          <p className="text-xs text-ps-ink-2 font-medium mt-1">Every requirement has its weekly sessions. Add one below to schedule more.</p>
        </div>
      ) : (
        <div className="bg-ps-surface border border-ps-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Pending student requirements</caption>
            <thead>
              <tr className="text-left text-xs font-medium text-ps-ink-2 border-b border-ps-border">
                <th scope="col" className="px-3 py-2.5 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all pending requirements" className="accent-ps-primary" />
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">Student</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Program</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Scheduled</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Priority</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Teacher</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Availability</th>
                <th scope="col" className="px-3 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(sp => {
                const days = dayChips(sp.student_id);
                return (
                  <tr key={sp.id} className="border-b border-ps-border/60 last:border-0">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.includes(sp.id)} onChange={() => toggle(sp.id)}
                        aria-label={`Select ${studentName(sp.student_id)} — ${programName(sp.program_id)}`} className="accent-ps-primary" />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-ps-ink-1">{studentName(sp.student_id)}</td>
                    <td className="px-3 py-2.5 font-medium text-ps-ink-2">{programName(sp.program_id)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-ps-ink-1">{linkedCount(sp.id)}/{sp.sessions_per_week || 1}</td>
                    <td className="px-3 py-2.5 tabular-nums text-ps-ink-2">{sp.priority ?? 5}</td>
                    <td className="px-3 py-2.5 text-ps-ink-2">{staff.find(p => p.id === sp.assigned_teacher_id)?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {days.length === 0 ? (
                        <span className="text-ps-ink-2">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {days.map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded-md bg-ps-bg border border-ps-border text-xs font-medium text-ps-ink-2">
                              {DAY_NAMES[d] ?? d}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" onClick={() => setAvailabilityFor({ id: sp.student_id, name: studentName(sp.student_id) })}
                        className="text-xs font-medium text-ps-accent hover:underline">Availability</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lastRun && (
        <div aria-live="polite" className="bg-ps-surface border border-ps-border rounded-2xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-ps-ink-1 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-ps-success" /> Last run
          </p>
          {lastRun.success ? (
            <>
              <p className="text-xs font-medium text-ps-ink-2">
                Scheduled: <span className="text-ps-ink-1 font-semibold">{lastRun.scheduled?.length ?? 0}</span>
                {' · '}Already scheduled: <span className="text-ps-ink-1 font-semibold">{lastRun.alreadyScheduled?.length ?? 0}</span>
              </p>
              {unscheduled.length > 0 && (
                <ul className="text-xs font-medium text-ps-ink-2 space-y-0.5 list-disc pl-4">
                  {unscheduled.map(u => (
                    <li key={`${u.studentId}-${u.reason}`}>{studentName(u.studentId)} — {u.reason}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-xs font-medium text-ps-danger">{lastRun.error || 'Scheduling failed'}</p>
          )}
        </div>
      )}

      <AddRequirementForm />

      {availabilityFor && (
        <AvailabilityEditor
          studentId={availabilityFor.id}
          studentName={availabilityFor.name}
          onClose={() => setAvailabilityFor(null)}
        />
      )}
    </div>
  );
};
