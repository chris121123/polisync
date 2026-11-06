import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Download, FileBarChart, Loader2 } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import ItxSelect from '../../components/ItxSelect';
import { generateAiReport } from '../../lib/ai/client.js';
import { formatDateISO } from '../../lib/dates.js';

const KINDS = [
  ['audit', 'Audit'],
  ['usage', 'Usage'],
  ['schedule-health', 'Schedule health'],
];

const KIND_LABELS = Object.fromEntries(KINDS);
const fieldClass = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 text-[var(--sa-text-primary)]';

const shiftDays = (iso, days) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
};

// Last 30 days, inclusive of today.
const defaultRange = () => {
  const to = formatDateISO();
  return { from: shiftDays(to, -29), to };
};

const formatValue = (metric) => {
  const value = Number.isFinite(metric?.value) ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
  if (!metric?.unit) return value;
  if (metric.unit === '%') return `${value}%`;
  // "1 pairs" reads as a bug; a single unit loses its plural s.
  const unit = metric.value === 1
    ? ({ entries: 'entry', people: 'person' }[metric.unit] ?? (metric.unit.endsWith('s') ? metric.unit.slice(0, -1) : metric.unit))
    : metric.unit;
  return `${value} ${unit}`;
};

const downloadReport = async ({ result, kind, from, to }) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();

  const metricRows = [
    ['Metric', 'Value', 'Unit', 'Source'],
    ...result.metrics.map((metric) => [metric.label, metric.value, metric.unit ?? '', metric.source]),
  ];
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricRows);
  metricsSheet['!cols'] = [{ wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 32 }];

  const briefRows = [
    ['Field', 'Value'],
    ['Kind', KIND_LABELS[kind] || kind],
    ['From', from],
    ['To', to],
    ['Generated', result.meta?.generatedAt ?? ''],
    ['Warnings', (result.warnings || []).join(' ') || 'None'],
    ['Narrative', result.narrative || ''],
  ];
  const briefSheet = XLSX.utils.aoa_to_sheet(briefRows);
  briefSheet['!cols'] = [{ wch: 14 }, { wch: 110 }];

  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Metrics');
  XLSX.utils.book_append_sheet(workbook, briefSheet, 'Brief');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `polisync-report-${kind}-${formatDateISO()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The download reads the blob after the click; revoking in the same tick breaks Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const MetricRow = ({ metric }) => (
  <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-t border-[var(--sa-line-row)] px-4 py-2 md:grid-cols-[minmax(0,1fr)_140px_210px] md:items-center">
    <span className="min-w-0 break-words text-[13px] text-[var(--sa-text-primary)]">{metric.label}</span>
    <span className="whitespace-nowrap text-right text-[13px] tabular-nums text-[var(--sa-text-primary)]">
      {formatValue(metric)}
    </span>
    <span className="col-span-2 break-words text-xs text-[var(--sa-text-muted)] md:col-span-1 md:text-right">
      {metric.source}
    </span>
  </div>
);

const ReportsPage = () => {
  const { appRole } = useGlobalState();
  const [{ from: initialFrom, to: initialTo }] = useState(defaultRange);

  const [kind, setKind] = useState('audit');
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: failure } = await generateAiReport({ kind, from, to });
    setLoading(false);
    if (failure) setError(failure);
    else setResult(data);
  };

  const exportExcel = async () => {
    if (!result || exporting) return;
    setExporting(true);
    try {
      // Export what is on screen, not what the controls currently say.
      await downloadReport({
        result,
        kind: result.meta?.kind || kind,
        from: result.meta?.from || from,
        to: result.meta?.to || to,
      });
    } catch (failure) {
      setError({ code: 'EXPORT_FAILED', message: failure?.message || 'Could not build the workbook' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4">
        <h1 className="sa-title">Reports</h1>
        <p className="sa-sub">Audit, usage, and schedule health — metrics first, AI prose second.</p>
      </div>

      <section className="sa-panel min-w-0" aria-label="Report settings">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[220px_170px_170px_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="report-kind" className="sa-label">Kind</label>
            <ItxSelect
              id="report-kind"
              value={kind}
              onChange={setKind}
              options={KINDS.map(([value, label]) => ({ value, label }))}
              className={fieldClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="report-from" className="sa-label">From</label>
            <input
              id="report-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="report-to" className="sa-label">To</label>
            <input
              id="report-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="sa-btn sa-btn--primary justify-center disabled:cursor-not-allowed lg:w-44 lg:justify-self-end"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>{loading ? 'Generating…' : 'Generate'}</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--sa-text-muted)]">
          Every metric is computed from the database; the model writes the brief around those totals only.
          Ranges up to 366 days.
        </p>
      </section>

      {error && (
        <div role="alert" className="sa-alert sa-alert--danger">
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="sa-mono break-words">{error.code} — {error.message}</p>
            {error.code === 'CONFIG_MISSING' && (
              appRole === 'superadmin' ? (
                <Link to="/admin/ai" className="sa-link mt-1 py-1">
                  Open AI Provider <ArrowRight size={12} strokeWidth={1.5} />
                </Link>
              ) : (
                <p className="mt-1 text-xs text-[var(--sa-text-muted)]">
                  Ask your IT Manager to enable Reports on the AI Provider page.
                </p>
              )
            )}
          </div>
        </div>
      )}

      {loading && !result && (
        <p className="text-[13px] text-[var(--sa-text-muted)]" aria-live="polite">
          Reading the database and writing the brief…
        </p>
      )}

      {!result && !loading && !error && (
        <div className="sa-panel sa-empty itx-empty-card min-h-40 flex flex-col items-center justify-center">
          <FileBarChart size={20} strokeWidth={1.5} className="mb-3 text-[var(--sa-text-muted)]" />
          <p className="sa-empty-title">No report yet</p>
          <p className="sa-empty-sub">Pick a kind and a range, then Generate. Nothing is invented to fill the page.</p>
        </div>
      )}

      {result && (
        <>
          <section className="sa-panel min-w-0" aria-label="Report metrics">
            <div className="sa-panel-head">
              <div>
                <h2 className="sa-panel-title">Metrics</h2>
                <p className="sa-panel-sub">
                  {KIND_LABELS[result.meta?.kind] || KIND_LABELS[kind]} · {result.metrics?.length ?? 0} values · {result.meta?.from} to {result.meta?.to} · computed in the edge
                </p>
              </div>
              <button
                type="button"
                onClick={exportExcel}
                disabled={exporting}
                className="sa-btn shrink-0 justify-center whitespace-nowrap disabled:cursor-not-allowed"
              >
                <Download size={14} strokeWidth={1.5} />
                <span>{exporting ? 'Exporting…' : 'Export Excel'}</span>
              </button>
            </div>

            {result.meta?.note && (
              <p className="mt-3 text-xs text-[var(--sa-text-muted)]">{result.meta.note}</p>
            )}
            {result.meta?.truncated && (
              <p className="mt-1 text-xs sa-t-warm">
                This range hit the 20,000-row scan cap — later rows are not counted.
              </p>
            )}

            <div className="mt-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_210px] gap-x-3 px-4 py-2 md:grid">
                <span className="sa-micro">Metric</span>
                <span className="sa-micro text-right">Value</span>
                <span className="sa-micro text-right">Source</span>
              </div>
              {(result.metrics || []).map((metric) => <MetricRow key={metric.id} metric={metric} />)}
              {(result.metrics || []).length === 0 && (
                <p className="px-4 py-6 text-center text-[13px] text-[var(--sa-text-muted)]">
                  No rows in this range.
                </p>
              )}
            </div>
          </section>

          <section className="sa-panel min-w-0" aria-label="AI brief">
            <div className="sa-panel-head">
              <div>
                <h2 className="sa-panel-title">AI brief</h2>
                <p className="sa-panel-sub">Generated text — commentary around the numbers above</p>
              </div>
              <span className="sa-badge">AI generated</span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--sa-text-primary)]">
              {result.narrative || 'The model returned no prose for this report.'}
            </p>

            {result.warnings?.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs sa-t-warm">
                {result.warnings.map((warning, index) => <li key={index} className="break-words">{warning}</li>)}
              </ul>
            )}

            <p className="mt-5 text-xs text-[var(--sa-text-muted)]">
              Generated from the metrics above; unknown numbers are replaced.
            </p>
          </section>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
