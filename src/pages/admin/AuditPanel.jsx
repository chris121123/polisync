import React from 'react';
import { Search, Clock, RefreshCw, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { auditLine, formatAuditStamp } from '../../lib/auditLog';
import ItxSelect from '../../components/ItxSelect';
import { AUDIT_SEVERITIES, getAuditSeverity } from './userManagementConstants.js';

const fieldClass = 'w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-2 tabular-nums text-[var(--sa-text-primary)]';

export const AuditPanel = ({
  fetchAuditLogs,
  auditLoading,
  auditSearch,
  setAuditSearch,
  auditCategory,
  setAuditCategory,
  auditSeverity,
  setAuditSeverity,
  auditFrom,
  setAuditFrom,
  auditTo,
  setAuditTo,
  auditLogs,
  filteredAuditLogs,
  expandedLogIds,
  toggleExpandLog,
  staff,
  getAuditBadge,
}) => (
  <div className="itx-card overflow-hidden">
    <div className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
          <input
            type="text"
            value={auditSearch}
            onChange={e => setAuditSearch(e.target.value)}
            placeholder="Search action, actor, or target..."
            aria-label="Search audit log"
            className="sa-input"
          />
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="sa-btn shrink-0 justify-center"
        >
          <RefreshCw size={14} strokeWidth={1.5} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters own their row: spacing groups them, no rule is drawn. */}
      <div className="mt-4 flex flex-wrap items-center">
        {[['all','All'],['account','Accounts'],['role','Role Changes'],['status','Status'],['ai','AI actions']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAuditCategory(id)}
            aria-pressed={auditCategory === id}
            className={clsx(
              'itx-tab whitespace-nowrap max-sm:basis-[calc(33.333%-24px)]',
              auditCategory === id && 'is-active'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <div className="min-w-0 sm:w-40">
          <label htmlFor="audit-from" className="sa-label">From</label>
          <input
            id="audit-from"
            type="date"
            value={auditFrom}
            onChange={e => setAuditFrom(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 sm:w-40">
          <label htmlFor="audit-to" className="sa-label">To</label>
          <input
            id="audit-to"
            type="date"
            value={auditTo}
            onChange={e => setAuditTo(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 max-sm:col-span-2 sm:w-40">
          <label htmlFor="audit-severity" className="sa-label">Severity</label>
          <ItxSelect
            id="audit-severity"
            value={auditSeverity}
            onChange={setAuditSeverity}
            options={Object.entries(AUDIT_SEVERITIES).map(([value, label]) => ({ value, label }))}
            className={fieldClass}
          />
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      {auditLoading && (
        <div className="p-12 text-center">
          <Loader2 size={20} strokeWidth={1.5} className="mx-auto animate-spin text-[var(--sa-text-muted)]" />
        </div>
      )}

      {!auditLoading && auditLogs.length > 0 && (
        <table className="itx-table text-left sm:min-w-[820px]">
          <thead>
            <tr>
              <th scope="col" className="text-left">Timestamp</th>
              <th scope="col" className="text-left">Action</th>
              <th scope="col" className="text-left">Severity</th>
              <th scope="col" className="text-left">Performed by</th>
              <th scope="col" className="hidden md:table-cell text-left">IP address</th>
              <th scope="col" className="text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredAuditLogs.map(log => {
              const { action, actor, target } = auditLine(log, staff);
              const badge = getAuditBadge(log.action);
              const severity = getAuditSeverity(log.action);
              const isExpanded = expandedLogIds.has(log.id);

              return (
                <React.Fragment key={log.id}>
                  <tr>
                    <td data-label="Timestamp" data-mobile="title" className="text-xs tabular-nums whitespace-nowrap">
                      {formatAuditStamp(log.created_at)}
                    </td>
                    <td data-label="Action" data-mobile="meta">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={badge.color}>
                          {action}
                        </span>
                        {target && <span className="text-xs text-[var(--sa-text-muted)]">→ {target}</span>}
                      </div>
                    </td>
                    <td data-label="Severity" data-mobile="role">
                      <span className={clsx('sa-badge', severity === 'info' ? 'sa-badge--positive' : 'sa-badge--warn')}>
                        {AUDIT_SEVERITIES[severity]}
                      </span>
                    </td>
                    <td data-label="Performed by" data-mobile="meta" className="text-xs text-[var(--sa-text-muted)]">
                      {actor}
                    </td>
                    <td data-label="IP address" data-mobile="hidden" className="hidden md:table-cell text-xs tabular-nums">
                      {log.ip_address || '—'}
                    </td>
                    <td data-mobile="action" className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleExpandLog(log.id)}
                        aria-expanded={isExpanded}
                        className="sa-link inline-flex min-h-9 min-w-9"
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="itx-selected">
                      <td colSpan={6}>
                        <pre className="overflow-x-auto p-3 leading-relaxed"><code className="sa-mono">{JSON.stringify(log, null, 2)}</code></pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredAuditLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-xs text-[var(--sa-text-muted)]">
                  No entries match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!auditLoading && auditLogs.length === 0 && (
        <div className="sa-empty m-4">
          <Clock size={18} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--sa-text-muted)]" />
          <p className="sa-empty-title">No activity logs recorded</p>
          <p className="sa-empty-sub">Actions like user creation and role changes will appear here.</p>
        </div>
      )}
    </div>
  </div>
);
