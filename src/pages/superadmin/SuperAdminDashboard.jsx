import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChevronRight,
  Cpu,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { auditLine, formatAuditStamp } from '../../lib/auditLog';
import { supabase } from '../../lib/supabase';
import { getAiConfig } from '../../lib/ai/client';
import { ROLE_LABELS } from '../../lib/rolePalette';
import { EDGE_FUNCTIONS } from '../../lib/edges';
import { pingDatabase } from '../../state/systemHealth';
import { getAuditSeverity } from '../admin/userManagementConstants';

const ROLES = ['superadmin', 'admin', 'teacher', 'therapist', 'parent'];

const shortDate = (value) => value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

// The activity card matches the governance table's height at ≥sm: five rows fill it.
const useMinWidth = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};

const count = (value) => Number(value ?? 0).toLocaleString('en-US');

// ── Local KPI card ─────────────────────────────────────────────────────
// Mirrors the shared StatCard; separate only for the 32px lead value.
const KpiCard = ({ title, value, subtext, badge, badgeTone = '', icon: Icon, lead = false }) => (
  <div className="sa-panel">
    {/* Head rule comes from .sa-kpi-head in the base theme; this page is ITX, so the layout is inlined without the line. */}
    <div className="flex items-center gap-2 pb-2.5">
      <Icon size={16} strokeWidth={1.5} className="sa-kpi-icon" />
      <p className="sa-micro">{title}</p>
    </div>
    <p className={`${lead ? 'sa-kpi-value sa-kpi-value--lead' : 'sa-kpi-value'} tabular-nums`}>{value}</p>
    <div className="sa-kpi-foot">
      <p className="sa-kpi-sub">{subtext}</p>
      {badge && <span className={badgeTone ? `sa-badge sa-badge--${badgeTone}` : 'sa-badge'}>{badge}</span>}
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const { staff, fetchRecentAudit } = useGlobalState();
  const navigate = useNavigate();
  const wide = useMinWidth('(min-width: 640px)');

  const [audit, setAudit] = useState({ rows: [], loading: true });
  const [db, setDb] = useState({ status: 'checking', latency: null });
  const [ai, setAi] = useState({ status: 'loading', config: null });

  const refresh = useCallback(async () => {
    setAudit(prev => ({ ...prev, loading: true }));
    setDb({ status: 'checking', latency: null });

    await Promise.allSettled([
      (async () => {
        try {
          const { data, error } = await fetchRecentAudit({ limit: 500 });
          setAudit({ rows: !error && data ? data : [], loading: false });
        } catch {
          setAudit({ rows: [], loading: false });
        }
      })(),
      (async () => setDb(await pingDatabase()))(),
    ]);
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // One read of the AI provider state; a failure reads as "Not configured".
  useEffect(() => {
    let alive = true;
    getAiConfig().then(({ data, error }) => {
      if (!alive) return;
      setAi(error || !data ? { status: 'error', config: null } : { status: 'ready', config: data });
    });
    return () => { alive = false; };
  }, []);

  // ── Derived identity metrics ─────────────────────────────────────────
  const totalAccounts = staff.length;
  const activeAccounts = staff.filter(s => s.is_active !== false).length;
  const suspendedAccounts = staff.filter(s => s.is_active === false).length;
  const tempAccounts = staff.filter(s => s.must_change_password === true).length;

  const criticalCount = audit.rows.filter(log => getAuditSeverity(log.action) === 'critical').length;

  const roleRows = ROLES.map(role => {
    const rows = staff.filter(s => s.app_role === role);
    // "Provisioned" is the profile's real created_at; absent rows keep a dash.
    const provisioned = rows.map(s => s.created_at).filter(Boolean).sort().pop();
    return {
      role,
      label: ROLE_LABELS[role] ?? role,
      active: rows.filter(s => s.is_active !== false).length,
      suspended: rows.filter(s => s.is_active === false).length,
      temp: rows.filter(s => s.must_change_password === true).length,
      last: shortDate(provisioned),
    };
  });

  // ── Analytics (12d) ──────────────────────────────────────────────────
  // One 500-row audit array feeds the feed and both charts below.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const auditDays = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (13 - i));
    return { date, critical: 0, warn: 0, info: 0 };
  });
  const dayByStamp = new Map(auditDays.map((d, i) => [d.date.toDateString(), i]));
  audit.rows.forEach(log => {
    const i = dayByStamp.get(new Date(log.created_at).toDateString());
    if (i === undefined) return;
    auditDays[i][getAuditSeverity(log.action)] += 1;
  });

  const dayTotal = (d) => d.critical + d.warn + d.info;
  const dayPeak = Math.max(1, ...auditDays.map(dayTotal));
  const dayShort = (d) => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayLong = (d) => d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const hasActivity = auditDays.some(d => dayTotal(d) > 0);

  const actorCounts = new Map();
  audit.rows.forEach(log => {
    const { actor } = auditLine(log, staff);
    actorCounts.set(actor, (actorCounts.get(actor) ?? 0) + 1);
  });
  const topActors = [...actorCounts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);

  // Profiles with no created_at fall outside every bucket and stay uncounted.
  const monthRows = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      count: 0,
    };
  });
  const monthByKey = new Map(monthRows.map((m, i) => [m.key, i]));
  staff.forEach(s => {
    const at = new Date(s.created_at);
    if (Number.isNaN(at.getTime())) return;
    const i = monthByKey.get(`${at.getFullYear()}-${at.getMonth()}`);
    if (i !== undefined) monthRows[i].count += 1;
  });
  const monthPeak = Math.max(1, ...monthRows.map(m => m.count));

  // Stacked bar for one day, scaled to the busiest day in the window.
  const dayStack = (d) => {
    const total = dayTotal(d);
    if (!total) return [];
    const segments = [
      ['critical', d.critical, 'var(--chart-1)'],
      ['warn', d.warn, 'var(--chart-2)'],
      ['info', d.info, 'var(--chart-3)'],
    ].filter(([, n]) => n > 0);
    const barHeight = Math.max((total / dayPeak) * 98 - (segments.length - 1), 1);
    let y = 100;
    return segments.map(([key, n, fill]) => {
      const h = (n / total) * barHeight;
      y -= h;
      const rect = <rect key={key} x="0" y={y} width="10" height={h} fill={fill} />;
      y -= 1; // seam
      return rect;
    });
  };

  const dbLabel = db.status === 'checking' ? 'Checking' : db.status === 'online' ? 'Online' : 'Unverified';
  const dbSub = db.latency != null
    ? `${db.latency} ms round-trip`
    : supabase ? 'Ping pending' : 'No client configured';

  const aiTest = ai.config?.lastTest?.ok === true
    ? 'Reachable'
    : ai.config?.lastTest?.ok === false ? 'Unreachable' : 'Not tested';
  const aiLine = ai.status === 'loading'
    ? 'Checking…'
    : ai.status === 'error' || !ai.config
      ? 'Not configured'
      : [
        ai.config.enabled ? 'Enabled' : 'Disabled',
        aiTest,
        `${count(ai.config.usage?.tokensThisMonth)} / ${count(ai.config.monthlyTokenCap)} tokens`,
      ].join(' · ');

  const kpis = [
    {
      title: 'Database Engine',
      value: dbLabel,
      icon: Database,
      subtext: dbSub,
      badge: 'PostgREST',
    },
    {
      title: 'Identity & Access',
      value: totalAccounts,
      icon: Users,
      subtext: (
        <>
          <span className="whitespace-nowrap">{activeAccounts} active</span>
          {' '}
          <span className="whitespace-nowrap">· {suspendedAccounts} suspended</span>
        </>
      ),
      badge: `${tempAccounts} temp password`,
      badgeTone: tempAccounts > 0 ? 'warn' : 'positive',
      lead: true,
    },
    {
      title: 'Edge Functions',
      value: EDGE_FUNCTIONS.length,
      icon: Zap,
      subtext: <>Configured in <span className="whitespace-nowrap">this project</span></>,
      badge: 'Static manifest',
    },
    {
      title: 'Security State',
      value: criticalCount,
      icon: ShieldAlert,
      subtext: 'Critical events in recent audit',
      badge: criticalCount > 0 ? 'Review' : 'Clear',
      badgeTone: criticalCount > 0 ? 'warn' : 'positive',
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 animate-page-entry">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2">
        <div>
          <h1 className="sa-title">Platform Overview</h1>
          <p className="sa-sub">Infrastructure health, identity, and privilege telemetry.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refresh}
            className="sa-btn"
            aria-label="Refresh telemetry"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
            className="sa-btn sa-btn--primary"
          >
            <UserPlus size={16} strokeWidth={1.5} />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* ── Zone A: telemetry ────────────────────────────────────────── */}
      {/* Phone: divided label/value rows keep the first data section near the
          fold; the card grid starts at sm. Same four readings, same copy. */}
      <div className="sm:hidden sa-panel">
        {kpis.map(item => (
          <div key={item.title} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="sa-micro">{item.title}</p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{item.subtext}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[17px] leading-tight tabular-nums text-[var(--ink-primary)]">{item.value}</p>
              {item.badge && (
                <span className={`${item.badgeTone ? `sa-badge sa-badge--${item.badgeTone}` : 'sa-badge'} mt-0.5`}>{item.badge}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map(item => <KpiCard key={item.title} {...item} />)}
      </div>

      {/* ── Zone B + C: governance and recent activity ───────────────── */}
      {/* Split at xl: below it the 1/3 column falls under the app's own
          340px floor beside the 256px sidebar, so both panels stack. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Role Governance */}
        <section className="sa-panel xl:col-span-2 flex flex-col min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Role Governance</h2>
              <p className="sa-panel-sub">Accounts by access level</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="sa-link"
            >
              Inspect audit <ChevronRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          {/* Phone: two-line rows, all five fields kept (§12). */}
          <div className="sm:hidden flex-1 space-y-1">
            {roleRows.map(row => (
              <div key={row.role} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] text-[var(--sa-text-primary)]">{row.label}</p>
                  <p className="text-xs text-[var(--sa-text-muted)]">
                    Last provisioned <span className="tabular-nums text-[var(--sa-text-secondary)]">{row.last}</span>
                  </p>
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-[var(--sa-text-muted)]">
                  {row.active} active · {row.suspended} suspended · {row.temp} temp
                </p>
              </div>
            ))}
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:flex-col overflow-x-auto">
            <table className="w-full h-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--sa-line-row)]">
                  <th scope="col" className="py-2.5 pr-3">Role</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Active</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Suspended</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Temp password</th>
                  <th scope="col" className="py-2.5 pl-3">Last provisioned</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map(row => (
                  <tr key={row.role} className="border-b border-[var(--sa-line-row)] last:border-0">
                    <td className="py-3 pr-3 text-[var(--sa-text-primary)]">{row.label}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--sa-text-secondary)]">{row.active}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--sa-text-secondary)]">{row.suspended}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${row.temp > 0 ? 'sa-t-warm' : 'text-[var(--sa-text-secondary)]'}`}>{row.temp}</td>
                    <td className="pl-3 py-3 tabular-nums whitespace-nowrap text-[var(--sa-text-secondary)]">{row.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="sa-panel flex flex-col min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Recent Activity</h2>
              <p className="sa-panel-sub">Privileged actions</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="sa-link"
            >
              Full trail <ChevronRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          {audit.loading && audit.rows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin sa-t-muted" />
            </div>
          ) : audit.rows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 sa-empty mt-4">
              <Activity size={24} strokeWidth={1.5} className="sa-t-muted mb-2" />
              <p className="sa-empty-title">No administrative events recorded yet</p>
              <p className="sa-empty-sub">Actions like user creation and role changes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-1 flex-1 flex flex-col">
              {audit.rows.slice(0, wide ? 5 : 6).map(log => {
                const { action, actor, target } = auditLine(log, staff);
                const critical = getAuditSeverity(log.action) === 'critical';
                return (
                  <div key={log.id} className="sa-row flex-1">
                    <span
                      className={`sa-marker${critical ? ' sa-marker--danger' : ''}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="sa-row-title">
                        {action}
                        {target && <span className="sa-row-target"> → {target}</span>}
                      </p>
                      <p className="sa-row-meta">
                        {actor} · <span className="tabular-nums text-[var(--ink-muted)]">{formatAuditStamp(log.created_at)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Analytics (12d): one audit array, three readings ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Audit activity — last 14 days */}
        <section className="sa-panel xl:col-span-2 flex flex-col min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Audit activity</h2>
              <p className="sa-panel-sub">Last 14 days, from the most recent 500 audit rows</p>
            </div>
          </div>

          {audit.loading && audit.rows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin sa-t-muted" />
            </div>
          ) : !hasActivity ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 sa-empty mt-4">
              <Activity size={24} strokeWidth={1.5} className="sa-t-muted mb-2" />
              <p className="sa-empty-title">No activity in the last 14 days</p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                {auditDays.map((d, i) => (
                  <div key={d.date.toDateString()} className="flex flex-col items-center gap-1">
                    <span className="h-4 sa-micro tabular-nums">
                      {dayTotal(d)}
                    </span>
                    <svg
                      role="img"
                      aria-label={`${dayLong(d)}: ${d.critical} critical, ${d.warn} warning, ${d.info} information`}
                      viewBox="0 0 10 100"
                      preserveAspectRatio="none"
                      className="h-28 w-full block"
                    >
                      {dayStack(d)}
                    </svg>
                    <span className={`h-4 sa-micro tabular-nums whitespace-nowrap${i % 4 === 3 ? ' hidden sm:block' : ''}`}>
                      {i % 2 === 1 ? dayShort(d) : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {[
                  ['Critical', 'bg-[var(--chart-1)]'],
                  ['Warning', 'bg-[var(--chart-2)]'],
                  ['Information', 'bg-[var(--chart-3)]'],
                ].map(([label, tone]) => (
                  <span key={label} className="sa-micro flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 ${tone}`} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Privileged actors */}
        <section className="sa-panel flex flex-col min-w-0">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Privileged actors</h2>
              <p className="sa-panel-sub">Top five by action count, most recent 500 rows</p>
            </div>
          </div>

          {audit.loading && audit.rows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin sa-t-muted" />
            </div>
          ) : topActors.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 sa-empty mt-4">
              <ShieldAlert size={24} strokeWidth={1.5} className="sa-t-muted mb-2" />
              <p className="sa-empty-title">No privileged actions recorded</p>
            </div>
          ) : (
            <div className="space-y-1 flex-1 flex flex-col">
              {topActors.map(([actor, count]) => (
                <div key={actor} className="sa-row flex-1 items-center">
                  <p className="sa-row-title flex-1 min-w-0 truncate">{actor}</p>
                  <span className="shrink-0 text-[13px] tabular-nums text-[var(--sa-text-secondary)]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Identity growth — creation months, flat ink fills */}
      <section className="sa-panel min-w-0">
        <div className="sa-panel-head">
          <div>
            <h2 className="sa-panel-title">Identity growth</h2>
            <p className="sa-panel-sub">Profiles created per month, last six months</p>
          </div>
        </div>

        <div className="mt-2">
          {monthRows.map(m => (
            <div key={m.key} className="sa-bar-row">
              <span className="sa-bar-label">{m.label}</span>
              <div className="h-[5px] flex-1 bg-[var(--chart-grid)]">
                <div
                  className="h-full bg-[var(--chart-1)]"
                  style={{ width: `${(m.count / monthPeak) * 100}%` }}
                />
              </div>
              <span className="sa-bar-count tabular-nums">{m.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Zone D moved to /admin/health; this row is the way in. */}
      <button
        type="button"
        onClick={() => navigate('/admin/health')}
        className="sa-row group w-full px-4 text-left"
      >
        <Activity size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 sa-t-muted" />
        <div className="flex-1 min-w-0">
          <p className="sa-row-title">System Health</p>
          <p className="sa-row-meta">Connection, endpoints, and data exports</p>
        </div>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 sa-t-muted transition-colors group-hover:text-[var(--sa-text-primary)]"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        onClick={() => navigate('/admin/ai')}
        className="sa-row group w-full px-4 text-left"
      >
        <Cpu size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 sa-t-muted" />
        <div className="flex-1 min-w-0">
          <p className="sa-row-title">AI Provider</p>
          <p className="sa-row-meta">{aiLine}</p>
        </div>
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 sa-t-muted transition-colors group-hover:text-[var(--sa-text-primary)]"
          aria-hidden="true"
        />
      </button>

    </div>
  );
};

export default SuperAdminDashboard;
