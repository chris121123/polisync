export const EMPTY_CONFIG = {
  operating_start_time: '08:00',
  operating_end_time: '17:00',
  allow_overbook: false,
  max_daily_hours_per_student: 4.0,
  auto_schedule_enabled: false,
  min_break_minutes: 15,
};

// Audit category mapping
export const AUDIT_CATEGORIES = {
  all: () => true,
  account: (log) => ['user_created', 'user_deleted'].some(a => log.action?.includes(a.replace('user_', ''))),
  role: (log) => log.action?.includes('role'),
  status: (log) => log.action?.includes('activated') || log.action?.includes('deactivated'),
};

export const getAuditBadge = (action) => {
  if (!action) return { color: 'bg-ps-bg text-ps-ink-2 border border-ps-border', dot: 'bg-ps-ink-2' };
  if (action.includes('delete')) return { color: 'bg-ps-danger/10 text-ps-danger', dot: 'bg-ps-danger' };
  if (action.includes('activate') && !action.includes('deactivate')) return { color: 'bg-ps-success/10 text-ps-success', dot: 'bg-ps-success' };
  if (action.includes('deactivate')) return { color: 'bg-ps-warn/10 text-ps-warn', dot: 'bg-ps-warn' };
  if (action.includes('role')) return { color: 'bg-ps-accent-soft text-ps-accent', dot: 'bg-ps-primary' };
  if (action.includes('create')) return { color: 'bg-ps-success/10 text-ps-success', dot: 'bg-ps-success' };
  return { color: 'bg-ps-bg text-ps-ink-2 border border-ps-border', dot: 'bg-ps-ink-2' };
};

export const ROLE_PILL_COLORS = {
  all: 'bg-ps-primary text-white',
  superadmin: 'bg-role-superadmin/10 text-role-superadmin border border-role-superadmin/30',
  admin: 'bg-role-admin/10 text-role-admin border border-role-admin/30',
  teacher: 'bg-role-teacher/10 text-role-teacher border border-role-teacher/30',
  therapist: 'bg-role-therapist/10 text-role-therapist border border-role-therapist/30',
  parent: 'bg-role-parent/10 text-role-parent border border-role-parent/30',
};
export const ROLE_PILL_INACTIVE = 'bg-ps-surface border border-ps-border text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1';
