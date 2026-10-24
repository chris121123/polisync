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
  <div className="bg-ps-surface rounded-xl shadow-sm border border-ps-border overflow-hidden">
    <div className="px-6 py-4 border-b border-ps-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-ps-ink-1">System Activity Log</h2>
          <p className="text-xs text-ps-ink-2 mt-0.5">Immutable audit trail of administrative and identity events</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="text-xs font-medium text-ps-accent hover:underline focus-visible:outline-2 focus-visible:outline-ps-accent"
        >
          Refresh
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={14} />
          <input
            type="text"
            value={auditSearch}
            onChange={e => setAuditSearch(e.target.value)}
            placeholder="Search action, actor, or target..."
            className="w-full pl-9 pr-4 py-2 bg-ps-bg border border-ps-border rounded-lg text-xs text-ps-ink-1 placeholder:text-ps-ink-2 focus:outline-none focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
          />
        </div>
        <div className="flex gap-1.5">
          {[['all','All'],['account','Accounts'],['role','Role Changes'],['status','Status']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAuditCategory(id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-ps-accent',
                auditCategory === id
                  ? 'bg-ps-accent text-white'
                  : 'bg-ps-surface border border-ps-border text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1'
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
          <div className="w-6 h-6 border-2 border-ps-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!auditLoading && auditLogs.length > 0 && (
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-ps-border bg-ps-bg/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Timestamp</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Action</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Performed By</th>
              <th className="hidden md:table-cell text-left px-6 py-3 text-xs font-medium text-ps-ink-2">IP Address</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-ps-ink-2">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ps-border text-sm">
            {filteredAuditLogs.map(log => {
              const { action, actor, target } = auditLine(log, staff);
              const badge = getAuditBadge(log.action);
              const isExpanded = expandedLogIds.has(log.id);
              const hasDetails = log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0;

              return (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-ps-bg/40 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-ps-ink-2 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', badge.color)}>
                          {action}
                        </span>
                        {target && <span className="text-xs text-ps-ink-2 font-normal">→ {target}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-ps-ink-2">
                      {actor}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3.5 text-xs text-ps-ink-2 font-mono">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {hasDetails ? (
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className="inline-flex items-center gap-1 text-xs text-ps-accent hover:underline focus-visible:outline-2 focus-visible:outline-ps-accent"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        <span className="text-xs text-ps-ink-2/60">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasDetails && (
                    <tr className="bg-ps-bg/60">
                      <td colSpan={5} className="px-6 py-3">
                        <pre className="text-xs bg-ps-surface p-3 rounded-lg border border-ps-border text-ps-ink-2 overflow-x-auto font-mono">
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
                <td colSpan={5} className="px-6 py-8 text-center text-xs text-ps-ink-2">
                  No entries match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!auditLoading && auditLogs.length === 0 && (
        <div className="p-8 text-center text-ps-ink-2">
          <Clock size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No activity logs recorded</p>
          <p className="text-xs mt-1">Actions like user creation and role changes will appear here.</p>
        </div>
      )}
    </div>
  </div>
);
