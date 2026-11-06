import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalState } from '../../context/GlobalStateContext';
import { ROLE_LABELS } from '../../lib/rolePalette';
import { PASSWORD_RULES, isPasswordValid, validatePassword } from '../../lib/passwordPolicy';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import ItxSelect from '../../components/ItxSelect';

const NAME_PATTERN = /^[A-Za-zÀ-ÿÑñ .,'-]+$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^09\d{9}$/;
const normalizePhone = (phone) => phone.replace(/[\s-]/g, '');

const fieldClass = 'w-full border bg-[var(--sa-bg-base)] px-3 text-[var(--sa-text-primary)]';
// The border colour is chosen, never raced: two border-* utilities in one
// className resolve by CSS order, not by class order (Rooms does the same).
const fieldTone = (invalid) => (invalid
  ? 'border-[var(--sa-danger)]'
  : 'border-[var(--sa-line-default)]');

const ROLE_TILES = [
  { value: 'superadmin', help: 'Full system access + user management + platform config' },
  { value: 'admin', help: 'Schedule, directory, and room operations' },
  { value: 'teacher', help: 'Manage classes and attendance' },
  { value: 'therapist', help: 'Session notes and progress' },
  { value: 'parent', help: 'View child schedule' },
];

// One segmented track for every role choice: sunken ground, raised surface cell,
// no gold border. Native buttons keep keyboard/aria semantics.
const RoleTrack = ({ value, onChange, help }) => (
  <div>
    <p className="sa-label">Role</p>
    <div
      role="group"
      aria-label="Role"
      className="grid grid-cols-5 gap-0.5 bg-[var(--surface-sunken)] p-1"
      style={{ borderRadius: 'var(--x-radius-control)' }}
    >
      {ROLE_TILES.map(({ value: role }) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          aria-pressed={value === role}
          className={clsx(
            'min-h-11 whitespace-nowrap border px-0.5 transition-colors',
            value === role
              ? 'border-[var(--line-subtle)] bg-[var(--surface)] text-[var(--ink-primary)]'
              : 'border-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-primary)]'
          )}
          style={{ borderRadius: 'var(--x-radius-menu)' }}
        >
          <span className="text-[11px] sm:text-xs">{ROLE_LABELS[role] || role}</span>
        </button>
      ))}
    </div>
    {help && <p className="mt-2 text-xs text-[var(--sa-text-muted)]">{help}</p>}
  </div>
);

