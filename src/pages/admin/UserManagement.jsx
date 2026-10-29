import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Check,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Search,
  Activity
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { auditLine } from '../../lib/auditLog';
import { PASSWORD_RULES, isPasswordValid, validatePassword } from '../../lib/passwordPolicy';
import clsx from 'clsx';
import {
  EMPTY_CONFIG,
  AUDIT_CATEGORIES,
  getAuditBadge,
  ROLE_PILL_COLORS,
  ROLE_PILL_INACTIVE,
} from './userManagementConstants.js';
import { AuditPanel } from './AuditPanel.jsx';
import { ConfigPanel } from './ConfigPanel.jsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';

const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ .,'-]+$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const normalizePhone = (phone) => phone.replace(/[\s-]/g, '');

const fieldClass = 'w-full border bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] transition-colors';
// The border colour is chosen, never raced: two border-* utilities in one
// className resolve by CSS order, not by class order (Rooms does the same).
const fieldTone = (invalid) => (invalid
  ? 'border-[var(--sa-danger)]'
  : 'border-[var(--sa-line-default)] focus:border-[var(--sa-gold)]');

const UserManagement = () => {
  const {
    staff,
    updateUserRole,
    adminCreateUser,
    adminDeleteUser,
    toggleUserActive,
    user,
    schedulingSettings,
    notify,
    fetchRecentAudit,
    saveSchedulingSettings,
  } = useGlobalState();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set());
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  // The row kebab outlives the menu item that opens a dialog, so it is the focus anchor to restore.
  const rowMenuTriggerRef = useRef(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('all');

  // ── Platform Configuration Form State ──
  const [configForm, setConfigForm] = useState(EMPTY_CONFIG);
  const [initialConfigForm, setInitialConfigForm] = useState(EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);

  const isConfigDirty = JSON.stringify(configForm) !== JSON.stringify(initialConfigForm);

  useEffect(() => {
    if (schedulingSettings) {
      const loaded = {
        operating_start_time: schedulingSettings.operating_start_time || '08:00',
        operating_end_time: schedulingSettings.operating_end_time || '17:00',
        allow_overbook: !!schedulingSettings.allow_overbook,
        max_daily_hours_per_student: schedulingSettings.max_daily_hours_per_student ?? 4.0,
        auto_schedule_enabled: !!schedulingSettings.auto_schedule_enabled,
        min_break_minutes: schedulingSettings.min_break_minutes ?? 15,
      };
      setConfigForm(loaded);
      setInitialConfigForm(loaded);
    }
  }, [schedulingSettings]);

  // ── Delete User Modal State ──
  const [deleteModalData, setDeleteModalData] = useState(null);
  const [deleteCountdown, setDeleteCountdown] = useState(0);

  // ── Create User Modal State ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Self Role Warning State ──
  const [showSelfRoleWarning, setShowSelfRoleWarning] = useState(false);
  const [selfRoleCountdown, setSelfRoleCountdown] = useState(0);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher',
    department: 'General',
    phone: '',
  });

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await fetchRecentAudit(30);
      if (error) throw error;
      if (data) setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
    // Factory actions are state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'audit' && auditLogs.length === 0) {
      fetchAuditLogs();
    }
  }, [activeTab, auditLogs.length, fetchAuditLogs]);

  useEffect(() => {
    const openCreate = location.state?.openCreate;
    const tab = location.state?.tab;
    if (tab) setActiveTab(tab);
    if (openCreate) {
      setShowCreateModal(true);
      setCreateError('');
      setErrors({});
      setCreateSuccess('');
    }
    if (openCreate || tab) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.openCreate, location.state?.tab, navigate]);

  useEffect(() => {
    let timer;
    if (deleteModalData && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [deleteModalData, deleteCountdown]);

  useEffect(() => {
    let timer;
    if (showSelfRoleWarning && selfRoleCountdown > 0) {
      timer = setTimeout(() => setSelfRoleCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showSelfRoleWarning, selfRoleCountdown]);

  const handleUpdateRole = async (userId) => {
    if (user && user.id === userId && selectedRole !== 'superadmin') {
      setShowSelfRoleWarning(true);
      setSelfRoleCountdown(5);
      return;
    }
    await updateUserRole(userId, selectedRole);
    setShowRoleModal(null);
  };

  const confirmSelfRoleChange = async () => {
    if (!showRoleModal) return;
    await updateUserRole(showRoleModal, selectedRole);
    setShowSelfRoleWarning(false);
    setShowRoleModal(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newUser.name.trim()) newErrors.name = 'Full name is required';
    else if (!NAME_PATTERN.test(newUser.name.trim())) newErrors.name = 'Full name must contain letters only';
    if (!newUser.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_PATTERN.test(newUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (normalizePhone(newUser.phone) && !PHONE_PATTERN.test(normalizePhone(newUser.phone))) {
      newErrors.phone = 'Enter a valid PH mobile number (11 digits starting with 09)';
    }
    if (!newUser.password) {
      newErrors.password = 'Temporary password is required';
    } else if (!isPasswordValid(newUser.password)) {
      newErrors.password = 'Password does not meet the requirements below';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field) => {
    const newErrors = { ...errors };
    if (field === 'name') {
      if (!newUser.name.trim()) newErrors.name = 'Full name is required';
      else if (!NAME_PATTERN.test(newUser.name.trim())) newErrors.name = 'Full name must contain letters only';
      else delete newErrors.name;
    }
    if (field === 'email') {
      if (!newUser.email.trim()) newErrors.email = 'Email address is required';
      else if (!EMAIL_PATTERN.test(newUser.email)) newErrors.email = 'Please enter a valid email address';
      else delete newErrors.email;
    }
    if (field === 'phone') {
      if (normalizePhone(newUser.phone) && !PHONE_PATTERN.test(normalizePhone(newUser.phone))) newErrors.phone = 'Enter a valid PH mobile number (11 digits starting with 09)';
      else delete newErrors.phone;
    }
    if (field === 'password') {
      if (!newUser.password) newErrors.password = 'Temporary password is required';
      else if (!isPasswordValid(newUser.password)) newErrors.password = 'Password does not meet the requirements below';
      else delete newErrors.password;
    }
    setErrors(newErrors);
  };

  const handleDeleteUser = (member) => {
    rowMenuTriggerRef.current?.focus();
    setDeleteModalData(member);
    setDeleteCountdown(5);
    setOpenMenuId(null);
  };

  const confirmDeleteUser = async () => {
    if (!deleteModalData) return;
    try {
      await adminDeleteUser(deleteModalData.id);
      setDeleteModalData(null);
    } catch {
      // provider notifies error
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setCreateLoading(true);
    setCreateError('');

    try {
      await adminCreateUser({ ...newUser, phone: normalizePhone(newUser.phone) });
      setCreateSuccess('User created successfully!');

      try {
        if (window.PasswordCredential && navigator.credentials) {
          const cred = new window.PasswordCredential({
            id: newUser.email,
            password: newUser.password,
            name: newUser.name,
          });
          navigator.credentials.store(cred).catch(() => {});
        }
      } catch {
        // Ignore credential api errors
      }

      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess('');
        setNewUser({ name: '', email: '', password: '', role: 'teacher', department: 'General', phone: '' });
      }, 1000);
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setTimeout(() => {
      setNewUser({ name: '', email: '', password: '', role: 'teacher', department: 'General', phone: '' });
      setErrors({});
      setShowCreateModal(false);
      setCreateError('');
    }, 100);
  };

  const handleToggleActive = async (userId, currentActive) => {
    await toggleUserActive(userId, !currentActive);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigLoading(true);
    try {
      const { error } = await saveSchedulingSettings(configForm, schedulingSettings?.id || 1);
      if (error) throw error;
      if (notify) notify('Platform configuration updated successfully');
      setInitialConfigForm({ ...configForm });
    } catch (err) {
      if (notify) notify(err.message || 'Failed to update configuration', 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  const toggleExpandLog = (id) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredStaff = (filterRole === 'all' ? staff : staff.filter(s => s.app_role === filterRole))
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.name && s.name.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q));
    });

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesCategory = auditCategory === 'all' || AUDIT_CATEGORIES[auditCategory]?.(log);
    if (!auditSearch) return matchesCategory;
    const { action, actor, target } = auditLine(log, staff);
    const q = auditSearch.toLowerCase();
    return matchesCategory && (
      action.toLowerCase().includes(q) ||
      actor.toLowerCase().includes(q) ||
      (target && target.toLowerCase().includes(q))
    );
  });

  const tabs = [
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'config', label: 'Platform Config' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sa-rule-b">
        <div>
          <h1 className="sa-title">System Console</h1>
          <p className="sa-sub">Identity, audit trail, and platform configuration</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); setErrors({}); }}
            className="sa-btn sa-btn--primary"
          >
            <UserPlus size={16} strokeWidth={1.5} />
            Create User
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)] overflow-x-auto hide-scrollbar w-fit max-w-full">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-3 py-1.5 text-xs whitespace-nowrap",
              activeTab === tab.id
                ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 1. USERS TAB ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Role Filters + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:flex-wrap">
            <div className="flex flex-wrap gap-px sm:flex-nowrap sm:gap-0 sm:divide-x sm:divide-[var(--sa-line-default)] sm:border sm:border-[var(--sa-line-default)]">
              {['all', 'superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={clsx(
                    "border border-[var(--sa-line-default)] sm:border-0 px-3 py-1.5 text-xs whitespace-nowrap tabular-nums capitalize",
                    filterRole === role
                      ? ROLE_PILL_COLORS[role]
                      : ROLE_PILL_INACTIVE
                  )}
                >
                  {role === 'superadmin' ? 'Super Admin' : role === 'all' ? 'All' : role} {role !== 'all' && `(${staff.filter(s => s.app_role === role).length})`}
                </button>
              ))}
            </div>

            <div className="relative sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 bg-[var(--sa-bg-base)] border border-[var(--sa-line-default)] text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="border border-[var(--sa-line-default)] overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--sa-line-default)]">
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">User</th>
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">App Role</th>
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Department</th>
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Email</th>
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)]">Status</th>
                  <th className="px-6 py-3 text-xs font-normal text-[var(--sa-text-muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sa-line-hairline)]">
                {filteredStaff.map((member, index) => (
                  <tr key={member.id} className="hover:bg-[var(--sa-surface-2)] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border border-[var(--sa-line-default)] sa-t-warm text-[11px] tabular-nums flex items-center justify-center shrink-0">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="sa-row-title truncate">{member.name}</p>
                          <p className="text-[11px] text-[var(--sa-text-muted)] truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="sa-badge">{member.app_role || 'teacher'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-[var(--sa-text-muted)]">{member.department || 'General'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-[var(--sa-text-muted)]">{member.email}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={clsx(
                        'sa-badge',
                        member.is_active !== false && 'sa-badge--positive'
                      )}>
                        {member.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            rowMenuTriggerRef.current = e.currentTarget;
                            setOpenMenuId(openMenuId === member.id ? null : member.id);
                          }}
                          aria-label={`Actions for ${member.name}`}
                          className="p-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] transition-colors"
                        >
                          <MoreVertical size={16} strokeWidth={1.5} />
                        </button>

                        {openMenuId === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className={clsx(
                              'absolute right-0 w-48 bg-[var(--sa-surface-1)] border border-[var(--sa-line-default)] z-50 p-1',
                              // The table scrolls (min-w), so it clips; the last rows open upward.
                              index >= 2 && index >= filteredStaff.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'
                            )}>
                              <button
                                onClick={() => {
                                  handleToggleActive(member.id, member.is_active !== false);
                                  setOpenMenuId(null);
                                }}
                                className={clsx(
                                  "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors hover:bg-[var(--sa-surface-2)] hover:text-[var(--sa-text-primary)]",
                                  member.is_active === false ? "sa-t-warm" : "text-[var(--sa-text-secondary)]"
                                )}
                              >
                                {member.is_active === false ? <ToggleLeft size={16} strokeWidth={1.5} /> : <ToggleRight size={16} strokeWidth={1.5} />}
                                {member.is_active === false ? 'Activate User' : 'Deactivate User'}
                              </button>

                              <button
                                onClick={() => {
                                  rowMenuTriggerRef.current?.focus();
                                  setShowRoleModal(member.id);
                                  setSelectedRole(member.app_role || 'teacher');
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-surface-2)] hover:text-[var(--sa-text-primary)]"
                              >
                                <Shield size={16} strokeWidth={1.5} />
                                Change Role
                              </button>

                              <div className="h-px bg-[var(--sa-line-hairline)] my-1" />

                              <button
                                onClick={() => handleDeleteUser(member)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left sa-t-danger transition-colors hover:bg-[var(--sa-surface-2)]"
                              >
                                <Trash2 size={16} strokeWidth={1.5} />
                                Delete User
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStaff.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Users size={18} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--sa-text-muted)]" />
                {staff.length === 0 ? (
                  <>
                    <p className="sa-empty-title">No users yet</p>
                    <p className="sa-empty-sub">Create your first platform account to get started.</p>
                    <button
                      onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); setErrors({}); }}
                      className="sa-btn sa-btn--primary mt-4"
                    >
                      <UserPlus size={14} strokeWidth={1.5} /> Create first user
                    </button>
                  </>
                ) : (
                  <>
                    <p className="sa-empty-title">No users match this filter</p>
                    <p className="sa-empty-sub">Try a different role filter or clear the search query.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. AUDIT TRAIL TAB ── */}
      {activeTab === 'audit' && (
        <AuditPanel
          fetchAuditLogs={fetchAuditLogs}
          auditLoading={auditLoading}
          auditSearch={auditSearch}
          setAuditSearch={setAuditSearch}
          auditCategory={auditCategory}
          setAuditCategory={setAuditCategory}
          auditLogs={auditLogs}
          filteredAuditLogs={filteredAuditLogs}
          expandedLogIds={expandedLogIds}
          toggleExpandLog={toggleExpandLog}
          staff={staff}
          getAuditBadge={getAuditBadge}
        />
      )}

      {/* ── 3. PLATFORM CONFIG TAB ── */}
      {activeTab === 'config' && (
        <ConfigPanel
          configForm={configForm}
          setConfigForm={setConfigForm}
          handleSaveConfig={handleSaveConfig}
          configLoading={configLoading}
          isConfigDirty={isConfigDirty}
        />
      )}

      {/* ── Change Role Modal ── */}
      <AppModal isOpen={Boolean(showRoleModal)} onClose={() => setShowRoleModal(null)} labelledBy="change-role-title" maxWidth="max-w-sm">
        <ModalHeader
          titleId="change-role-title"
          title="Change User Role"
          onClose={() => setShowRoleModal(null)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {user && user.id === showRoleModal && selectedRole !== 'superadmin' ? (
            <div className="mb-4 border border-[var(--sa-danger)] p-3 flex gap-3 items-start">
              <ShieldAlert size={18} strokeWidth={1.5} className="sa-t-danger shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs sa-t-danger mb-1">Critical Warning</p>
                <p className="text-xs sa-t-danger leading-tight">
                  You are changing your OWN role. You will lose administrative access and be locked out of this console.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 border border-[var(--sa-line-hairline)] p-3 flex gap-3 items-start">
              <ShieldAlert size={16} strokeWidth={1.5} className="text-[var(--sa-text-muted)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--sa-text-muted)] leading-tight">
                This will immediately update access permissions across the system.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {['superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={clsx(
                  "w-full text-left px-4 py-3 text-sm transition-colors border",
                  selectedRole === role
                    ? "border-[var(--sa-gold)] text-[var(--sa-text-primary)]"
                    : "border-[var(--sa-line-default)] text-[var(--sa-text-secondary)] hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]"
                )}
              >
                <span className="capitalize block">{role === 'superadmin' ? 'Super Admin' : role}</span>
                <span className="text-[11px] text-[var(--sa-text-muted)] block mt-0.5">
                  {role === 'superadmin' ? 'Full system access + user management + platform config' :
                   role === 'admin' ? 'Schedule, directory, and room operations' :
                   role === 'teacher' ? 'Manage classes and attendance' :
                   role === 'therapist' ? 'Session notes and progress' :
                   'View child schedule'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            onClick={() => handleUpdateRole(showRoleModal)}
            className="sa-btn sa-btn--primary flex-1 justify-center min-h-11"
          >
            Update Role
          </button>
          <button
            onClick={() => setShowRoleModal(null)}
            className="sa-btn justify-center min-h-11"
          >
            Cancel
          </button>
        </div>
      </AppModal>

      {/* ── Create User Modal ── */}
      <AppModal isOpen={showCreateModal} onClose={handleCancelCreate} labelledBy="create-user-title">
        <ModalHeader
          titleId="create-user-title"
          eyebrow="New Account"
          title="Create New User"
          description="Administrator-provisioned account"
          onClose={handleCancelCreate}
          className="bg-[var(--sa-surface-warm)]"
        />

        {/* Body */}
        <div className="flex-1 min-h-0 px-5 py-5 md:px-6 space-y-4 overflow-y-auto">
          {createError && (
            <div className="sa-alert sa-alert--danger items-center">
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
              {createError}
            </div>
          )}
          {createSuccess && (
            <div className="sa-alert sa-alert--success items-center">
              <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0" />
              {createSuccess}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="new_user_name" className="sa-label">Full Name</label>
              <input
                id="new_user_name"
                data-autofocus
                type="text"
                value={newUser.name}
                onChange={(e) => {
                  setNewUser(p => ({ ...p, name: e.target.value }));
                  if (errors.name) setErrors(p => ({ ...p, name: '' }));
                }}
                onBlur={() => validateField('name')}
                placeholder="FirstName LastName"
                className={clsx(fieldClass, fieldTone(errors.name))}
              />
              {errors.name && <p className="text-[11px] sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="new_user_email" className="sa-label">Email Address</label>
              <input
                id="new_user_email"
                type="email"
                autoComplete="username"
                value={newUser.email}
                onChange={(e) => {
                  setNewUser(p => ({ ...p, email: e.target.value }));
                  if (errors.email) setErrors(p => ({ ...p, email: '' }));
                }}
                onBlur={() => validateField('email')}
                placeholder="email@polisync.com"
                className={clsx(fieldClass, fieldTone(errors.email))}
              />
              {errors.email && <p className="text-[11px] sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="temp_password_input" className="sa-label">Temporary Password</label>
              <div className="relative">
                <input
                  id="temp_password_input"
                  aria-describedby="temp_password_rules"
                  type="text"
                  style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(e) => {
                    setNewUser(p => ({ ...p, password: e.target.value }));
                    if (errors.password) setErrors(p => ({ ...p, password: '' }));
                  }}
                  onBlur={() => validateField('password')}
                  placeholder="Min 8 characters"
                  className={clsx(fieldClass, 'pr-12', fieldTone(errors.password))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0.5 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center cursor-pointer text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.password}</p>}
              {!errors.password && <p className="text-[11px] text-[var(--sa-text-muted)] mt-1">User will be prompted to change password on initial login.</p>}
              <ul id="temp_password_rules" className="mt-2 border border-[var(--sa-line-hairline)] bg-[var(--sa-bg-base)] p-3 space-y-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const met = !validatePassword(newUser.password).some((r) => r.id === rule.id);
                  return (
                    <li key={rule.id} className={clsx('flex items-center gap-1.5 text-[11px]', met ? 'text-[var(--sa-success)]' : 'text-[var(--sa-text-muted)]')}>
                      {met ? <Check size={12} strokeWidth={1.5} /> : <X size={12} strokeWidth={1.5} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Role */}
            <div>
              <p id="new_user_role_label" className="sa-label">Role</p>
              <div role="group" aria-labelledby="new_user_role_label" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'therapist', label: 'Therapist' },
                  { value: 'parent', label: 'Parent' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'superadmin', label: 'Super Admin' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewUser(p => ({ ...p, role: value }))}
                    aria-pressed={newUser.role === value}
                    className={clsx(
                      'py-2.5 text-xs border cursor-pointer transition-colors',
                      newUser.role === value
                        ? 'border-[var(--sa-gold)] text-[var(--sa-text-primary)]'
                        : 'border-[var(--sa-line-default)] text-[var(--sa-text-muted)] hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {newUser.role !== 'parent' && (
                <div>
                  <label htmlFor="new_user_department" className="sa-label">Department</label>
                  <select
                    id="new_user_department"
                    value={newUser.department}
                    onChange={(e) => setNewUser(p => ({ ...p, department: e.target.value }))}
                    className={clsx(fieldClass, 'border-[var(--sa-line-default)] focus:border-[var(--sa-gold)]')}
                  >
                    <option value="General">General</option>
                    <option value="SPED">SPED</option>
                    <option value="Rehab">Rehab</option>
                    <option value="Playschool">Playschool</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              )}

              {/* Phone */}
              <div className={clsx(newUser.role === 'parent' && 'sm:col-span-2')}>
                <label htmlFor="phone_input" className="sa-label">Phone (optional)</label>
                <input
                  id="phone_input"
                  type="tel"
                  autoComplete="tel"
                  value={newUser.phone}
                  onChange={(e) => {
                    setNewUser(p => ({ ...p, phone: e.target.value }));
                    if (errors.phone) setErrors(p => ({ ...p, phone: '' }));
                  }}
                  onBlur={() => validateField('phone')}
                  placeholder="09XX XXX XXXX"
                  className={clsx(fieldClass, fieldTone(errors.phone))}
                />
                {errors.phone && <p className="text-[11px] sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.phone}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={handleCancelCreate}
            className="sa-btn justify-center min-h-11 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={createLoading || !newUser.name || !newUser.email || !isPasswordValid(newUser.password)}
            className="sa-btn sa-btn--primary flex-1 justify-center min-h-11 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createLoading ? (
              <div className="h-4 w-4 animate-spin border border-current border-t-transparent" />
            ) : (
              <>
                <UserPlus size={16} strokeWidth={1.5} />
                Create Account
              </>
            )}
          </button>
        </div>
      </AppModal>

      {/* ── Delete User Modal ── */}
      <AppModal isOpen={Boolean(deleteModalData)} onClose={() => setDeleteModalData(null)} labelledBy="delete-user-title" maxWidth="max-w-sm">
        <ModalHeader
          titleId="delete-user-title"
          title="Delete User?"
          description={deleteModalData?.name}
          onClose={() => setDeleteModalData(null)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="border border-[var(--sa-danger)] p-3.5">
            <p className="text-xs sa-t-danger leading-relaxed">
              This action cannot be undone. This will permanently delete the user's account and revoke access immediately.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            onClick={() => setDeleteModalData(null)}
            className="sa-btn flex-1 justify-center min-h-11"
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteUser}
            disabled={deleteCountdown > 0}
            className={clsx(
              "flex-1 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2",
              deleteCountdown > 0
                ? "border border-[var(--sa-line-default)] text-[var(--sa-text-muted)] cursor-not-allowed"
                : "border border-[var(--sa-danger)] text-[var(--sa-danger)] hover:border-[var(--sa-line-strong)]"
            )}
          >
            {deleteCountdown > 0 ? `Wait ${deleteCountdown}s` : 'Delete User'}
          </button>
        </div>
      </AppModal>

      {/* ── Self Role Change Warning Modal ── */}
      <AppModal isOpen={showSelfRoleWarning} onClose={() => setShowSelfRoleWarning(false)} labelledBy="self-role-title" maxWidth="max-w-sm">
        <ModalHeader
          titleId="self-role-title"
          title="Change Own Role?"
          description={<>Target Role: <span className="capitalize sa-t-warm">{selectedRole}</span></>}
          onClose={() => setShowSelfRoleWarning(false)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="border border-[var(--sa-danger)] p-3.5">
            <p className="text-xs sa-t-danger leading-relaxed">
              You are stripping yourself of superadmin access.
              This action is irreversible from this account.
              You will be locked out immediately.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            onClick={() => setShowSelfRoleWarning(false)}
            className="sa-btn flex-1 justify-center min-h-11"
          >
            Cancel
          </button>
          <button
            onClick={confirmSelfRoleChange}
            disabled={selfRoleCountdown > 0}
            className={clsx(
              "flex-1 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2",
              selfRoleCountdown > 0
                ? "border border-[var(--sa-line-default)] text-[var(--sa-text-muted)] cursor-not-allowed"
                : "border border-[var(--sa-danger)] text-[var(--sa-danger)] hover:border-[var(--sa-line-strong)]"
            )}
          >
            {selfRoleCountdown > 0 ? `Wait ${selfRoleCountdown}s` : 'Confirm'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default UserManagement;
