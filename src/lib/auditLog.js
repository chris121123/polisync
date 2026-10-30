/**
 * Audit log display helper.
 *
 * audit_logs stores ids (performed_by / target_user_id) — join them to the
 * staff list and shape a readable { action, actor, target } line for the UI.
 */

export function auditLine(log, staff) {
  const actor = staff.find(s => String(s.id) === String(log.performed_by))?.name || 'System';
  const target = log.target_user_id ? staff.find(s => String(s.id) === String(log.target_user_id))?.name : null;
  const action = log.action ? log.action.replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase()) : 'action';
  return { action, actor, target };
}

// Local time, fixed shape: 2026-10-29 09:14:00. Shared by the audit table and
// the dashboard feed so both read the same moment the same way.
export const formatAuditStamp = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
