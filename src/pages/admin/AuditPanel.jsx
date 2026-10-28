import React from 'react';
import { Search, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { auditLine } from '../../lib/auditLog';

export const AuditPanel = ({
  fetchAuditLogs,
  auditLoading,
  auditSearch,
  setAuditSearch,
  auditCategory,
  setAuditCategory,
  auditLogs,
  filteredAuditLogs,
  expandedLogIds,
  toggleExpandLog,
  staff,
  getAuditBadge,
}) => (
  <div className="border border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] overflow-hidden">
    <div className="px-6 py-4 border-b border-[var(--sa-line-hairline)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="sa-panel-title">System Activity Log</h2>
          <p className="sa-panel-sub">Immutable audit trail of administrative and identity events</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="sa-link shrink-0"
        >
          Refresh
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
          <input
            type="text"
            value={auditSearch}
            onChange={e => setAuditSearch(e.target.value)}
            placeholder="Search action, actor, or target..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]"
          />
        </div>
        <div className="flex divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] overflow-x-auto hide-scrollbar shrink-0">
          {[['all','All'],['account','Accounts'],['role','Role Changes'],['status','Status']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAuditCategory(id)}
              className={clsx(
                'px-3 py-1.5 text-xs whitespace-nowrap',
                auditCategory === id
                  ? 'text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1'
                  : 'text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="overflow-x-auto">
      {auditLoading && (
        <div className="p-12 text-center">
          <div className="w-6 h-6 border-2 border-[var(--sa-gold)] border-t-transparent animate-spin mx-auto" />
        </div>
      )}

      {!auditLoading && auditLogs.length > 0 && (
        <table className="w-full min-w-[700px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--sa-line-default)]">
              <th className="text-left px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Timestamp</th>
              <th className="text-left px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Action</th>
              <th className="text-left px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Performed by</th>
              <th className="hidden md:table-cell text-left px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">IP address</th>
              <th className="text-right px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sa-line-hairline)]">
            {filteredAuditLogs.map(log => {
              const { action, actor, target } = auditLine(log, staff);
              const badge = getAuditBadge(log.action);
              const isExpanded = expandedLogIds.has(log.id);
              const hasDetails = log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0;

              return (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-[var(--sa-surface-2)] transition-colors">
                    <td className="px-6 py-3.5 text-xs tabular-nums text-[var(--sa-text-muted)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx('text-xs', badge.color)}>
                          {action}
                        </span>
                        {target && <span className="text-xs text-[var(--sa-text-muted)]">→ {target}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-[var(--sa-text-muted)]">
                      {actor}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3.5 text-xs tabular-nums sa-mono">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {hasDetails ? (
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className="sa-link inline-flex"
                        >
                          {isExpanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--sa-text-subtle)]">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasDetails && (
                    <tr className="bg-[var(--sa-bg-base)]">
                      <td colSpan={5} className="px-6 py-3">
                        <pre className="sa-mono border border-[var(--sa-line-hairline)] p-3 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredAuditLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-xs text-[var(--sa-text-muted)]">
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
