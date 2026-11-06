import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';
import { EDGE_FUNCTIONS } from '../../lib/edges';
import { toCsv } from '../../lib/csv';
import { formatDateISO } from '../../lib/dates';
import {
  COUNT_TABLES,
  fetchTableCounts,
  getRealtimeState,
  pingDatabase,
} from '../../state/systemHealth';

// The list keeps this session's last five pings, newest first.
const PING_HISTORY = 5;

// PostgREST returns at most 1,000 rows per select; the export walks the table
// in id order page by page, and refuses to loop past the cap.
const EXPORT_PAGE_SIZE = 1000;
const EXPORT_ROW_CAP = 20000;

const clock = (value) => {
  const d = new Date(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const countLabel = (value) => {
  if (value == null) return '—';
  return `${value} ${value === 1 ? 'row' : 'rows'}`;
};

// One row past the cap proves the table has more; an exact-cap table stays quiet.
const fetchAllRows = async (table) => {
  const rows = [];
  while (rows.length < EXPORT_ROW_CAP) {
    const from = rows.length;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + EXPORT_PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < EXPORT_PAGE_SIZE) break;
  }
  let truncated = false;
  if (rows.length >= EXPORT_ROW_CAP) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .order('id', { ascending: true })
      .range(EXPORT_ROW_CAP, EXPORT_ROW_CAP);
    if (error) throw error;
    truncated = (data?.length ?? 0) > 0;
  }
  return { rows, truncated };
};

