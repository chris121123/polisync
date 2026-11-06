import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, Loader2, Sparkles } from 'lucide-react';
import { AppModal, ModalHeader } from './AppModal.jsx';
import { useGlobalState } from '../context/GlobalStateContext.jsx';
import { commitAiPlan, proposeAiPlan } from '../lib/ai/client.js';
import { formatDateISO } from '../lib/dates.js';

const MAX_NOTE = 300;
const fieldClass = 'min-h-11 w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2 text-sm text-[var(--sa-text-primary)] focus:border-[var(--accent)]';

const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
const toggleId = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

const AbsenceList = ({ legend, options, selected, onToggle }) => (
  <fieldset className="min-w-0">
    <legend className="sa-label">{selected.length ? `${legend} · ${selected.length} selected` : legend}</legend>
    <div className="max-h-56 overflow-y-auto bg-[var(--surface-sunken)] p-1">
      {options.length === 0 && <p className="px-3 py-2 text-[11px] text-[var(--sa-text-muted)]">Nothing to pick</p>}
      {options.map(({ id, name }) => (
        <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 px-2 transition-colors hover:bg-[var(--surface-hover)]">
          <input
            type="checkbox"
            checked={selected.includes(id)}
            onChange={() => onToggle(id)}
            className="h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="min-w-0 truncate text-[13px] text-[var(--sa-text-primary)]">{name}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

const summaryWords = (mode, summary = {}) => (mode === 'base'
  ? `${summary.sessions ?? 0} sessions · ${summary.staff ?? 0} staff · ${summary.rooms ?? 0} rooms`
  : `${summary.changes ?? 0} changes · ${summary.moves ?? 0} moves · ${summary.substitutes ?? 0} substitutes · ${summary.cancels ?? 0} cancels · cap ${summary.cap ?? 0}`);

// The token is single-use and expires; the edge sends when, so say it before Apply fails.
const expiryWords = (expiresAt) => {
  if (!expiresAt) return '';
  const at = new Date(expiresAt);
  return Number.isNaN(at.getTime()) ? '' : ` · expires ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const AiPlanModal = ({ mode, onClose }) => {
  const { staff, students, rooms, appRole, notify } = useGlobalState();
  const isBase = mode === 'base';
  const [note, setNote] = useState('');
  const [dateISO, setDateISO] = useState(() => formatDateISO(new Date()));
  const [absences, setAbsences] = useState({ staffIds: [], studentIds: [], roomIds: [] });
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');
  const errorRef = useRef(null);

  // A failed propose/commit must be seen: on a phone the alert inserts below the
  // scroll position, so focus brings it into view (and screen readers to it).
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  // Absence ids go to the edge as-is; students and rooms are bigint, staff is a uuid.
  const staffOptions = staff.filter((person) => person.app_role !== 'parent').map((person) => ({ id: String(person.id), name: person.name })).sort(byName);
  const studentOptions = students.map((student) => ({ id: Number(student.id), name: student.name })).filter((option) => Number.isFinite(option.id)).sort(byName);
  const roomOptions = rooms.map((room) => ({ id: Number(room.id), name: room.name })).filter((option) => Number.isFinite(option.id)).sort(byName);
  const toggle = (key, id) => setAbsences((prev) => ({ ...prev, [key]: toggleId(prev[key], id) }));

  const propose = async () => {
    setBusy('propose');
    setError(null);
    setProposal(null);
    const instructions = note.trim() ? { instructions: note.trim() } : {};
    const body = isBase
      ? { mode: 'base', ...instructions }
      : { mode: 'repair', dateISO, absences, ...instructions };
    const { data, error: failure } = await proposeAiPlan(body);
    setBusy('');
    if (failure) setError(failure);
    else setProposal(data);
  };

  const apply = async () => {
    if (!proposal) return;
    setBusy('commit');
    setError(null);
    const { data, error: failure } = await commitAiPlan({ jobId: proposal.jobId, confirmToken: proposal.confirmToken });
    setBusy('');
    if (failure) {
      setError(failure);
      // The token is spent or expired; the same preview can never apply again.
      if (failure.code === 'CONFIRM_EXPIRED') setProposal(null);
      return;
    }
    const applied = data?.applied ?? 0;
    notify(`Applied ${applied} ${applied === 1 ? 'change' : 'changes'}`, 'success');
    onClose();
  };

  return (
    <AppModal
      isOpen
      onClose={busy ? undefined : onClose}
      labelledBy="ai_plan_title"
      describedBy="ai_plan_desc"
      maxWidth="max-w-xl"
      dismissible={!busy}
    >
      <ModalHeader
        titleId="ai_plan_title"
        eyebrow={isBase ? 'Base plan' : 'Daily repair'}
        title={isBase ? 'Generate base plan' : 'Repair a day'}
        onClose={busy ? undefined : onClose}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <p id="ai_plan_desc" className="text-sm text-[var(--sa-text-secondary)]">
          {isBase ? 'This inserts the weekly sessions for all pending programs.' : 'This changes/cancels sessions on the selected day and notifies staff.'}
        </p>

        <div className="mt-4 space-y-4">
          {!isBase && (
            <>
              <div>
                <label htmlFor="ai_plan_date" className="sa-label">Day</label>
                <input
                  id="ai_plan_date"
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className={`${fieldClass} tabular-nums`}
                  data-autofocus
                />
                <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">Scheduled school days only.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <AbsenceList legend="Staff unavailable" options={staffOptions} selected={absences.staffIds} onToggle={(id) => toggle('staffIds', id)} />
                <AbsenceList legend="Students unavailable" options={studentOptions} selected={absences.studentIds} onToggle={(id) => toggle('studentIds', id)} />
                <AbsenceList legend="Rooms unavailable" options={roomOptions} selected={absences.roomIds} onToggle={(id) => toggle('roomIds', id)} />
              </div>
            </>
          )}

          <div>
            <label htmlFor="ai_plan_note" className="sa-label">{isBase ? 'Instructions (optional)' : 'Note (optional)'}</label>
            <textarea
              id="ai_plan_note"
              rows={3}
              maxLength={MAX_NOTE}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isBase ? 'Keep mornings for speech therapy…' : 'Two therapists are out with flu…'}
              className={`${fieldClass} resize-none`}
              data-autofocus={isBase ? '' : undefined}
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--sa-text-muted)]">{note.length}/{MAX_NOTE}</p>
          </div>

          <button
            type="button"
            onClick={propose}
            disabled={busy !== '' || (!isBase && !dateISO)}
            className="sa-btn justify-center disabled:cursor-not-allowed"
          >
            {busy === 'propose' ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{busy === 'propose' ? 'Proposing…' : 'Propose'}</span>
          </button>

          {error && (
            <div ref={errorRef} tabIndex={-1} className="sa-alert sa-alert--danger" role="alert">
              <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="sa-mono break-words">{error.code} — {error.message}</p>
                {error.errors?.length > 0 && (
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px]">
                    {error.errors.map((item, index) => (
                      <li key={index} className="break-words">{item.code}: {item.message}</li>
                    ))}
                  </ul>
                )}
                {error.code === 'CONFIG_MISSING' && (
                  <div className="mt-2">
                    <p className="text-[13px] text-[var(--sa-text-primary)]">
                      {appRole === 'superadmin' ? 'AI is not configured — open AI Provider' : 'Ask your IT Manager to enable AI.'}
                    </p>
                    {appRole === 'superadmin' && (
                      <Link to="/admin/ai" className="sa-link mt-1 inline-flex min-h-9 items-center">
                        AI Provider <ArrowRight size={12} strokeWidth={1.5} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {proposal && (
            <section aria-label="Proposed changes">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
                <p className="sa-micro">Preview</p>
                <p className="text-[11px] tabular-nums text-[var(--sa-text-secondary)]">
                  {summaryWords(mode, proposal.summary)}{expiryWords(proposal.expiresAt)}
                </p>
              </div>
              {proposal.preview?.length ? (
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-[13px] text-[var(--sa-text-primary)]">
                  {proposal.preview.map((line, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="sa-marker" aria-hidden="true" />
                      <span className="min-w-0 break-words">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--sa-text-muted)]">Nothing to change.</p>
              )}
              {proposal.summary?.warnings?.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-[var(--sa-text-muted)]">
                  {proposal.summary.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
        <button type="button" onClick={onClose} disabled={busy !== ''} className="sa-btn flex-1 justify-center disabled:cursor-not-allowed">
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={!proposal || busy !== ''}
          className="sa-btn sa-btn--primary flex-1 justify-center disabled:cursor-not-allowed"
        >
          {busy === 'commit' ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{busy === 'commit' ? 'Applying…' : 'Apply'}</span>
        </button>
      </div>
    </AppModal>
  );
};

const AiSchedulingPanel = () => {
  const [mode, setMode] = useState(null);

  return (
    <section className="sa-panel" aria-labelledby="ai_scheduling_title">
      <div className="sa-panel-head">
        <div className="min-w-0">
          <h2 id="ai_scheduling_title" className="sa-panel-title">AI scheduling</h2>
          <p className="sa-panel-sub">Generate the weekly base plan or repair one day — every run is previewed before it writes.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="sa-micro">Base plan</p>
          <p className="mt-1 text-[13px] text-[var(--sa-text-secondary)]">Lays out the weekly template for every pending program.</p>
          <button type="button" onClick={() => setMode('base')} className="sa-btn sa-btn--primary mt-3">
            <Sparkles size={14} strokeWidth={1.5} /> Generate base plan
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="sa-micro">Daily repair</p>
          <p className="mt-1 text-[13px] text-[var(--sa-text-secondary)]">Fixes one day around absences, without rebuilding the week.</p>
          <button type="button" onClick={() => setMode('repair')} className="sa-btn mt-3">
            <CalendarClock size={14} strokeWidth={1.5} /> Repair a day
          </button>
        </div>
      </div>

      {mode && <AiPlanModal mode={mode} onClose={() => setMode(null)} />}
    </section>
  );
};

export default AiSchedulingPanel;
