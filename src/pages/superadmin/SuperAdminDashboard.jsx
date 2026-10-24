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
  Clock,
  ArrowRight,
  ChevronRight,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  Loader2,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';
import { auditLine } from '../../lib/auditLog';
import { StatCard } from '../admin/AdminDashboard';

// ── Role accent map ────────────────────────────────────────────────────
const ROLE_COLORS = {
  superadmin: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-600/10', dot: 'bg-violet-600 dark:bg-violet-400' },
  admin:      { text: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-600/10',   dot: 'bg-amber-600 dark:bg-amber-400' },
  teacher:    { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-600/10',  dot: 'bg-indigo-600 dark:bg-indigo-400' },
  therapist:  { text: 'text-teal-600 dark:text-teal-400',     bg: 'bg-teal-600/10',    dot: 'bg-teal-600 dark:bg-teal-400' },
  parent:     { text: 'text-pink-600 dark:text-pink-400',     bg: 'bg-pink-600/10',    dot: 'bg-pink-600 dark:bg-pink-400' },
};

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  teacher: 'Teacher',
  therapist: 'Therapist',
  parent: 'Parent',
};

const EDGE_FUNCTIONS = [
  'admin-create-user',
  'admin-delete-user',
  'auto-scheduler',
  'send-notification',
];

// ── Connection Ping ────────────────────────────────────────────────────
function useConnectionStatus() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'ok' | 'error'
  useEffect(() => {
    if (!supabase) {
      setTimeout(() => setStatus('error'), 0);
      return;
    }
    supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .then(({ error }) => setStatus(error ? 'error' : 'ok'))
      .catch(() => setStatus('error'));
  }, []);
  return status;
}

