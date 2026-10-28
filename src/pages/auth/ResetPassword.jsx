import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { PASSWORD_RULES } from '../../lib/passwordPolicy';
import AuthShell from './AuthShell';

const ResetPassword = () => {
  const { user, loading, completePasswordReset } = useGlobalState();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await completePasswordReset(password);
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not update the password. Please request a new link.');
    } finally {
      setSaving(false);
    }
  };

  const card = (children) => (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[420px] bg-ps-surface border border-ps-border p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-1">
          <h1 className="text-2xl text-ps-ink-1">Set a new password</h1>
          <p className="text-sm text-ps-ink-2">Choose a password you have not used here before.</p>
        </div>
        {children}
      </motion.div>
    </AuthShell>
  );

  if (loading) {
    return card(<p className="text-sm text-ps-ink-2">Verifying your reset link…</p>);
  }

  // checked before !user: completing the reset signs the recovery session out
  if (done) {
    return card(
      <div className="space-y-4">
        <div className="sa-alert sa-alert--success items-center">
          <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0" />
          <span>Password updated.</span>
        </div>
        <Link
          to="/login"
          className="sa-link w-full justify-center min-h-[44px]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!user) {
    return card(
      <div className="space-y-4">
        <div className="sa-alert sa-alert--danger items-center">
          <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
          <span>This reset link is invalid or has expired.</span>
        </div>
        <Link
          to="/forgot-password"
          className="sa-link w-full justify-center min-h-[44px]"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return card(
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="sa-alert sa-alert--danger items-center">
          <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ul className="text-xs text-ps-ink-2 space-y-1 leading-tight list-disc pl-4">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.id}>{rule.label}</li>
        ))}
      </ul>

      <div>
        <label htmlFor="reset-password" className="sa-label">
          New password
        </label>
        <div className="relative">
          <Lock className="sa-field-icon" size={16} strokeWidth={1.5} />
          <input
            id="reset-password"
            name="new-password"
            autoComplete="new-password"
            type="password"
            value={password}
            disabled={saving}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="sa-input disabled:opacity-40"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reset-password-confirm" className="sa-label">
          Confirm password
        </label>
        <div className="relative">
          <Lock className="sa-field-icon" size={16} strokeWidth={1.5} />
          <input
            id="reset-password-confirm"
            name="confirm-password"
            autoComplete="new-password"
            type="password"
            value={confirm}
            disabled={saving}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="sa-input disabled:opacity-40"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="sa-btn sa-btn--primary sa-btn--block disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-[var(--sa-gold)] border-t-transparent animate-spin" />
        ) : (
          <>
            <span>Update password</span>
            <ArrowRight size={14} strokeWidth={1.5} />
          </>
        )}
      </button>
    </form>
  );
};

export default ResetPassword;
