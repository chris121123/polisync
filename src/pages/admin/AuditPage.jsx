import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { auditLine } from '../../lib/auditLog';
import {
  AUDIT_CATEGORIES,
  getAuditBadge,
  getAuditSeverity,
} from './userManagementConstants.js';
import { AuditPanel } from './AuditPanel.jsx';

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

const AuditPage = () => {
  const { staff, fetchRecentAudit } = useGlobalState();

  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditSeverity, setAuditSeverity] = useState('all');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set());

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await fetchRecentAudit({ limit: 30, from: auditFrom, to: auditTo });
      if (error) throw error;
      if (data) setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFrom, auditTo]);

  // The trail loads with the page (it used to load when the audit tab opened).
  useEffect(() => {
    if (auditLogs.length === 0) fetchAuditLogs();
    // The date effect below owns every later fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A date range refetches on change; a half-typed date input is not a filter yet.
  // The first pass is skipped because the mount fetch above already ran.
  const skipFirstDateFetch = useRef(true);
  useEffect(() => {
    if (skipFirstDateFetch.current) {
      skipFirstDateFetch.current = false;
      return;
    }
    const complete = (value) => !value || FULL_DATE.test(value);
    if (complete(auditFrom) && complete(auditTo)) fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFrom, auditTo]);

  const toggleExpandLog = (id) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesCategory = auditCategory === 'all' || AUDIT_CATEGORIES[auditCategory]?.(log);
    const matchesSeverity = auditSeverity === 'all' || getAuditSeverity(log.action) === auditSeverity;
    if (!matchesCategory || !matchesSeverity) return false;
    if (!auditSearch) return true;
    const { action, actor, target } = auditLine(log, staff);
    const q = auditSearch.toLowerCase();
    return (
      action.toLowerCase().includes(q) ||
      actor.toLowerCase().includes(q) ||
      (target && target.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">Security Audit Trail</h1>
        <p className="sa-sub">Privileged actions and account events.</p>
      </div>

      <AuditPanel
        fetchAuditLogs={fetchAuditLogs}
        auditLoading={auditLoading}
        auditSearch={auditSearch}
        setAuditSearch={setAuditSearch}
        auditCategory={auditCategory}
        setAuditCategory={setAuditCategory}
        auditSeverity={auditSeverity}
        setAuditSeverity={setAuditSeverity}
        auditFrom={auditFrom}
        setAuditFrom={setAuditFrom}
        auditTo={auditTo}
        setAuditTo={setAuditTo}
        auditLogs={auditLogs}
        filteredAuditLogs={filteredAuditLogs}
        expandedLogIds={expandedLogIds}
        toggleExpandLog={toggleExpandLog}
        staff={staff}
        getAuditBadge={getAuditBadge}
      />
    </div>
  );
};

export default AuditPage;