// ── Main Component ─────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const { staff, user } = useGlobalState();
  const navigate = useNavigate();
  const connStatus = useConnectionStatus();

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Fetch last 10 audit events on mount
  const fetchRecentAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) setAuditLogs(data);
    } catch {
      // non-blocking
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentAudit();
  }, [fetchRecentAudit]);

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
    colors: ROLE_COLORS[role],
  }));
  const totalForDistribution = roleCounts.reduce((acc, r) => acc + r.count, 0) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ps-border/60">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ps-ink-1 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs text-ps-ink-2 font-medium mt-0.5">
            System administration and account governance
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/users', { state: { openCreate: true } })}
          className="flex items-center gap-2 bg-ps-primary hover:opacity-90 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm self-start sm:self-auto"
        >
          <UserPlus size={16} strokeWidth={2} />
          <span>Create User</span>
        </button>
      </div>

      {/* ── Account Metric Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Accounts"
          value={totalAccounts}
          icon={Users}
          subtext="All registered platform users"
          badge={totalAccounts > 0 ? 'System-wide' : 'No accounts yet'}
          badgeColor="bg-ps-bg text-ps-ink-2 border border-ps-border"
        />
        <StatCard
          title="Active Accounts"
          value={activeAccounts}
          icon={UserCheck}
          subtext={`${totalAccounts > 0 ? Math.round((activeAccounts / totalAccounts) * 100) : 0}% of all accounts`}
          badge="Online"
          badgeColor="bg-ps-success/10 text-ps-success"
        />
        <StatCard
          title="Inactive Accounts"
          value={inactiveAccounts}
          icon={UserX}
          subtext={inactiveAccounts > 0 ? 'Deactivated by admin' : 'No inactive accounts'}
          badge={inactiveAccounts > 0 ? 'Suspended' : 'Clear'}
          badgeColor={inactiveAccounts > 0 ? 'bg-ps-warn/10 text-ps-warn' : 'bg-ps-success/10 text-ps-success'}
        />
        <StatCard
          title="New This Week"
          value={newThisWeek}
          icon={CalendarDays}
          subtext="Accounts created in last 7 days"
          badge={newThisWeek > 0 ? 'Recent' : 'None'}
          badgeColor={newThisWeek > 0 ? 'bg-ps-accent-soft text-ps-accent' : 'bg-ps-bg text-ps-ink-2 border border-ps-border'}
        />
      </div>

      {/* ── Role Distribution ─────────────────────────────────────────── */}
      <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-display font-semibold text-ps-ink-1">Role Distribution</h2>
            <p className="text-xs text-ps-ink-2 font-medium mt-0.5">Breakdown of {totalAccounts} account{totalAccounts !== 1 ? 's' : ''} by access level</p>
          </div>
          <button
            onClick={() => navigate('/admin/users')}
            className="text-xs font-medium text-ps-accent hover:underline flex items-center gap-1"
          >
            Manage <ChevronRight size={13} />
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="p-6 text-center text-ps-ink-2 border border-dashed border-ps-border rounded-xl bg-ps-bg/40">
            <Users size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No accounts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roleCounts.filter(r => r.count > 0).map(({ role, count, label, colors }) => {
              const pct = Math.round((count / totalForDistribution) * 100);
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 flex items-center gap-2">
                    <span className={clsx('w-2 h-2 rounded-full shrink-0', colors.dot)} />
                    <span className={clsx('text-xs font-semibold', colors.text)}>{label}</span>
                  </div>
                  <div className="flex-1 bg-ps-bg rounded-full h-2 overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', colors.dot)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-ps-ink-1 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Activity + System Status ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Administrative Activity */}
        <div className="lg:col-span-2 bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-ps-ink-1">Recent Activity</h2>
              <p className="text-xs text-ps-ink-2 font-medium mt-0.5">Last administrative events</p>
            </div>
            <button
              onClick={() => navigate('/admin/users', { state: { tab: 'audit' } })}
              className="flex items-center gap-1.5 py-1 text-xs font-semibold text-ps-accent hover:underline decoration-2 underline-offset-4"
            >
              Full log <ArrowRight size={13} />
            </button>
          </div>

          {auditLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-ps-ink-2" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 border border-dashed border-ps-border rounded-xl bg-ps-bg/40">
              <Activity size={24} className="text-ps-ink-2 opacity-40 mb-2" />
              <p className="text-sm font-medium text-ps-ink-1">No administrative events recorded yet</p>
              <p className="text-xs text-ps-ink-2 mt-1">Actions like user creation and role changes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-1 flex-1">
              {auditLogs.map(log => {
                const { action, actor, target } = auditLine(log, staff);
                const isDestructive = log.action?.includes('delete') || log.action?.includes('deactivate');
                const isCreative = log.action?.includes('create') || log.action?.includes('activate');
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-ps-bg/60 transition-colors">
                    <div className={clsx(
                      'w-2 h-2 rounded-full shrink-0 mt-1.5',
                      isDestructive ? 'bg-ps-danger' : isCreative ? 'bg-ps-success' : 'bg-ps-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ps-ink-1">
                        {action}
                        {target && <span className="text-ps-ink-2 font-normal"> → {target}</span>}
                      </p>
                      <p className="text-xs text-ps-ink-2 mt-0.5">
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
        <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border space-y-5">
          <div>
            <h2 className="text-base font-display font-semibold text-ps-ink-1">System Status</h2>
            <p className="text-xs text-ps-ink-2 font-medium mt-0.5">Platform connectivity and services</p>
          </div>

          {/* Supabase Connection */}
          <div className="p-4 rounded-xl bg-ps-bg border border-ps-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ps-ink-1">Supabase Connection</p>
              {connStatus === 'idle' && <Loader2 size={14} className="animate-spin text-ps-ink-2" />}
              {connStatus === 'ok' && <Wifi size={14} className="text-ps-success" />}
              {connStatus === 'error' && <WifiOff size={14} className="text-ps-danger" />}
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx(
                'w-2 h-2 rounded-full shrink-0',
                connStatus === 'idle' ? 'bg-ps-ink-2' :
                connStatus === 'ok' ? 'bg-ps-success animate-pulse' :
                'bg-ps-danger'
              )} />
              <span className={clsx(
                'text-xs font-medium',
                connStatus === 'idle' ? 'text-ps-ink-2' :
                connStatus === 'ok' ? 'text-ps-success' :
                'text-ps-danger'
              )}>
                {connStatus === 'idle' ? 'Verifying...' :
                 connStatus === 'ok' ? 'Connected and live' :
                 'Connection could not be verified'}
              </span>
            </div>
          </div>

          {/* Active Session */}
          <div className="p-4 rounded-xl bg-ps-bg border border-ps-border space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ps-ink-1">Active Session</p>
              <CheckCircle2 size={14} className="text-ps-success" />
            </div>
            <p className="text-xs text-ps-ink-2 truncate">{user?.email || '—'}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
              <Shield size={11} /> Super Administrator
            </span>
          </div>

          {/* Edge Functions */}
          <div className="p-4 rounded-xl bg-ps-bg border border-ps-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ps-ink-1">Edge Functions</p>
              <Zap size={14} className="text-ps-accent" />
            </div>
            <div className="space-y-1.5">
              {EDGE_FUNCTIONS.map(fn => (
                <div key={fn} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ps-success shrink-0" />
                  <span className="text-xs text-ps-ink-2 font-mono">{fn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="bg-ps-surface rounded-2xl p-6 shadow-sm border border-ps-border">
        <h2 className="text-base font-display font-semibold text-ps-ink-1 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Create User',
              icon: UserPlus,
              desc: 'Add a new account',
              action: () => navigate('/admin/users', { state: { openCreate: true } }),
              accent: true,
            },
            {
              label: 'User Management',
              icon: Users,
              desc: 'Manage all accounts',
              action: () => navigate('/admin/users'),
            },
            {
              label: 'Audit Trail',
              icon: Clock,
              desc: 'View system activity',
              action: () => navigate('/admin/users', { state: { tab: 'audit' } }),
            },
            {
              label: 'Settings',
              icon: SettingsIcon,
              desc: 'Platform configuration',
              action: () => navigate('/settings'),
            },
          ].map(({ label, icon: Icon, desc, action, accent }) => (
            <button
              key={label}
              onClick={action}
              className={clsx(
                'flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:shadow-sm active:scale-95 gap-2',
                accent
                  ? 'bg-ps-primary text-white border-ps-accent'
                  : 'bg-ps-bg border-ps-border hover:border-ps-accent/30 text-ps-ink-1'
              )}
            >
              <Icon size={18} className={accent ? 'text-white' : 'text-ps-accent'} />
              <div>
                <p className={clsx('text-xs font-semibold', accent ? 'text-white' : 'text-ps-ink-1')}>{label}</p>
                <p className={clsx('text-xs font-medium mt-0.5', accent ? 'text-white/70' : 'text-ps-ink-2')}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default SuperAdminDashboard;
