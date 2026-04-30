import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldAlert, AlertCircle } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';

const ForceChangePasswordModal = () => {
  const { user, changePassword, logout } = useGlobalState();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user?.must_change_password) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (newPassword === sessionStorage.getItem('temp_pass')) {
      setError('New password must be different from the temporary password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await changePassword(newPassword);
      
      // Explicitly ask Chrome to save the new password
      try {
        if (window.PasswordCredential && navigator.credentials && user?.email) {
          const cred = new window.PasswordCredential({
            id: user.email,
            password: newPassword,
            name: user.name || user.email,
          });
          navigator.credentials.store(cred).catch(() => {});
        }
      } catch (err) {}

      sessionStorage.removeItem('temp_pass');
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-8 pb-6 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Action Required</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            For security reasons, you must change your temporary password before accessing your account.
          </p>
        </div>

        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-default disabled:hover:bg-amber-500 text-white font-bold rounded-xl transition-colors flex justify-center items-center h-[48px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel and Logout
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForceChangePasswordModal;
