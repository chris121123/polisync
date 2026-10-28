import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import AuthShell from './AuthShell';

const ForgotPassword = () => {
  const { requestPasswordReset } = useGlobalState();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    setError('');
    setSending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (_) {
      setError('We could not send the recovery email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-[420px] bg-ps-surface border border-ps-border p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-1">
          <h1 className="text-2xl text-ps-ink-1">Forgot password</h1>
          <p className="text-sm text-ps-ink-2">We will email you a link to set a new password.</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="sa-alert sa-alert--success items-center">
              <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0" />
              <span>If an account exists for that address, a recovery email has been sent.</span>
            </div>
            <Link
              to="/login"
              className="sa-link w-full justify-center min-h-[44px]"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="sa-alert sa-alert--danger items-center">
                <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="forgot-email" className="sa-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="sa-field-icon" size={16} strokeWidth={1.5} />
                <input
                  id="forgot-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  disabled={sending}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@center.com"
                  className="sa-input disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="sa-btn sa-btn--primary sa-btn--block disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-[var(--sa-gold)] border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Send recovery link</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>

            <Link
              to="/login"
              className="sa-link w-full justify-center min-h-[44px]"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </motion.div>
    </AuthShell>
  );
};

export default ForgotPassword;
