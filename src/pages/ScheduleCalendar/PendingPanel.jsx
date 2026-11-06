import { useState } from 'react';
import { CalendarCheck, CalendarClock, CheckCircle2, Loader2, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AddRequirementForm } from './AddRequirementForm.jsx';
import { AvailabilityEditor } from './AvailabilityEditor.jsx';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const primaryBtn = 'sa-btn sa-btn--primary';
const ghostBtn = 'sa-btn';

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
          <h2 className="sa-panel-title flex items-center gap-2">
            <CalendarClock size={16} strokeWidth={1.5} className="sa-t-muted" /> Pending requirements
          </h2>
          <p className="sa-panel-sub">
            {pending.length} awaiting sessions · whole week spreads them across Mon–Fri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center" role="group" aria-label="Scheduling scope">
            {[['whole-week', 'Whole week'], ['selected-day', 'This day only']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                aria-pressed={scope === key}
                className={clsx('itx-tab', scope === key && 'is-active')}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => run(selected)} disabled={blocked || selected.length === 0} className={primaryBtn}>
            {running ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Zap size={16} strokeWidth={1.5} />}
            Schedule selected ({selected.length})
          </button>
          <button type="button" onClick={() => run()} disabled={blocked || pending.length === 0} className={ghostBtn}>
            <CalendarCheck size={16} strokeWidth={1.5} /> Schedule all pending
          </button>
        </div>
      </div>

      {scope === 'selected-day' && isWeekend && (
        <p className="text-[11px] sa-t-warm">Mon–Fri only — pick a weekday to schedule just one day.</p>
      )}

      {pending.length === 0 ? (
        <div className="sa-empty">
          <p className="sa-empty-title">No pending requirements</p>
          <p className="sa-empty-sub">Every requirement has its weekly sessions. Add one below to schedule more.</p>
        </div>
      ) : (
        <div className="itx-card overflow-x-auto">
          <table className="itx-table text-left">
            <caption className="sr-only">Pending student requirements</caption>
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all pending requirements" />
                </th>
                <th scope="col">Student</th>
                <th scope="col">Program</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Priority</th>
                <th scope="col">Teacher</th>
                <th scope="col">Availability</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(sp => {
                const days = dayChips(sp.student_id);
                const teacher = staff.find(p => p.id === sp.assigned_teacher_id)?.name ?? '—';
                return (
                  <tr key={sp.id} className={clsx(selected.includes(sp.id) && 'itx-selected')}>
                    <td data-mobile="role">
                      <input type="checkbox" checked={selected.includes(sp.id)} onChange={() => toggle(sp.id)}
                        aria-label={`Select ${studentName(sp.student_id)} — ${programName(sp.program_id)}`} />
                    </td>
                    <td data-mobile="title" className="text-[var(--sa-text-primary)]">{studentName(sp.student_id)}</td>
                    <td data-mobile="meta" className="text-[var(--sa-text-muted)]">{programName(sp.program_id)}</td>
                    <td data-mobile="meta" className="tabular-nums text-[var(--sa-text-primary)]">{linkedCount(sp.id)}/{sp.sessions_per_week || 1}</td>
                    <td data-mobile="hidden" className="tabular-nums text-[var(--sa-text-muted)]">{sp.priority ?? 5}</td>
                    <td data-mobile="hidden" className="text-[var(--sa-text-muted)]">{teacher}</td>
                    <td data-mobile="hidden">
                      {days.length === 0 ? (
                        <span className="text-[var(--sa-text-muted)]">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {days.map(d => (
                            <span key={d} className="sa-badge tabular-nums">
                              {DAY_NAMES[d] ?? d}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td data-mobile="action" className="text-right">
                      <button type="button" onClick={() => setAvailabilityFor({ id: sp.student_id, name: studentName(sp.student_id) })}
                        className="sa-link">Availability</button>
                    </td>
                    {/* Phones: priority, teacher and days keep their desktop columns and repeat here. */}
                    <td className="hidden text-[11px] leading-tight text-[var(--sa-text-muted)] max-sm:block">
                      Priority {sp.priority ?? 5} · {teacher} · {days.length === 0 ? 'No availability' : days.map(d => DAY_NAMES[d] ?? d).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lastRun && (
        <div aria-live="polite" className="sa-alert p-4 space-y-1.5">
          <p className="sa-micro flex items-center gap-2">
            <CheckCircle2 size={14} strokeWidth={1.5} className="text-[var(--sa-success)]" /> Last run
          </p>
          {lastRun.success ? (
            <>
              <p className="text-[11px] sa-t-muted">
                Scheduled: <span className="tabular-nums text-[var(--sa-text-primary)]">{lastRun.scheduled?.length ?? 0}</span>
                {' · '}Already scheduled: <span className="tabular-nums text-[var(--sa-text-primary)]">{lastRun.alreadyScheduled?.length ?? 0}</span>
              </p>
              {unscheduled.length > 0 && (
                <ul className="text-[11px] sa-t-muted space-y-0.5 list-disc pl-4">
                  {unscheduled.map(u => (
                    <li key={`${u.studentId}-${u.reason}`}>{studentName(u.studentId)} — {u.reason}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-[11px] sa-t-danger">{lastRun.error || 'Scheduling failed'}</p>
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
