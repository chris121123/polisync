import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ShieldAlert, AlertCircle } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { validatePassword } from '../lib/passwordPolicy';

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
    const failing = validatePassword(newPassword);
    if (failing.length > 0) {
      setError(`Password must have: ${failing.map(r => r.label).join(', ')}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
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
    } catch (_err) {
      setError(_err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[var(--sa-surface-1)] max-w-md w-full overflow-hidden border border-[var(--sa-line-default)] max-h-[90vh] flex flex-col"
      >
        <div className="p-6 sm:p-8 pb-6 flex flex-col items-center text-center shrink-0 border-b border-[var(--sa-line-hairline)]">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border border-[var(--sa-line-default)] sa-t-warm flex items-center justify-center mb-3 sm:mb-4">
            <ShieldAlert size={28} strokeWidth={1.5} className="sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-lg sm:text-xl text-[var(--sa-text-primary)]">Action Required</h2>
          <p className="text-sm text-[var(--sa-text-secondary)] mt-2">
            For security reasons, you must change your temporary password before accessing your account.
          </p>
        </div>

        <div className="p-6 sm:p-8 pt-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="sa-alert sa-alert--danger items-start">
              <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="sa-label">New Password</label>
            <div className="relative">
              <Lock className="sa-field-icon" size={18} strokeWidth={1.5} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Min 8 characters"
                className="sa-input sa-input--reveal"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0.5 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center text-[var(--sa-text-muted)] transition-colors hover:text-[var(--sa-text-primary)]"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <div>
            <label className="sa-label">Confirm New Password</label>
            <div className="relative">
              <Lock className="sa-field-icon" size={18} strokeWidth={1.5} />
              <input
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Confirm new password"
                className="sa-input"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !newPassword || !confirmPassword}
              className="sa-btn sa-btn--primary sa-btn--block disabled:opacity-40 disabled:cursor-default"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="sa-btn sa-btn--block disabled:opacity-40 disabled:cursor-default"
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
