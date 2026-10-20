import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldAlert, AlertCircle } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

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
          navigator.credentials.store(cred).catch(() => { });
        }
      } catch (_err) { /* silently ignore credential save errors */ }

      sessionStorage.removeItem('temp_pass');
    } catch (_err) {
      setError(_err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-ps-surface rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-ps-border"
      >
        <div className="p-8 pb-6 bg-ps-warn/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-ps-warn/20 text-ps-warn rounded-full flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-ps-ink-1">Action Required</h2>
          <p className="text-sm text-ps-ink-2 mt-2">
            For security reasons, you must change your temporary password before accessing your account.
          </p>
        </div>

        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="p-3 bg-ps-danger/10 border border-ps-danger/20 text-ps-danger rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ps-ink-1 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Min 8 characters"
                className="w-full pl-10 pr-10 py-3 bg-ps-bg border border-ps-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ps-warn/20 focus:border-ps-warn text-ps-ink-1 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ps-ink-2 hover:text-ps-ink-1 focus-visible:outline-2 focus-visible:outline-ps-accent"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ps-ink-1 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-10 py-3 bg-ps-bg border border-ps-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ps-warn/20 focus:border-ps-warn text-ps-ink-1 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3 bg-ps-warn dark:bg-amber-700 hover:bg-ps-warn/90 disabled:opacity-50 disabled:cursor-default disabled:hover:bg-ps-warn text-white font-bold rounded-xl transition-colors flex justify-center items-center h-[48px] focus-visible:outline-2 focus-visible:outline-ps-accent"
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
              className="w-full py-3 text-ps-ink-2 hover:text-ps-ink-1 font-bold rounded-xl hover:bg-ps-bg transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
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
