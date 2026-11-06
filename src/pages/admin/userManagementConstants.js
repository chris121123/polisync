export const EMPTY_CONFIG = {
  operating_start_time: '08:00',
  operating_end_time: '17:00',
  allow_overbook: false,
  max_daily_hours_per_student: 4.0,
  auto_schedule_enabled: false,
  min_break_minutes: 15,
  year_start: '',
  year_end: '',
};

// Audit category mapping
export const AUDIT_CATEGORIES = {
  all: () => true,
  account: (log) => ['user_created', 'user_deleted'].some(a => log.action?.includes(a.replace('user_', ''))),
  role: (log) => log.action?.includes('role'),
  status: (log) => log.action?.includes('activated') || log.action?.includes('deactivated'),
  ai: (log) => log.action?.startsWith('ai_'),
};

export const getAuditBadge = (action) => {
  if (!action) return { color: 'sa-badge' };
  if (action.includes('delete')) return { color: 'sa-badge sa-badge--warn' };
  if (action.includes('activate') && !action.includes('deactivate')) return { color: 'sa-badge sa-badge--positive' };
  if (action.includes('deactivate')) return { color: 'sa-badge sa-badge--warn' };
  if (action.includes('role')) return { color: 'sa-badge' };
  if (action.includes('create')) return { color: 'sa-badge sa-badge--positive' };
  return { color: 'sa-badge' };
};

// Derived, never stored: audit_logs has no severity column.
// delete / deactivate / data_cleared (the wipe) are critical; role changes and AI
// commits warn; user_created, user_activated, AI info events and anything
// unrecognised read as info.
export const getAuditSeverity = (action = '') => {
  if (/(delete|deactivate|clear)/.test(action)) return 'critical';
  if (/^ai_(plan_committed|repair_applied|config_updated)$/.test(action)) return 'warn';
  if (/^ai_(report_generated|import_applied)$/.test(action)) return 'info';
  if (action.includes('role')) return 'warn';
  return 'info';
};

export const AUDIT_SEVERITIES = {
  all: 'All',
  info: 'Information',
  warn: 'Warning',
  critical: 'Critical',
};
