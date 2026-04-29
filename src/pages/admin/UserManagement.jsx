import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, Star, Calendar, User, Clock, Edit2, Trash2, UserPlus, Shield } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { supabase } from '../../lib/supabase';

const UserManagement = () => {
  const { staff, updateUserRole } = useGlobalState();
  const [activeTab, setActiveTab] = useState('users');
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [selectedRole, setSelectedRole] = useState('teacher');
  const [sessionNotes, setSessionNotes] = useState([]);
  const [filterRole, setFilterRole] = useState('all');

  const fetchSessionNotes = React.useCallback(async () => {
    const { data } = await supabase.from('session_notes').select('*, students(*)').order('created_at', { ascending: false });
    if (data) setSessionNotes(data);
  }, []);

  React.useEffect(() => { fetchSessionNotes(); }, [fetchSessionNotes]);

  const handleUpdateRole = async (userId) => {
    await updateUserRole(userId, selectedRole);
    setShowRoleModal(null);
  };

  const filteredStaff = filterRole === 'all'
    ? staff
    : staff.filter(s => {
        const roleMap = { admin: 'Lead Teacher', teacher: 'Teacher', therapist: 'Therapist', parent: 'Parent' };
        return s.role === roleMap[filterRole];
      });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h2>
          <p className="text-slate-500 font-medium mt-1">Manage roles and permissions for all users</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
            <UserPlus size={18} />
            Add Staff
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
                {role}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">App Role</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredStaff.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
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
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          member.app_role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                          member.app_role === 'therapist' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' :
                          member.app_role === 'parent' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        }`}>
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
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {member.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => { setShowRoleModal(member.id); setSelectedRole(member.app_role || 'teacher'); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Change role"
                        >
                          <Shield size={16} />
                        </button>
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

      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
    </div>
  );
};

export default UserManagement;