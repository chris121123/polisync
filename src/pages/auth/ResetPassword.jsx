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
        className="bg-white/95 dark:bg-ps-surface/95 backdrop-blur rounded-2xl max-w-md w-full space-y-6 my-auto p-6 sm:p-8"
      >
        <div className="flex flex-col items-start space-y-2">
          <h2 className="font-display font-semibold text-3xl text-ps-ink-1">Set a new password</h2>
          <p className="text-ps-ink-2 text-sm">Choose a password you have not used here before.</p>
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
        <div className="p-4 rounded-xl bg-ps-success/10 border border-ps-success/20 flex items-center gap-3 text-sm text-ps-success font-medium">
          <ShieldCheck size={18} className="shrink-0" />
          <span>Password updated.</span>
        </div>
        <Link
          to="/login"
          className="w-full inline-flex items-center justify-center min-h-[44px] rounded-lg text-xs font-medium text-ps-accent hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!user) {
    return card(
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-ps-danger/10 border border-ps-danger/20 flex items-center gap-3 text-sm text-ps-danger font-medium">
          <AlertCircle size={18} className="shrink-0" />
          <span>This reset link is invalid or has expired.</span>
        </div>
        <Link
          to="/forgot-password"
          className="w-full inline-flex items-center justify-center min-h-[44px] rounded-lg text-xs font-medium text-ps-accent hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return card(
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 rounded-xl bg-ps-danger/10 border border-ps-danger/20 flex items-center gap-3 text-ps-danger text-sm">
          <AlertCircle size={18} className="shrink-0 text-ps-danger" />
          <span>{error}</span>
        </div>
      )}

      <ul className="text-xs text-ps-ink-2 space-y-1 list-disc pl-4">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.id}>{rule.label}</li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <label htmlFor="reset-password" className="block text-xs font-medium text-ps-ink-2">
          New password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
          <input
            id="reset-password"
            name="new-password"
            autoComplete="new-password"
            type="password"
            value={password}
            disabled={saving}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-11 pr-4 py-3 bg-ps-surface border border-ps-border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reset-password-confirm" className="block text-xs font-medium text-ps-ink-2">
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
          <input
            id="reset-password-confirm"
            name="confirm-password"
            autoComplete="new-password"
            type="password"
            value={confirm}
            disabled={saving}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-11 pr-4 py-3 bg-ps-surface border border-ps-border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 bg-ps-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>Update password</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
};

export default ResetPassword;
