import React, { useState, useEffect, useCallback } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
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

const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ .,'-]+$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const normalizePhone = (phone) => phone.replace(/[\s-]/g, '');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ps-border/60">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ps-ink-1 tracking-tight">System Console</h1>
          <p className="text-xs sm:text-sm text-ps-ink-2 mt-0.5">Identity, audit trail, and platform configuration</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-ps-primary text-white rounded-xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-ps-accent"
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-ps-border pb-2 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-4 py-2 rounded-t-lg text-sm font-medium transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-ps-accent",
              activeTab === tab.id
                ? "bg-ps-surface text-ps-accent border-b-2 border-ps-accent"
                : "text-ps-ink-2 hover:text-ps-ink-1"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize focus-visible:outline-2 focus-visible:outline-ps-accent",
                    filterRole === role
                      ? ROLE_PILL_COLORS[role]
                      : ROLE_PILL_INACTIVE
                  )}
                >
                  {role === 'superadmin' ? 'Super Admin' : role === 'all' ? 'All' : role} {role !== 'all' && `(${staff.filter(s => s.app_role === role).length})`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full sm:w-72 pl-9 pr-4 py-2 bg-ps-surface border border-ps-border rounded-lg text-sm text-ps-ink-1 placeholder:text-[var(--sa-text-subtle)] focus:outline-none focus:ring-2 focus:ring-ps-accent/20 focus:border-ps-accent"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto bg-ps-surface rounded-xl shadow-sm border border-ps-border">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-ps-border bg-ps-bg/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">App Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Department</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ps-ink-2">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-ps-ink-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ps-border">
                {filteredStaff.map(member => (
                  <tr key={member.id} className="hover:bg-ps-bg/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-ps-accent-soft text-ps-accent flex items-center justify-center font-semibold text-sm shrink-0">
                          {member.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ps-ink-1 truncate">{member.name}</p>
                          <p className="text-xs text-ps-ink-2 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "text-xs font-medium px-2.5 py-1 rounded-full",
                        ROLE_PILL_COLORS[member.app_role || 'teacher']
                      )}>
                        {member.app_role || 'teacher'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-ps-ink-2">{member.department || 'General'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-ps-ink-2">{member.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        member.is_active === false
                          ? "bg-ps-danger/10 text-ps-danger"
                          : "bg-ps-success/10 text-ps-success"
                      )}>
                        {member.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          aria-label={`Actions for ${member.name}`}
                          className="p-1.5 text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-bg rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-ps-surface rounded-lg shadow-md border border-ps-border z-50 p-1">
                              <button
                                onClick={() => {
                                  handleToggleActive(member.id, member.is_active !== false);
                                  setOpenMenuId(null);
                                }}
                                className={clsx(
                                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left",
                                  member.is_active === false
                                    ? "text-ps-success hover:bg-ps-success/10"
                                    : "text-ps-ink-1 hover:bg-ps-bg"
                                )}
                              >
                                {member.is_active === false ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                                {member.is_active === false ? 'Activate User' : 'Deactivate User'}
                              </button>

                              <button
                                onClick={() => {
                                  setShowRoleModal(member.id);
                                  setSelectedRole(member.app_role || 'teacher');
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ps-ink-1 hover:bg-ps-bg rounded-lg transition-colors text-left"
                              >
                                <Shield size={16} />
                                Change Role
                              </button>

                              <div className="h-px bg-ps-border my-1" />

                              <button
                                onClick={() => handleDeleteUser(member)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ps-danger hover:bg-ps-danger/10 rounded-lg transition-colors text-left"
                              >
                                <Trash2 size={16} />
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
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-ps-bg border border-ps-border flex items-center justify-center mx-auto mb-3">
                  <Users size={18} className="text-ps-ink-2" />
                </div>
                {staff.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-ps-ink-1">No users yet</p>
                    <p className="text-xs text-ps-ink-2 mt-1 mb-4">Create your first platform account to get started.</p>
                    <button
                      onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-ps-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all"
                    >
                      <UserPlus size={14} /> Create first user
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-ps-ink-1">No users match this filter</p>
                    <p className="text-xs text-ps-ink-2 mt-1">Try a different role filter or clear the search query.</p>
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
      {showRoleModal && (
        <div 
          className="fixed inset-0 bg-black/40 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowRoleModal(null)}
        >
          <div
            className="bg-ps-surface rounded-t-2xl sm:rounded-xl shadow-md max-w-sm w-full p-5 sm:p-6 border border-ps-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-ps-ink-1 mb-2">Change User Role</h3>
            
            {user && user.id === showRoleModal && selectedRole !== 'superadmin' ? (
              <div className="mb-4 p-3 bg-ps-danger/10 border border-ps-danger/30 rounded-lg flex gap-3 items-start">
                <ShieldAlert size={18} className="text-ps-danger shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-ps-danger font-semibold mb-1">Critical Warning</p>
                  <p className="text-xs text-ps-danger leading-tight">
                    You are changing your OWN role. You will lose administrative access and be locked out of this console.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-ps-bg border border-ps-border rounded-lg flex gap-3 items-start">
                <ShieldAlert size={16} className="text-ps-ink-2 shrink-0 mt-0.5" />
                <p className="text-xs text-ps-ink-2 leading-tight">
                  This will immediately update access permissions across the system.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {['superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={clsx(
                    "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors border",
                    selectedRole === role
                      ? "border-ps-accent bg-ps-accent-soft text-ps-ink-1"
                      : "border-ps-border text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1"
                  )}
                >
                  <span className="capitalize block">{role === 'superadmin' ? 'Super Admin' : role}</span>
                  <span className="text-xs text-ps-ink-2 font-normal block mt-0.5">
                    {role === 'superadmin' ? 'Full system access + user management + platform config' :
                     role === 'admin' ? 'Schedule, directory, and room operations' :
                     role === 'teacher' ? 'Manage classes and attendance' :
                     role === 'therapist' ? 'Session notes and progress' :
                     'View child schedule'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateRole(showRoleModal)}
                className="flex-1 py-2 bg-ps-primary hover:opacity-90 text-white font-medium rounded-lg text-sm transition-opacity"
              >
                Update Role
              </button>
              <button
                onClick={() => setShowRoleModal(null)}
                className="px-4 py-2 border border-ps-border text-ps-ink-1 font-medium rounded-lg text-sm hover:bg-ps-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
            onClick={handleCancelCreate}
          >
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="bg-ps-surface rounded-t-2xl md:rounded-2xl shadow-md w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 md:p-6 relative shrink-0 bg-ps-primary">
                <div className="relative flex justify-between items-start">
                  <div>
                    <p className="text-white/80 text-xs font-medium mb-1">New Account</p>
                    <h3 className="text-white text-lg md:text-xl font-semibold">Create New User</h3>
                    <p className="text-white/70 text-xs mt-1">Administrator-provisioned account</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    aria-label="Close"
                    className="p-2 cursor-pointer rounded-full bg-ps-surface/20 hover:bg-ps-surface/30 text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="relative flex gap-2 mt-4">
                  <div className="h-1 flex-1 rounded-full bg-ps-surface" />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 p-4 md:p-6 space-y-4 overflow-y-auto">
                {createError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-ps-danger/10 border border-ps-danger/30 text-ps-danger text-xs font-medium">
                    <AlertCircle size={16} />
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-ps-success/10 border border-ps-success/30 text-ps-success text-xs font-medium">
                    <CheckCircle2 size={16} />
                    {createSuccess}
                  </div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="new_user_name" className="text-xs font-medium text-ps-ink-2 mb-2 block">Full Name</label>
                    <input
                      id="new_user_name"
                      type="text"
                      value={newUser.name}
                      onChange={(e) => {
                        setNewUser(p => ({ ...p, name: e.target.value }));
                        if (errors.name) setErrors(p => ({ ...p, name: '' }));
                      }}
                      onBlur={() => validateField('name')}
                      placeholder="FirstName LastName"
                      className={clsx(
                        "w-full px-4 py-3 bg-ps-bg border rounded-xl outline-none focus:ring-2 text-sm font-semibold transition-all",
                        errors.name
                          ? "border-ps-danger focus:ring-ps-danger/20"
                          : "border-ps-border focus:border-ps-accent focus:ring-ps-accent/20"
                      )}
                    />
                    {errors.name && <p className="text-xs text-ps-danger font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="new_user_email" className="text-xs font-medium text-ps-ink-2 mb-2 block">Email Address</label>
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
                      className={clsx(
                        "w-full px-4 py-3 bg-ps-bg border rounded-xl outline-none focus:ring-2 text-sm font-semibold transition-all",
                        errors.email
                          ? "border-ps-danger focus:ring-ps-danger/20"
                          : "border-ps-border focus:border-ps-accent focus:ring-ps-accent/20"
                      )}
                    />
                    {errors.email && <p className="text-xs text-ps-danger font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="temp_password_input" className="text-xs font-medium text-ps-ink-2 mb-2 block">Temporary Password</label>
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
                        className={clsx(
                          "w-full py-3 pl-4 pr-12 bg-ps-bg border rounded-xl outline-none focus:ring-2 text-sm font-semibold transition-all",
                          errors.password
                            ? "border-ps-danger focus:ring-ps-danger/20"
                            : "border-ps-border focus:border-ps-accent focus:ring-ps-accent/20"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-0.5 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center cursor-pointer text-ps-ink-2 hover:text-ps-ink-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-ps-danger font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.password}</p>}
                    {!errors.password && <p className="text-xs text-ps-ink-2 mt-1">User will be prompted to change password on initial login.</p>}
                    <ul id="temp_password_rules" className="mt-2 rounded-lg border border-ps-border bg-ps-bg p-3 space-y-1.5">
                      {PASSWORD_RULES.map((rule) => {
                        const met = !validatePassword(newUser.password).some((r) => r.id === rule.id);
                        return (
                          <li key={rule.id} className={clsx('flex items-center gap-1.5 text-xs', met ? 'text-ps-success' : 'text-ps-ink-2')}>
                            {met ? <Check size={12} /> : <X size={12} />}
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Role */}
                  <div>
                    <p id="new_user_role_label" className="text-xs font-medium text-ps-ink-2 mb-2 block">Role</p>
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
                            'py-3 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer',
                            newUser.role === value
                              ? 'bg-ps-primary text-white border-transparent shadow-md'
                              : 'bg-ps-bg text-ps-ink-2 border-ps-border hover:border-ps-border'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newUser.role !== 'parent' && (
                    <div>
                      <label htmlFor="new_user_department" className="text-xs font-medium text-ps-ink-2 mb-2 block">Department</label>
                      <select
                        id="new_user_department"
                        value={newUser.department}
                        onChange={(e) => setNewUser(p => ({ ...p, department: e.target.value }))}
                        className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-accent focus:ring-2 focus:ring-ps-accent/20 text-sm font-semibold transition-all"
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
                  <div>
                    <label htmlFor="phone_input" className="text-xs font-medium text-ps-ink-2 mb-2 block">Phone (optional)</label>
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
                      className={clsx(
                        "w-full px-4 py-3 bg-ps-bg border rounded-xl outline-none focus:ring-2 text-sm font-semibold transition-all",
                        errors.phone
                          ? "border-ps-danger focus:ring-ps-danger/20"
                          : "border-ps-border focus:border-ps-accent focus:ring-ps-accent/20"
                      )}
                    />
                    {errors.phone && <p className="text-xs text-ps-danger font-medium mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.phone}</p>}
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="px-6 py-3 text-sm font-medium text-ps-ink-2 hover:bg-ps-bg rounded-xl transition-colors border border-ps-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={createLoading || !newUser.name || !newUser.email || !isPasswordValid(newUser.password)}
                  className="flex-1 py-3 text-sm font-medium bg-ps-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 disabled:cursor-default transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete User Modal ── */}
      {deleteModalData && (
        <div 
          className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
          onClick={() => setDeleteModalData(null)}
        >
          <div
            className="bg-ps-surface rounded-xl shadow-md max-w-sm w-full p-6 border border-ps-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ps-danger/10 flex items-center justify-center text-ps-danger shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ps-ink-1">Delete User?</h3>
                <p className="text-xs text-ps-ink-2 truncate">{deleteModalData.name}</p>
              </div>
            </div>
            
            <div className="bg-ps-danger/10 border border-ps-danger/30 rounded-lg p-3.5 mb-6">
              <p className="text-xs text-ps-danger leading-relaxed">
                This action cannot be undone. This will permanently delete the user's account and revoke access immediately.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalData(null)}
                className="flex-1 px-4 py-2 border border-ps-border text-ps-ink-1 font-medium rounded-lg text-sm hover:bg-ps-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deleteCountdown > 0}
                className={clsx(
                  "flex-1 py-2 font-medium rounded-lg text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2",
                  deleteCountdown > 0
                    ? "bg-ps-bg text-ps-ink-2 cursor-not-allowed border border-ps-border"
                    : "border border-[var(--sa-danger)] text-[var(--sa-danger)] hover:border-[var(--sa-line-strong)]"
                )}
              >
                {deleteCountdown > 0 ? `Wait ${deleteCountdown}s` : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Self Role Change Warning Modal ── */}
      {showSelfRoleWarning && (
        <div 
          className="fixed inset-0 bg-black/40 z-[10000] flex items-center justify-center p-4"
          onClick={() => setShowSelfRoleWarning(false)}
        >
          <div
            className="bg-ps-surface rounded-xl shadow-md max-w-sm w-full p-6 border border-ps-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ps-danger/10 flex items-center justify-center text-ps-danger shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ps-ink-1">Change Own Role?</h3>
                <p className="text-xs text-ps-ink-2 truncate">Target Role: <span className="capitalize text-ps-accent font-medium">{selectedRole}</span></p>
              </div>
            </div>
            
            <div className="bg-ps-danger/10 border border-ps-danger/30 rounded-lg p-3.5 mb-6">
              <p className="text-xs text-ps-danger leading-relaxed">
                You are stripping yourself of superadmin access.
                This action is irreversible from this account.
                You will be locked out immediately.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSelfRoleWarning(false)}
                className="flex-1 px-4 py-2 border border-ps-border text-ps-ink-1 font-medium rounded-lg text-sm hover:bg-ps-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSelfRoleChange}
                disabled={selfRoleCountdown > 0}
                className={clsx(
                  "flex-1 py-2 font-medium rounded-lg text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2",
                  selfRoleCountdown > 0
                    ? "bg-ps-bg text-ps-ink-2 cursor-not-allowed border border-ps-border"
                    : "border border-[var(--sa-danger)] text-[var(--sa-danger)] hover:border-[var(--sa-line-strong)]"
                )}
              >
                {selfRoleCountdown > 0 ? `Wait ${selfRoleCountdown}s` : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
