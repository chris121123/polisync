import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Star, User, UserPlus, Shield, X, Mail, Lock, Briefcase, Phone, Building, Eye, EyeOff, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2, MoreVertical, Trash2 } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

const UserManagement = () => {
  const { staff, updateUserRole, adminCreateUser, toggleUserActive } = useGlobalState();
  const [activeTab, setActiveTab] = useState('users');
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [sessionNotes, setSessionNotes] = useState([]);
  const [filterRole, setFilterRole] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);

  // ── Create User Modal State ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher',
    department: 'General',
    phone: '',
  });

  const fetchSessionNotes = React.useCallback(async () => {
    const { data } = await supabase.from('session_notes').select('*, students(*)').order('created_at', { ascending: false });
    if (data) setSessionNotes(data);
  }, []);

  React.useEffect(() => { fetchSessionNotes(); }, [fetchSessionNotes]);

  const handleUpdateRole = async (userId) => {
    await updateUserRole(userId, selectedRole);
    setShowRoleModal(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newUser.name.trim()) newErrors.name = 'Full name is required';
    
    if (!newUser.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeleteUser = async (member) => {
    if (window.confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', member.id);
        if (error) throw error;
        // The real-time listener in GlobalStateContext will handle the local state update
        setOpenMenuId(null);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user: ' + error.message);
      }
    }
  };

  const validateField = (field) => {
    const newErrors = { ...errors };
    
    if (field === 'name') {
      if (!newUser.name.trim()) newErrors.name = 'Full name is required';
      else delete newErrors.name;
    }
    
    if (field === 'email') {
      if (!newUser.email.trim()) newErrors.email = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) newErrors.email = 'Please enter a valid email address';
      else delete newErrors.email;
    }
    
    if (field === 'password') {
      if (!newUser.password) newErrors.password = 'Temporary password is required';
      else if (newUser.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      else delete newErrors.password;
    }

    setErrors(newErrors);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    try {
      await adminCreateUser(newUser);
      setCreateSuccess(`User "${newUser.name}" created successfully!`);
      setNewUser({ name: '', email: '', password: '', role: 'teacher', department: 'General', phone: '' });
      setErrors({});
      // Auto-close after success delay
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess('');
      }, 2000);
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    await toggleUserActive(userId, !currentActive);
  };

  const filteredStaff = filterRole === 'all'
    ? staff
    : staff.filter(s => s.app_role === filterRole);

  const roleColors = {
    admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    therapist: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    parent: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    teacher: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h2>
          <p className="text-slate-500 font-medium mt-1">Create accounts, manage roles and permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <UserPlus size={18} />
            Create User
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {['users', 'reports', 'activity'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['all', 'admin', 'teacher', 'therapist', 'parent'].map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  filterRole === role
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {role} {role !== 'all' && `(${staff.filter(s => s.app_role === role).length})`}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="relative">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tl-2xl">User</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">App Role</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredStaff.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 group-last:rounded-bl-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                            {member.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
                            <p className="text-xs text-slate-400">{member.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleColors[member.app_role] || roleColors.teacher}`}>
                          {member.app_role || 'teacher'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{member.department || 'General'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">{member.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          member.is_active === false
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        )}>
                          {member.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right group-last:rounded-br-2xl">
                        <div className="relative flex justify-end">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>

                          <AnimatePresence>
                            {openMenuId === member.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden ring-4 ring-black/5"
                                >
                                  <div className="p-1.5 flex flex-col gap-1">
                                    <button
                                      onClick={() => {
                                        handleToggleActive(member.id, member.is_active !== false);
                                        setOpenMenuId(null);
                                      }}
                                      className={clsx(
                                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors",
                                        member.is_active === false
                                          ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                      <Shield size={16} />
                                      Change Role
                                    </button>

                                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                                    <button
                                      onClick={() => handleDeleteUser(member)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={16} />
                                      Delete User
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStaff.length === 0 && (
                <div className="p-12 text-center">
                  <User size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No users found with this role</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Session Notes & Progress Reports</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {sessionNotes.map(note => (
              <div key={note.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{note.students?.name || 'Student'}</span>
                      <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-full">{note.note_type}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{note.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(r => (
                          <Star key={r} size={12} className={note.rating >= r ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} fill={note.rating >= r ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {sessionNotes.length === 0 && (
              <div className="p-12 text-center">
                <FileText size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No session notes recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Change Role Modal ── */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Change User Role</h3>
              <div className="space-y-2 mb-4">
                {['admin', 'teacher', 'therapist', 'parent'].map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                      selectedRole === role
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="capitalize">{role}</span>
                    <p className="text-xs text-slate-400 mt-0.5 font-normal">
                      {role === 'admin' ? 'Full system access' :
                       role === 'teacher' ? 'Manage classes and attendance' :
                       role === 'therapist' ? 'Session notes and progress' :
                       'View child schedule'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateRole(showRoleModal)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  Update Role
                </button>
                <button
                  onClick={() => setShowRoleModal(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Create User Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Create New User</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Admin-provisioned account</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setErrors({}); }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {createError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm">
                    <CheckCircle2 size={16} />
                    {createSuccess}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.name ? 'text-red-400' : 'text-slate-400'}`} size={16} />
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => {
                        setNewUser(p => ({ ...p, name: e.target.value }));
                        if (errors.name) setErrors(p => ({ ...p, name: '' }));
                      }}
                      onBlur={() => validateField('name')}
                      placeholder="Jane Doe"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.name
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} size={16} />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => {
                        setNewUser(p => ({ ...p, email: e.target.value }));
                        if (errors.email) setErrors(p => ({ ...p, email: '' }));
                      }}
                      onBlur={() => validateField('email')}
                      placeholder="jane@polisync.com"
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Temporary Password</label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${errors.password ? 'text-red-400' : 'text-slate-400'}`} size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => {
                        setNewUser(p => ({ ...p, password: e.target.value }));
                        if (errors.password) setErrors(p => ({ ...p, password: '' }));
                      }}
                      onBlur={() => validateField('password')}
                      placeholder="Min 8 characters"
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.password
                          ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.password}</p>}
                  {!errors.password && <p className="text-[11px] text-slate-400 mt-1">User will be asked to change password on first login.</p>}
                </div>

                {/* Role + Department row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition-all appearance-none"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="therapist">Therapist</option>
                        <option value="parent">Parent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        value={newUser.department}
                        onChange={(e) => setNewUser(p => ({ ...p, department: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition-all appearance-none"
                      >
                        <option value="General">General</option>
                        <option value="SPED">SPED</option>
                        <option value="Rehab">Rehab</option>
                        <option value="Playschool">Playschool</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone (optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+63 9XX XXX XXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {createLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Create Account
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setErrors({}); }}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;