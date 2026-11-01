import { useState } from 'react';
import { Loader2, Play, Zap } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import { formatDateISO } from '../../lib/dates.js';
import { dayOfWeekFor } from '../../lib/scheduling/time.js';

const fieldClass = 'w-full min-h-11 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm tabular-nums text-[var(--sa-text-primary)] focus:border-[var(--sa-gold)]';

// The unscheduled list shows eight rows; the rest are counted in one line.
const MAX_ROWS = 8;

export const SchedulerConsole = () => {
  const { smartSchedule, students } = useGlobalState();
  const [scope, setScope] = useState('whole-week');
  const [sessionDate, setSessionDate] = useState(() => formatDateISO());
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Weekends are closed for scheduling whatever the Mon=0 mapping says about Sunday.
  const weekend = [0, 6].includes(new Date(`${sessionDate}T00:00:00`).getDay());
  const blocked = running || !sessionDate || (scope === 'selected-day' && weekend);

  const run = async (dryRun) => {
    if (running || !sessionDate) return;
    setConfirmOpen(false);
    setRunning(true);
    try {
      const result = await smartSchedule({
        dryRun,
        scope,
        sessionDate,
        ...(scope === 'selected-day' ? { dayOfWeek: dayOfWeekFor(new Date(`${sessionDate}T00:00:00`)) } : {}),
      });
      setLastRun({ dryRun, result });
    } finally {
      // A rejected action must not leave the console locked in "Running…".
      setRunning(false);
    }
  };

  const result = lastRun?.result ?? {};
  const studentName = id => students.find(s => Number(s.id) === Number(id))?.name ?? `Student #${id}`;
  const unscheduled = result.unscheduled
    ? [...new Map(result.unscheduled.map(u => [`${u.studentId}|${u.reason}`, u])).values()]
    : [];
  const scheduledCount = result.scheduled?.length ?? 0;
  const emptyMatch = scheduledCount === 0 && unscheduled.length === 0;

  return (
    <section className="sa-panel min-w-0 space-y-5">
      <div className="sa-panel-head">
        <div>
          <h2 className="sa-panel-title">Scheduler console</h2>
          <p className="sa-panel-sub">Every pending requirement · whole week or one day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="sa-label" htmlFor="scheduler-scope">Scope</label>
          <select
            id="scheduler-scope"
            value={scope}
            onChange={e => setScope(e.target.value)}
            className={fieldClass}
          >
            <option value="whole-week">Whole week</option>
            <option value="selected-day">This day only</option>
          </select>
        </div>

        <div>
          <label className="sa-label" htmlFor="scheduler-date">Session date</label>
          <input
            id="scheduler-date"
            type="date"
            value={sessionDate}
            onChange={e => setSessionDate(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {scope === 'selected-day' && weekend && (
        <p className="text-[11px] sa-t-warm">Scheduling is Monday–Friday only</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={blocked}
          className="sa-btn sa-btn--primary min-h-11 flex-1 justify-center sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Play size={16} strokeWidth={1.5} />}
          <span>Dry run</span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={blocked}
          className="sa-btn min-h-11 flex-1 justify-center sm:flex-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap size={16} strokeWidth={1.5} />
          <span>Apply</span>
        </button>
        {running && <span role="status" className="text-[11px] sa-t-muted">Running…</span>}
      </div>

      <p className="text-[11px] sa-t-muted">Dry run previews the plan — Apply writes real sessions.</p>

      <div aria-live="polite">
        {lastRun && (
          <div className="border border-[var(--sa-line-default)] p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 text-[11px] sa-t-muted">Last run in this session — no history is stored</p>
              <span className="sa-badge shrink-0">{lastRun.dryRun ? 'Dry run' : 'Applied'}</span>
            </div>

            {result.success === false ? (
              <p className="text-[13px] sa-t-danger">{result.error || 'Scheduler failed'}</p>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-[var(--sa-line-hairline)] border border-[var(--sa-line-hairline)]">
                  {[
                    ['Score', result.score ?? '—'],
                    ['Sessions', scheduledCount],
                    ['Unmet', unscheduled.length],
                  ].map(([label, value]) => (
                    <div key={label} className="px-3 py-2.5">
                      <p className="sa-label">{label}</p>
                      <p className="tabular-nums text-2xl text-[var(--sa-text-primary)]">{value}</p>
                    </div>
                  ))}
                </div>

                {unscheduled.length > 0 && (
                  <ul className="sa-list text-[13px]">
                    {unscheduled.slice(0, MAX_ROWS).map(u => (
                      <li key={`${u.studentId}|${u.reason}`} className="py-2">
                        <span className="text-[var(--sa-text-primary)]">{studentName(u.studentId)}</span>
                        <span className="sa-t-muted"> — {u.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {unscheduled.length > MAX_ROWS && (
                  <p className="text-[11px] sa-t-muted">
                    Showing {MAX_ROWS} of {unscheduled.length}
                  </p>
                )}

                {emptyMatch && (
                  <p className="text-[13px] sa-t-muted">Nothing scheduled — no pending programs matched</p>
                )}

                {scheduledCount > 0 && unscheduled.length === 0 && (
                  <p className="text-[13px] sa-t-muted">All pending programs assigned</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AppModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        labelledBy="scheduler-apply-title"
        describedBy="scheduler-apply-desc"
        maxWidth="max-w-sm"
      >
        <ModalHeader
          titleId="scheduler-apply-title"
          title="Run the scheduler?"
          description={scope === 'selected-day' ? `This day only · ${sessionDate}` : `Whole week · from ${sessionDate}`}
          onClose={() => setConfirmOpen(false)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="border border-[var(--sa-danger)] p-3.5">
            <p id="scheduler-apply-desc" className="text-xs sa-t-danger leading-relaxed">
              Run the scheduler and create sessions for all pending programs? This writes real sessions.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button onClick={() => setConfirmOpen(false)} className="sa-btn flex-1 justify-center min-h-11">
            Cancel
          </button>
          <button
            onClick={() => run(false)}
            className="flex-1 min-h-11 border border-[var(--sa-danger)] text-[11px] uppercase tracking-[0.1em] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)]"
          >
            Run
          </button>
        </div>
      </AppModal>
    </section>
  );
};
