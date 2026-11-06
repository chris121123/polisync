import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { AlertTriangle, ArrowRight, FileSpreadsheet, Image, Loader2 } from 'lucide-react';
import { AppModal, ModalHeader } from './AppModal.jsx';
import { useGlobalState } from '../context/GlobalStateContext.jsx';
import { supabase } from '../lib/supabase.js';
import {
  applyImportBatch,
  discardImportBatch,
  extractImportImage,
  resolveImportBatch,
  stageImportExcel,
  validateImportBatch,
} from '../lib/ai/client.js';
import { MAX_IMPORT_ROWS, dayLabel, formatHour, parseWorkbookBuffer } from '../lib/scheduleImport.js';

const PREVIEW_ROWS = 100;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const fieldClass = 'flex min-h-11 w-full items-center gap-2 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2 text-sm text-[var(--sa-text-primary)] hover:border-[var(--sa-line-strong)] focus-within:border-[var(--accent)]';
const stepClass = 'min-h-11 border px-3 text-xs transition-colors';
const PREVIEW_GRID = 'md:grid-cols-[44px_124px_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.15fr)_92px]';
const STATUS_WORDS = { matched: 'Matched', invalid: 'Needs a fix', pending: 'Pending', applied: 'Applied' };

// The token is single-use and expires; say when before Apply fails.
const expiryWords = (expiresAt) => {
  if (!expiresAt) return '';
  const at = new Date(expiresAt);
  return Number.isNaN(at.getTime()) ? '' : ` · expires ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const Cell = ({ label, children, className }) => (
  <div className={clsx('min-w-0', className)}>
    <span className="sa-micro mr-1 md:hidden">{label}</span>
    <span className="break-words text-[var(--sa-text-primary)]">{children}</span>
  </div>
);

const PreviewRow = ({ row }) => {
  const fields = row.fields || {};
  const start = formatHour(fields.startHour);
  const span = fields.startHour === null || fields.startHour === undefined ? 0 : Number(fields.span) || 0;
  const dayTime = [dayLabel(fields.dayOfWeek), start && span ? `${start}–${formatHour(Number(fields.startHour) + span)}` : start]
    .filter(Boolean)
    .join(' ');
  const status = row.status || 'pending';

  return (
    <li className="px-3 py-2">
      <div className={clsx('grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]', PREVIEW_GRID)}>
        <Cell label="Row" className="tabular-nums">#{row.rowNo}</Cell>
        <Cell label="Day" className="whitespace-nowrap tabular-nums">{dayTime || '—'}</Cell>
        <Cell label="Student">{fields.student || '—'}</Cell>
        <Cell label="Staff">{fields.staff || '—'}</Cell>
        <Cell label="Room">{fields.room || '—'}</Cell>
        <Cell label="Program">{fields.program || '—'}</Cell>
        <div className="min-w-0">
          <span className="sa-micro mr-1 md:hidden">Status</span>
          <span className={clsx('sa-badge', status === 'matched' ? 'sa-badge--positive' : status !== 'applied' && 'sa-badge--warn')}>
            {STATUS_WORDS[status] || status}
          </span>
        </div>
      </div>
      {row.errors?.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--sa-danger)]">
          {row.errors.map((item, index) => <li key={index} className="break-words">{item.message}</li>)}
        </ul>
      )}
    </li>
  );
};

const ScheduleImportWizard = ({ onClose }) => {
  const { user, appRole, notify } = useGlobalState();
  const [source, setSource] = useState('excel');
  const [excelName, setExcelName] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [consent, setConsent] = useState(false);
  // { id, kind, fileName, rowCount, truncated } — the staged batch awaiting Apply.
  const [batch, setBatch] = useState(null);
  const [preview, setPreview] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');
  const errorRef = useRef(null);

  // A failed step must be seen: focus moves the alert into view (and screen readers to it).
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const resolveBatch = async (batchId) => {
    setBusy('resolving');
    const { data, error: failure } = await resolveImportBatch(batchId);
    setBusy('');
    if (failure) setError(failure);
    else setPreview(data);
  };

  const startOver = async () => {
    if (batch) await discardImportBatch(batch.id);
    setBatch(null);
    setPreview(null);
    setValidation(null);
    setError(null);
    setExcelName('');
    setPhotoFile(null);
    setConsent(false);
  };

  const pickExcel = async (event) => {
    const file = event.target.files?.[0];
    // Re-picking the same file must fire change again.
    event.target.value = '';
    if (!file || busy) return;

    setError(null);
    setPreview(null);
    setValidation(null);
    setExcelName(file.name);
    setBusy('parsing');
    const { rows, truncated } = parseWorkbookBuffer(await file.arrayBuffer(), file.name);
    if (rows.length === 0) {
      setBusy('');
      setError({ code: 'EMPTY', message: 'No rows found on the first sheet of that workbook.' });
      return;
    }

    setBusy('staging');
    const { data, error: failure } = await stageImportExcel({ fileName: file.name, rows });
    if (failure) {
      setBusy('');
      setError(failure);
      return;
    }
    setBatch({ id: data.batchId, kind: 'excel', fileName: file.name, rowCount: data.rowCount, truncated });
    await resolveBatch(data.batchId);
  };

  const readPhoto = async () => {
    if (!photoFile || !consent || busy) return;
    setError(null);
    setPreview(null);
    setValidation(null);
    if (photoFile.size > MAX_PHOTO_BYTES) {
      setError({ code: 'TOO_LARGE', message: 'That photo is larger than 10 MB.' });
      return;
    }
    if (!supabase) {
      setError({ code: 'UNREACHABLE', message: 'No database client configured' });
      return;
    }

    const extension = photoFile.type === 'image/png' ? 'png' : 'jpg';
    const filePath = `ai-import/${user?.id}/${crypto.randomUUID()}.${extension}`;
    setBusy('uploading');
    const { error: uploadError } = await supabase.storage
      .from('requirements')
      .upload(filePath, photoFile, { contentType: photoFile.type });
    if (uploadError) {
      setBusy('');
      setError({ code: 'UPLOAD_FAILED', message: uploadError.message });
      return;
    }

    setBusy('extracting');
    const { data, error: failure } = await extractImportImage({ filePath, consent: true });
    if (failure) {
      setBusy('');
      setError(failure);
      return;
    }
    setBatch({ id: data.batchId, kind: 'vision', fileName: photoFile.name, rowCount: data.rowCount, truncated: false });
    await resolveBatch(data.batchId);
  };

  const validate = async () => {
    if (!batch || busy) return;
    setBusy('validating');
    setError(null);
    const { data, error: failure } = await validateImportBatch(batch.id);
    setBusy('');
    if (failure) {
      setError(failure);
      return;
    }
    // Validation re-checks the same rows: keep what was shown, take the fresh verdict.
    const verdicts = new Map((data.rows || []).map((row) => [row.rowNo, row]));
    setPreview((prev) => (prev
      ? {
        ...prev,
        rows: prev.rows.map((row) => ({
          ...row,
          status: verdicts.get(row.rowNo)?.status ?? row.status,
          errors: verdicts.get(row.rowNo)?.errors ?? row.errors,
        })),
      }
      : prev));
    setValidation({ token: data.confirmToken ?? null, expiresAt: data.expiresAt ?? null, summary: data.summary });
  };

  const apply = async () => {
    if (!batch || !validation?.token || busy) return;
    setBusy('applying');
    setError(null);
    const { data, error: failure } = await applyImportBatch({ batchId: batch.id, confirmToken: validation.token });
    setBusy('');
    if (failure) {
      // The token is spent or expired; the same preview can never apply again.
      if (failure.code === 'CONFIRM_EXPIRED') setValidation(null);
      setError(failure);
      return;
    }
    const applied = data?.applied ?? 0;
    notify(`Imported ${applied} ${applied === 1 ? 'session' : 'sessions'}`, 'success');
    onClose();
  };

  const discard = async () => {
    if (busy) return;
    if (!batch) {
      onClose();
      return;
    }
    setBusy('discarding');
    setError(null);
    const { error: failure } = await discardImportBatch(batch.id);
    setBusy('');
    if (failure) setError(failure);
    else onClose();
  };

  // Closing leaves no staged batch behind; the failure is not worth blocking the close.
  const close = () => {
    if (busy) return;
    if (batch) discardImportBatch(batch.id);
    onClose();
  };

  const summary = validation?.summary || preview?.summary;
  const staffCount = new Set((preview?.rows || []).map((row) => row.mapped?.therapistId).filter(Boolean)).size;
  const canApply = Boolean(validation?.token);

  return (
    <AppModal isOpen onClose={busy ? undefined : close} labelledBy="import_title" describedBy="import_desc" maxWidth="max-w-3xl" dismissible={!busy}>
      <ModalHeader
        titleId="import_title"
        eyebrow="Import"
        title="Import a schedule"
        onClose={busy ? undefined : close}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <p id="import_desc" className="text-sm text-[var(--sa-text-secondary)]">
          Excel rows are read in this browser and never uploaded. A photo is sent to the configured provider
          only after you consent.
        </p>

        <div className="mt-4 space-y-4">
          {/* Once rows are staged the file choice is done: the preview takes over. */}
          {!batch && (
            <>
              <div
                role="group"
                aria-label="Import from"
                className="grid grid-cols-2 gap-1 bg-[var(--surface-sunken)] p-1"
                style={{ borderRadius: 'var(--x-radius-control)' }}
              >
                {[['excel', 'Excel file', FileSpreadsheet], ['photo', 'Photo or scan', Image]].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={source === key}
                    disabled={busy !== ''}
                    onClick={() => setSource(key)}
                    className={clsx(
                      stepClass,
                      'inline-flex items-center justify-center gap-2',
                      source === key
                        ? 'border-[var(--line-subtle)] bg-[var(--surface)] text-[var(--ink-primary)]'
                        : 'border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-primary)]',
                      'disabled:cursor-not-allowed'
                    )}
                    style={{ borderRadius: 'var(--x-radius-menu)' }}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </button>
                ))}
              </div>

              {source === 'excel' ? (
                <div>
                  <label htmlFor="import_excel" className="sa-label">Workbook</label>
                  <label className={`${fieldClass} cursor-pointer`}>
                    <FileSpreadsheet size={16} strokeWidth={1.5} className="shrink-0 text-[var(--sa-text-muted)]" />
                    <span className="min-w-0 truncate">{excelName || 'Choose a file (.xlsx or .xls)'}</span>
                    <input
                      id="import_excel"
                      type="file"
                      accept=".xlsx,.xls"
                      className="sr-only"
                      disabled={busy !== ''}
                      onChange={pickExcel}
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">
                    Columns for day, start, end, student, staff, room and program are matched by header.
                    Up to {MAX_IMPORT_ROWS} rows per file.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="import_photo" className="sa-label">Photo or scan</label>
                    <label className={`${fieldClass} cursor-pointer`}>
                      <Image size={16} strokeWidth={1.5} className="shrink-0 text-[var(--sa-text-muted)]" />
                      <span className="min-w-0 truncate">{photoFile?.name || 'Choose a PNG or JPEG'}</span>
                      <input
                        id="import_photo"
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        disabled={busy !== ''}
                        onChange={(event) => {
                          setPhotoFile(event.target.files?.[0] || null);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 bg-[var(--surface-sunken)] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      disabled={busy !== ''}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 text-[13px] text-[var(--sa-text-secondary)]">
                      This image may contain names. I consent to sending it to the configured provider under
                      zero-data-retention for extraction.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={readPhoto}
                    disabled={!photoFile || !consent || busy !== ''}
                    className="sa-btn sa-btn--primary justify-center disabled:cursor-not-allowed"
                  >
                    {busy === 'uploading' || busy === 'extracting' ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{busy === 'uploading' ? 'Uploading…' : busy === 'extracting' ? 'Reading the photo…' : 'Read the photo'}</span>
                  </button>
                </div>
              )}
            </>
          )}

          {busy === 'parsing' && <p className="text-[13px] text-[var(--sa-text-muted)]">Reading the workbook…</p>}
          {busy === 'staging' && <p className="text-[13px] text-[var(--sa-text-muted)]">Staging the rows…</p>}
          {busy === 'resolving' && <p className="text-[13px] text-[var(--sa-text-muted)]">Matching names against the roster…</p>}

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
                {error.code === 'CONFIG_MISSING' && source === 'photo' && (
                  <div className="mt-2">
                    <p className="text-[13px] text-[var(--sa-text-primary)]">
                      Photo extraction is off — enable Extraction on /admin/ai
                    </p>
                    {appRole === 'superadmin' ? (
                      <Link to="/admin/ai" className="sa-link mt-1 inline-flex min-h-9 items-center">
                        Open AI Provider <ArrowRight size={12} strokeWidth={1.5} />
                      </Link>
                    ) : (
                      <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">Ask your IT Manager to enable it.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {preview && (
            <section aria-label="Staged rows">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
                <p className="sa-micro">Preview</p>
                <p className="text-[11px] tabular-nums text-[var(--sa-text-secondary)]">
                  {batch?.fileName} · {summary?.rows ?? 0} rows · {summary?.matched ?? 0} matched
                  {summary?.invalid ? ` · ${summary.invalid} not matched` : ''}
                </p>
              </div>

              {batch?.truncated && (
                <p className="mt-2 text-[11px] text-[var(--sa-text-muted)]">
                  Read the first {MAX_IMPORT_ROWS} rows of the sheet; the rest was not staged.
                </p>
              )}

              <div className="mt-2">
                <div className={clsx('hidden bg-[var(--surface-sunken)] px-3 py-2 md:grid md:gap-x-3', PREVIEW_GRID)}>
                  {['Row', 'Day', 'Student', 'Staff', 'Room', 'Program', 'Status'].map((label) => (
                    <span key={label} className="sa-micro">{label}</span>
                  ))}
                </div>
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {preview.rows.slice(0, PREVIEW_ROWS).map((row) => <PreviewRow key={row.rowNo} row={row} />)}
                </ul>
                {preview.rows.length > PREVIEW_ROWS && (
                  <p className="px-3 py-2 text-[11px] text-[var(--sa-text-muted)]">
                    Showing the first {PREVIEW_ROWS} of {preview.rows.length} rows.
                  </p>
                )}
              </div>

              {validation?.summary?.errors?.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[var(--sa-danger)]">
                  {validation.summary.errors.map((item, index) => (
                    <li key={index} className="break-words">{item.code}: {item.message}</li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={validate}
                  disabled={busy !== ''}
                  className="sa-btn justify-center disabled:cursor-not-allowed"
                >
                  {busy === 'validating' ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{busy === 'validating' ? 'Validating…' : 'Validate'}</span>
                </button>
                <p className="min-w-0 flex-1 text-[11px] text-[var(--sa-text-secondary)]">
                  {validation
                    ? (canApply
                      ? `Apply inserts ${summary?.matched ?? 0} ${summary?.matched === 1 ? 'session' : 'sessions'} and notifies ${staffCount} ${staffCount === 1 ? 'staff member' : 'staff members'}${expiryWords(validation.expiresAt)}`
                      : 'Nothing can be applied until every row is matched.')
                    : 'Checks times, rooms and staff against the current schedule. Nothing is written until you apply.'}
                </p>
                {validation && !canApply && (
                  <button type="button" onClick={startOver} disabled={busy !== ''} className="sa-link inline-flex min-h-9 items-center">
                    Start over
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3 px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={discard}
          disabled={busy !== ''}
          className="sa-btn flex-1 justify-center disabled:cursor-not-allowed"
        >
          {busy === 'discarding' ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{batch ? 'Discard' : 'Cancel'}</span>
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={!canApply || busy !== ''}
          className="sa-btn sa-btn--primary flex-1 justify-center disabled:cursor-not-allowed"
        >
          {busy === 'applying' ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{busy === 'applying' ? 'Applying…' : 'Apply'}</span>
        </button>
      </div>
    </AppModal>
  );
};

export default ScheduleImportWizard;