const HealthPage = () => {
  const { notify } = useGlobalState();

  const [db, setDb] = useState({ status: 'checking', latency: null });
  const [pings, setPings] = useState([]);
  const [channel, setChannel] = useState(getRealtimeState);
  const [counts, setCounts] = useState(null);
  const [exporting, setExporting] = useState(null);

  const runPing = useCallback(async () => {
    setDb(prev => ({ ...prev, status: 'checking' }));
    const result = await pingDatabase();
    setDb(result);
    setPings(prev => [{ at: Date.now(), latency: result.latency }, ...prev].slice(0, PING_HISTORY));
  }, []);

  const loadCounts = useCallback(async () => {
    setCounts(null);
    setCounts(await fetchTableCounts(COUNT_TABLES.map(({ table }) => table)));
  }, []);

  useEffect(() => {
    runPing();
    loadCounts();
    // The provider subscribes to system-changes after this page mounts, so the
    // channel joins late; re-read it once instead of polling.
    const timer = setTimeout(() => setChannel(getRealtimeState()), 2000);
    return () => clearTimeout(timer);
  }, [runPing, loadCounts]);

  const exportTable = async (table, label) => {
    if (!supabase) {
      notify('No database client configured', 'error');
      return;
    }
    setExporting(table);
    try {
      const { rows, truncated } = await fetchAllRows(table);
      if (!rows.length) {
        notify(`No ${label.toLowerCase()} rows to export`, 'info');
        return;
      }
      // The BOM makes Excel read the file as UTF-8 instead of the system codepage.
      const url = URL.createObjectURL(new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `polisync-${table}-${formatDateISO()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      notify(`${label} exported — ${rows.length} rows`);
      // The cap is a stop, not a guarantee: say so instead of implying a full copy.
      if (truncated) {
        notify('Export stopped at the 20,000-row cap — later rows are not included.', 'error');
      }
    } catch (err) {
      notify(err.message || `Could not export ${label}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const statusLabel = db.status === 'checking' ? 'Checking' : db.status === 'online' ? 'Online' : 'Unverified';
  const channelTone = channel === 'joined'
    ? ' sa-dot--ok'
    : channel === 'errored' || channel === 'closed' ? ' sa-dot--error' : '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-page-entry">
      <div>
        <h1 className="sa-title">System Health</h1>
        <p className="sa-sub">Runtime checks, endpoints, and data exports.</p>
      </div>

      {/* ── Database Engine: status + session ping log ─────────────────── */}
      <section className="sa-panel min-w-0">
        <div className="sa-panel-head">
          <div>
            <h2 className="sa-panel-title">Database Engine</h2>
            <p className="sa-panel-sub">PostgREST reachability</p>
          </div>
          <button
            type="button"
            onClick={runPing}
            disabled={db.status === 'checking'}
            className="sa-btn disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            <span>{db.status === 'checking' ? 'Testing…' : 'Test connection'}</span>
          </button>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`sa-dot${db.status === 'online' ? ' sa-dot--ok' : ''}`} aria-hidden="true" />
            <p className="text-sm text-[var(--sa-text-primary)]" aria-live="polite">{statusLabel}</p>
            <p className="text-[13px] tabular-nums">{db.latency != null ? `${db.latency} ms` : '—'}</p>
          </div>
          <p className="mt-2 max-w-[60ch] text-xs text-[var(--sa-text-muted)]">
            Three trivial <span className="sa-mono">profiles</span> reads, averaged — a client round-trip, never a server metric.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
            <span className="sa-micro">Session pings</span>
            {pings.length === 0 ? (
              <span className="text-xs text-[var(--sa-text-muted)]">—</span>
            ) : pings.map((ping) => (
              <span key={ping.at} className="text-xs tabular-nums text-[var(--sa-text-muted)]">
                {clock(ping.at)} · {ping.latency != null ? `${ping.latency} ms` : '—'}
              </span>
            ))}
          </div>
          <span className="text-xs text-[var(--sa-text-muted)]">Session only — not stored.</span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Realtime ──────────────────────────────────────────────────── */}
        <section className="sa-panel min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Realtime</h2>
              <p className="sa-panel-sub">Change feed</p>
            </div>
          </div>

          <div className="mt-1 space-y-3">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--sa-text-secondary)]">Channel</span>
              <span className="sa-mono">system-changes</span>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--sa-text-secondary)]">State</span>
              <span className="flex items-center gap-2">
                <span className={`sa-dot${channelTone}`} aria-hidden="true" />
                <span className="text-[13px] capitalize text-[var(--sa-text-primary)]">{channel}</span>
              </span>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--sa-text-secondary)]">Events</span>
              <span className="text-[13px] text-[var(--sa-text-primary)]">Insert, update, delete</span>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--sa-text-secondary)]">Tables</span>
              <span className="text-[13px] tabular-nums text-[var(--sa-text-primary)]">4 app tables</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--sa-text-muted)]">
            Listens to app tables: sessions, profiles, students, notifications.
          </p>
        </section>

        {/* ── Edge Functions ────────────────────────────────────────────── */}
        <section className="sa-panel min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Edge Functions</h2>
              <p className="sa-panel-sub">Configured in this project</p>
            </div>
          </div>

          <div className="mt-1 space-y-3">
            {EDGE_FUNCTIONS.map((fn) => (
              <div key={fn} className="flex min-h-11 items-center justify-between gap-3">
                <span className="sa-mono">{fn}</span>
                <span className="sa-badge sa-badge--positive">configured</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-[var(--sa-text-muted)]">No health endpoint — static manifest.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Table Records ─────────────────────────────────────────────── */}
        <section className="sa-panel min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Table Records</h2>
              <p className="sa-panel-sub">Exact row counts</p>
            </div>
            <button type="button" onClick={loadCounts} className="sa-btn">
              <RefreshCw size={14} strokeWidth={1.5} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="mt-1 space-y-3">
            {COUNT_TABLES.map(({ table, label }) => (
              <div key={table} className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-[13px] text-[var(--sa-text-secondary)]">{label}</span>
                <span className="text-[13px] tabular-nums text-[var(--sa-text-primary)]">
                  {counts?.[table] ?? '—'}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-[var(--sa-text-muted)]">One head request per table.</p>
        </section>

        {/* ── Data & Export ─────────────────────────────────────────────── */}
        <section className="sa-panel min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Data &amp; Export</h2>
              <p className="sa-panel-sub">CSV snapshot of live rows</p>
            </div>
          </div>

          <div className="mt-1 space-y-3">
            {COUNT_TABLES.map(({ table, label }) => (
              <div key={table} className="flex min-h-11 items-center justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-[13px] text-[var(--sa-text-primary)]">{label}</span>
                  <span className="text-xs tabular-nums text-[var(--sa-text-muted)]">
                    {countLabel(counts?.[table])}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => exportTable(table, label)}
                  disabled={exporting === table}
                  aria-label={`Download CSV — ${label}`}
                  className="sa-link -mr-2 min-h-9 px-2 disabled:cursor-not-allowed"
                >
                  <Download size={14} strokeWidth={1.5} />
                  <span>{exporting === table ? 'Exporting…' : 'Download CSV'}</span>
                </button>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-[var(--sa-text-muted)]">
            Rows snapshot — no files, auth internals, or settings.
          </p>
          <p className="mt-1 text-xs text-[var(--sa-text-muted)]">
            Streams all rows in pages; stops at 20,000 with a warning.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HealthPage;
