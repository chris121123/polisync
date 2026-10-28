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
  if (!action) return { color: 'sa-badge' };
  if (action.includes('delete')) return { color: 'sa-badge sa-badge--warn' };
  if (action.includes('activate') && !action.includes('deactivate')) return { color: 'sa-badge sa-badge--positive' };
  if (action.includes('deactivate')) return { color: 'sa-badge sa-badge--warn' };
  if (action.includes('role')) return { color: 'sa-badge' };
  if (action.includes('create')) return { color: 'sa-badge sa-badge--positive' };
  return { color: 'sa-badge' };
};

// ADR-R5 / D2: role identity is carried by the label, so every role shares the
// one hairline active-cell treatment (gold 1px outline, primary ink).
const ACTIVE_CELL = 'text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1';

export const ROLE_PILL_COLORS = {
  all: ACTIVE_CELL,
  superadmin: ACTIVE_CELL,
  admin: ACTIVE_CELL,
  teacher: ACTIVE_CELL,
  therapist: ACTIVE_CELL,
  parent: ACTIVE_CELL,
};
export const ROLE_PILL_INACTIVE = 'text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]';