const UserManagement = () => {
  const {
    staff,
    updateUserRole,
    adminCreateUser,
    adminDeleteUser,
    toggleUserActive,
    user,
  } = useGlobalState();
  const location = useLocation();
  const navigate = useNavigate();

  const [showRoleModal, setShowRoleModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  // The row kebab outlives the menu item that opens a dialog, so it is the focus anchor to restore.
  const rowMenuTriggerRef = useRef(null);

  // Escape closes the open kebab menu and returns focus to its trigger.
  useEffect(() => {
    if (!openMenuId) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpenMenuId(null);
      rowMenuTriggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openMenuId]);

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

  useEffect(() => {
    const openCreate = location.state?.openCreate;
    if (openCreate) {
      setShowCreateModal(true);
      setCreateError('');
      setErrors({});
      setCreateSuccess('');
    }
    if (openCreate) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.openCreate, navigate]);

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

  const filteredStaff = (filterRole === 'all' ? staff : staff.filter(s => s.app_role === filterRole))
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (s.name && s.name.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q));
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 animate-page-entry">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="sa-title">Identity &amp; Access</h1>
          <p className="sa-sub">Accounts, roles, and access state.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); setErrors({}); }}
            className="sa-btn sa-btn--primary"
          >
            <UserPlus size={16} strokeWidth={1.5} />
            Create User
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Role Filters + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:flex-wrap">
          <div className="flex flex-wrap items-center">
            {['all', 'superadmin', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setFilterRole(role)}
                aria-pressed={filterRole === role}
                className={clsx(
                  'itx-tab whitespace-nowrap tabular-nums',
                  filterRole === role && 'is-active'
                )}
              >
                {role === 'all' ? 'All' : (ROLE_LABELS[role] || role)} {role !== 'all' && `(${staff.filter(s => s.app_role === role).length})`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:ml-auto sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sa-text-muted)]" size={16} strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              aria-label="Search users"
              className="sa-input"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="itx-card overflow-x-auto">
          {/* 4px cell pad on >=sm: the 36px kebab sets the row, landing it on the 45px tier. */}
          <table className="itx-table text-left sm:min-w-[640px] sm:[&_td]:py-1!">
            <thead>
              <tr>
                <th scope="col" className="text-left">User</th>
                <th scope="col" className="text-left">App Role</th>
                <th scope="col" className="hidden text-left xl:table-cell">Department</th>
                <th scope="col" className="text-left">Email</th>
                <th scope="col" className="text-left">Status</th>
                <th scope="col" className="text-right">
                  <span className="xl:hidden sr-only">Actions</span>
                  <span className="hidden xl:inline">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member, index) => (
                <tr key={member.id}>
                  <td data-label="Name" data-mobile="title">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--surface-sunken)] text-xs font-medium text-[var(--ink-avatar)]"
                        style={{ borderRadius: 'var(--x-radius-chip)' }}
                      >
                        {member.name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0 sm:max-w-[120px] xl:max-w-[260px]">
                        <p className="sa-row-title">{member.name}</p>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role" data-mobile="role">
                    <span className="sa-badge whitespace-nowrap">{ROLE_LABELS[member.app_role] || member.app_role || 'teacher'}</span>
                  </td>
                  <td data-label="Department" data-mobile="meta" className="hidden xl:table-cell">
                    <span className="text-sm text-[var(--sa-text-muted)]">{member.department || 'General'}</span>
                  </td>
                  <td data-label="Email" data-mobile="meta">
                    <span className="block truncate text-sm text-[var(--sa-text-muted)] sm:max-w-[110px] xl:max-w-[240px]">{member.email}</span>
                  </td>
                  <td data-label="Status" data-mobile="meta">
                    <span className={clsx(
                      'sa-badge whitespace-nowrap',
                      member.is_active !== false && 'sa-badge--positive'
                    )}>
                      {member.is_active === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td data-mobile="action" className="text-right">
                    <div className="relative flex justify-end text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          rowMenuTriggerRef.current = e.currentTarget;
                          setOpenMenuId(openMenuId === member.id ? null : member.id);
                        }}
                        aria-label={`Actions for ${member.name}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === member.id}
                        className="flex h-11 w-11 items-center justify-center text-[var(--sa-text-muted)] hover:bg-[var(--sa-surface-2)] hover:text-[var(--sa-text-primary)] transition-colors sm:h-9 sm:w-9"
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
                            'absolute right-0 w-48 itx-menu z-50',
                            // The table scrolls (min-w), so it clips; the last rows open upward.
                            index >= 2 && index >= filteredStaff.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'
                          )}>
                            <div className="p-1" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                handleToggleActive(member.id, member.is_active !== false);
                                setOpenMenuId(null);
                              }}
                              className={clsx(
                                "w-full flex min-h-11 items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors hover:bg-[var(--sa-surface-2)] hover:text-[var(--sa-text-primary)]",
                                member.is_active === false ? "sa-t-warm" : "text-[var(--sa-text-secondary)]"
                              )}
                            >
                              {member.is_active === false ? <ToggleLeft size={16} strokeWidth={1.5} /> : <ToggleRight size={16} strokeWidth={1.5} />}
                              {member.is_active === false ? 'Activate User' : 'Deactivate User'}
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                rowMenuTriggerRef.current?.focus();
                                setShowRoleModal(member.id);
                                setSelectedRole(member.app_role || 'teacher');
                                setOpenMenuId(null);
                              }}
                              className="w-full flex min-h-11 items-center gap-2.5 px-3 py-2 text-[13px] text-left text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-surface-2)] hover:text-[var(--sa-text-primary)]"
                            >
                              <Shield size={16} strokeWidth={1.5} />
                              Change Role
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleDeleteUser(member)}
                              className="w-full flex min-h-11 items-center gap-2.5 px-3 py-2 text-[13px] text-left sa-t-danger transition-colors hover:bg-[var(--sa-surface-2)]"
                            >
                              <Trash2 size={16} strokeWidth={1.5} />
                              Delete User
                            </button>
                            </div>
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
                    type="button"
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

      {/* ── Change Role Modal ── */}
      <AppModal isOpen={Boolean(showRoleModal)} onClose={() => setShowRoleModal(null)} labelledBy="change-role-title" maxWidth="max-w-md">
        <ModalHeader
          titleId="change-role-title"
          title="Change User Role"
          onClose={() => setShowRoleModal(null)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {user && user.id === showRoleModal && selectedRole !== 'superadmin' ? (
            <div className="sa-alert sa-alert--danger mb-4 items-start">
              <ShieldAlert size={18} strokeWidth={1.5} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs mb-1">Critical Warning</p>
                <p className="text-xs leading-tight">
                  You are changing your OWN role. You will lose administrative access and be locked out of this console.
                </p>
              </div>
            </div>
          ) : (
            <div className="sa-alert mb-4 items-start">
              <ShieldAlert size={16} strokeWidth={1.5} className="text-[var(--sa-text-muted)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--sa-text-muted)] leading-tight">
                This will immediately update access permissions across the system.
              </p>
            </div>
          )}

          <RoleTrack
            value={selectedRole}
            onChange={setSelectedRole}
            help={ROLE_TILES.find(({ value }) => value === selectedRole)?.help}
          />
        </div>

        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => handleUpdateRole(showRoleModal)}
            className="sa-btn sa-btn--primary flex-1 justify-center"
          >
            Update Role
          </button>
          <button
            type="button"
            onClick={() => setShowRoleModal(null)}
            className="sa-btn justify-center"
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
              {errors.name && <p className="text-xs sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.name}</p>}
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
              {errors.email && <p className="text-xs sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.email}</p>}
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
                  data-reveal
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center cursor-pointer text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && <p className="text-xs sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.password}</p>}
              {!errors.password && <p className="text-xs text-[var(--sa-text-muted)] mt-1">User will be prompted to change password on initial login.</p>}
              <ul id="temp_password_rules" className="mt-2 bg-[var(--sa-surface-warm)] p-3 space-y-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const met = !validatePassword(newUser.password).some((r) => r.id === rule.id);
                  return (
                    <li key={rule.id} className={clsx('flex items-center gap-1.5 text-xs', met ? 'text-[var(--sa-text-primary)]' : 'text-[var(--sa-text-muted)]')}>
                      {met ? <Check size={12} strokeWidth={1.5} /> : <X size={12} strokeWidth={1.5} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Role */}
            <RoleTrack
              value={newUser.role}
              onChange={(role) => setNewUser(p => ({ ...p, role }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {newUser.role !== 'parent' && (
                <div>
                  <label htmlFor="new_user_department" className="sa-label">Department</label>
                  <ItxSelect
                    id="new_user_department"
                    value={newUser.department}
                    onChange={(department) => setNewUser(p => ({ ...p, department }))}
                    className={clsx(fieldClass, 'border-[var(--sa-line-default)]')}
                    options={['General', 'SPED', 'Rehab', 'Playschool', 'Admin'].map((department) => ({ value: department, label: department }))}
                  />
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
                {errors.phone && <p className="text-xs sa-t-danger mt-1 flex items-center gap-1"><AlertCircle size={10} strokeWidth={1.5} /> {errors.phone}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={handleCancelCreate}
            className="sa-btn justify-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={createLoading || !newUser.name || !newUser.email || !isPasswordValid(newUser.password)}
            className="sa-btn sa-btn--primary flex-1 justify-center disabled:cursor-not-allowed"
          >
            {createLoading ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
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
          <div className="sa-alert sa-alert--danger">
            <p className="text-xs leading-relaxed">
              This action cannot be undone. This will permanently delete the user's account and revoke access immediately.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => setDeleteModalData(null)}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDeleteUser}
            disabled={deleteCountdown > 0}
            className="sa-btn itx-danger flex-1 justify-center"
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
          description={<>Target Role: <span className="sa-t-warm">{ROLE_LABELS[selectedRole] || selectedRole}</span></>}
          onClose={() => setShowSelfRoleWarning(false)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="sa-alert sa-alert--danger">
            <p className="text-xs leading-relaxed">
              You are stripping yourself of IT Manager access.
              This action is irreversible from this account.
              You will be locked out immediately.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => setShowSelfRoleWarning(false)}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSelfRoleChange}
            disabled={selfRoleCountdown > 0}
            className="sa-btn itx-danger flex-1 justify-center"
          >
            {selfRoleCountdown > 0 ? `Wait ${selfRoleCountdown}s` : 'Confirm'}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default UserManagement;
