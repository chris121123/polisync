import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  CalendarDays,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { auditLine } from '../../lib/auditLog';
import { ROLE_LABELS } from '../../lib/rolePalette';

const EDGE_FUNCTIONS = [
  'admin-create-user',
  'admin-delete-user',
  'auto-scheduler',
  'send-notification',
];

// ── Local KPI card ─────────────────────────────────────────────────────
// The shared StatCard belongs to AdminDashboard and must stay untouched
// (ADR-3), so the superadmin page renders its own card off the same data.
const KpiCard = ({ title, value, subtext, badge, badgeTone = '', icon: Icon, lead = false }) => (
  <div className="sa-panel sa-kpi">
    <div className="sa-kpi-head">
      <Icon size={16} strokeWidth={1.5} className="sa-kpi-icon" />
      <p className="sa-micro">{title}</p>
    </div>
    <p className={lead ? 'sa-kpi-value sa-kpi-value--lead' : 'sa-kpi-value'}>{value}</p>
    <div className="sa-kpi-foot">
      <p className="sa-kpi-sub">{subtext}</p>
      {badge && <span className={badgeTone ? `sa-badge sa-badge--${badgeTone}` : 'sa-badge'}>{badge}</span>}
    </div>
  </div>
);

// ── Connection Ping ────────────────────────────────────────────────────
function useConnectionStatus(checkConnection) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'ok' | 'error'
  useEffect(() => {
    let cancelled = false;
    checkConnection().then((ok) => {
      if (!cancelled) setStatus(ok ? 'ok' : 'error');
    });
    return () => { cancelled = true; };
    // Factory action is state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return status;
}

// ── Main Component ─────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const { staff, user, fetchRecentAudit, checkConnection } = useGlobalState();
  const navigate = useNavigate();
  const connStatus = useConnectionStatus(checkConnection);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Fetch last 10 audit events on mount
  const loadRecentAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await fetchRecentAudit(10);
      if (!error && data) setAuditLogs(data);
    } catch {
      // non-blocking
    } finally {
      setAuditLoading(false);
    }
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecentAudit();
  }, [loadRecentAudit]);

  // ── Derived account metrics ──────────────────────────────────────────
  const totalAccounts = staff.length;
  const activeAccounts = staff.filter(s => s.is_active !== false).length;
  const inactiveAccounts = staff.filter(s => s.is_active === false).length;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = staff.filter(s => {
    if (!s.created_at) return false;
    return new Date(s.created_at) > sevenDaysAgo;
  }).length;

  // ── Role distribution ────────────────────────────────────────────────
  const roleCounts = ['superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => ({
    role,
    count: staff.filter(s => s.app_role === role).length,
    label: ROLE_LABELS[role],
  }));
  const totalForDistribution = roleCounts.reduce((acc, r) => acc + r.count, 0) || 1;
  // Only the largest role's bar takes the gold accent (gold rationing).
  const topRole = roleCounts.reduce((top, r) => (r.count > top.count ? r : top), { count: -1 }).role;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6 animate-page-entry">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sa-rule-b">
        <div>
          <h1 className="sa-title">
            Platform Overview
          </h1>
          <p className="sa-sub">
            System administration and account governance
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
          className="sa-btn sa-btn--primary self-start sm:self-auto"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          <span>Create User</span>
        </button>
      </div>

      {/* ── Account Metric Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Accounts"
          value={totalAccounts}
          icon={Users}
          subtext="All registered platform users"
          badge={totalAccounts > 0 ? 'System-wide' : 'No accounts yet'}
          lead
        />
        <KpiCard
          title="Active Accounts"
          value={activeAccounts}
          icon={UserCheck}
          subtext={`${totalAccounts > 0 ? Math.round((activeAccounts / totalAccounts) * 100) : 0}% of all accounts`}
          badge="Online"
          badgeTone="positive"
        />
        <KpiCard
          title="Inactive Accounts"
          value={inactiveAccounts}
          icon={UserX}
          subtext={inactiveAccounts > 0 ? 'Deactivated by admin' : 'No inactive accounts'}
          badge={inactiveAccounts > 0 ? 'Suspended' : 'Clear'}
          badgeTone={inactiveAccounts > 0 ? 'warn' : 'positive'}
        />
        <KpiCard
          title="New This Week"
          value={newThisWeek}
          icon={CalendarDays}
          subtext="Accounts created in last 7 days"
          badge={newThisWeek > 0 ? 'Recent' : 'None'}
          badgeTone={newThisWeek > 0 ? 'positive' : ''}
        />
      </div>

      {/* ── Role Distribution ─────────────────────────────────────────── */}
      <div className="sa-panel">
        <div className="sa-panel-head">
          <div>
            <h2 className="sa-panel-title">Role Distribution</h2>
            <p className="sa-panel-sub">Breakdown of {totalAccounts} account{totalAccounts !== 1 ? 's' : ''} by access level</p>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            className="sa-link"
          >
            Manage <ChevronRight size={13} strokeWidth={1.5} />
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="sa-empty mt-4">
            <Users size={24} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
            <p className="sa-empty-title">No accounts yet</p>
          </div>
        ) : (
          <div>
            {roleCounts.filter(r => r.count > 0).map(({ role, count, label }) => {
              const pct = Math.round((count / totalForDistribution) * 100);
              return (
                <div key={role} className="sa-bar-row">
                  <span className="sa-bar-label">{label}</span>
                  <div className="sa-bar">
                    <div
                      className={role === topRole ? 'sa-bar-fill sa-bar-fill--accent' : 'sa-bar-fill'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="sa-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity + System Status ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">

        {/* Recent Administrative Activity */}
        <div className="lg:col-span-2 sa-panel flex flex-col">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">Recent Activity</h2>
              <p className="sa-panel-sub">Last administrative events</p>
            </div>
            <button
              onClick={() => navigate('/admin/users', { state: { tab: 'audit' } })}
              className="sa-link"
            >
              Full log <ArrowRight size={13} strokeWidth={1.5} />
            </button>
          </div>

          {auditLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin sa-t-muted" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 sa-empty mt-4">
              <Activity size={24} strokeWidth={1.5} className="sa-t-muted mb-2" />
              <p className="sa-empty-title">No administrative events recorded yet</p>
              <p className="sa-empty-sub">Actions like user creation and role changes will appear here.</p>
            </div>
          ) : (
            <div className="sa-list flex-1">
              {auditLogs.map(log => {
                const { action, actor, target } = auditLine(log, staff);
                const isDestructive = log.action?.includes('delete') || log.action?.includes('deactivate');
                const isCreative = log.action?.includes('create') || log.action?.includes('activate');
                return (
                  <div key={log.id} className="sa-row">
                    <span
                      className={`sa-marker${isDestructive ? ' sa-marker--danger' : isCreative ? ' sa-marker--creative' : ''}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="sa-row-title">
                        {action}
                        {target && <span className="sa-row-target"> → {target}</span>}
                      </p>
                      <p className="sa-row-meta">
                        {actor} · {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div>
              <h2 className="sa-panel-title">System Status</h2>
              <p className="sa-panel-sub">Platform connectivity and services</p>
            </div>
          </div>

          <div className="sa-sections">
            {/* Supabase Connection */}
            <div>
              <div className="flex items-center justify-between">
                <p className="sa-row-title">Supabase Connection</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`sa-dot${connStatus === 'ok' ? ' sa-dot--ok' : connStatus === 'error' ? ' sa-dot--error' : ''}`} />
                <span className={
                  connStatus === 'idle' ? 'sa-micro sa-t-muted' :
                  connStatus === 'ok' ? 'sa-micro sa-t-warm' :
                  'sa-micro sa-t-danger'
                }>
                  {connStatus === 'idle' ? 'Verifying...' :
                   connStatus === 'ok' ? 'Connected and live' :
                   'Connection could not be verified'}
                </span>
              </div>
            </div>

            {/* Active Session */}
            <div>
              <div className="flex items-center justify-between">
                <p className="sa-row-title">Active Session</p>
                <CheckCircle2 size={14} strokeWidth={1.5} className="sa-t-warm" />
              </div>
              <p className="sa-row-meta truncate">{user?.email || '—'}</p>
              <span className="sa-badge sa-t-warm inline-flex items-center gap-1 mt-2">
                <Shield size={11} strokeWidth={1.5} /> Super Administrator
              </span>
            </div>

            {/* Edge Functions */}
            <div>
              <div className="flex items-center justify-between">
                <p className="sa-row-title">Edge Functions</p>
                <Zap size={14} strokeWidth={1.5} className="sa-t-muted" />
              </div>
              <div className="space-y-1.5 mt-2">
                {EDGE_FUNCTIONS.map(fn => (
                  <div key={fn} className="flex items-center gap-2">
                    <span className="sa-dot sa-dot--ok" />
                    <span className="sa-mono">{fn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SuperAdminDashboard;
