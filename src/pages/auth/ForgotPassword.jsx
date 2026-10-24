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
        className="bg-white/95 dark:bg-ps-surface/95 backdrop-blur rounded-2xl max-w-md w-full space-y-6 my-auto p-6 sm:p-8"
      >
        <div className="flex flex-col items-start space-y-2">
          <h2 className="font-display font-semibold text-3xl text-ps-ink-1">Forgot password</h2>
          <p className="text-ps-ink-2 text-sm">We will email you a link to set a new password.</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-ps-success/10 border border-ps-success/20 flex items-center gap-3 text-sm text-ps-success font-medium">
              <ShieldCheck size={18} className="shrink-0" />
              <span>If an account exists for that address, a recovery email has been sent.</span>
            </div>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center min-h-[44px] rounded-lg text-xs font-medium text-ps-accent hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-ps-danger/10 border border-ps-danger/20 flex items-center gap-3 text-ps-danger text-sm">
                <AlertCircle size={18} className="shrink-0 text-ps-danger" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-xs font-medium text-ps-ink-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
                <input
                  id="forgot-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  disabled={sending}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@center.com"
                  className="w-full pl-11 pr-4 py-3 bg-ps-surface border border-ps-border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 bg-ps-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send recovery link</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center min-h-[44px] rounded-lg text-xs font-medium text-ps-accent hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
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
