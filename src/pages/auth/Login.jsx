import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ShieldCheck, ShieldOff, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { parseDemoAccounts, DEMO_ROLE_LABELS } from '../../lib/demoAccounts';
import AuthShell from './AuthShell';

const MAX_ATTEMPTS = 5;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login, requestPasswordReset } = useGlobalState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  // supersedes ADR-019: superadmin demo is intentionally shown on the public login (user-approved)
  const demoAccounts = parseDemoAccounts(import.meta.env.VITE_DEMO_ACCOUNTS);

  const handleDemoLogin = async (account) => {
    setDemoError('');
    setDemoLoading(true);
    try {
      await login(account.email, account.password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.message || '';
      const isAuthFail = err?.status === 400 || err?.code === 'invalid_credentials' || msg.toLowerCase().includes('invalid login credentials');
      setDemoError(isAuthFail ? msg : 'Demo sign-in failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field) => {
    const newErrors = { ...fieldErrors };
    
    if (field === 'email') {
      if (!email.trim()) newErrors.email = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = 'Please enter a valid email address';
      else delete newErrors.email;
    }
    
    if (field === 'password') {
      if (!password.trim()) newErrors.password = 'Password is required';
      else delete newErrors.password;
    }

    setFieldErrors(newErrors);
    return field === 'email' ? !newErrors.email : !newErrors.password;
  };

  const sendResetEmail = async (emailAddr) => {
    if (resetSent) return;
    try {
      const sent = await requestPasswordReset(emailAddr);
      if (sent) setResetSent(true);
    } catch (_) {
      // silent — don't reveal whether email exists
    }
  };

  const performLogin = async (emailValue, passwordValue) => {
    setLoading(true);
    
    try {
      const loggedInUser = await login(emailValue, passwordValue);
      if (loggedInUser) {
        setFailedAttempts(0);
        setIsLockedOut(false);

        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[Login Error]:', err);
      const errMsg = err?.message || '';
      const isAuthFail = err?.status === 400 || err?.code === 'invalid_credentials' || errMsg.toLowerCase().includes('invalid login credentials');

      if (isAuthFail) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setIsLockedOut(true);
          setError('Account temporarily locked due to multiple failed attempts.');
          sendResetEmail(email);
        } else {
          const remaining = MAX_ATTEMPTS - nextAttempts;
          setError(
            remaining === 1
              ? 'Incorrect email or password. 1 attempt remaining before account lockout.'
              : `Incorrect email or password. ${remaining} attempts remaining.`
          );
        }
      } else {
        // Network, CORS, rate-limit, or server error
        setError(errMsg || 'Connection error. Please verify network connection to Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedOut) return;
    if (!validateForm()) return;
    setError('');
    await performLogin(email.trim(), password);
  };

  return (
    <AuthShell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-[420px] bg-ps-surface border border-ps-border p-6 sm:p-8 space-y-6"
        >
          {/* Form Header */}
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-2xl text-ps-ink-1">Sign in to PoliSync</h1>
            <p className="text-sm text-ps-ink-2">Accounts are created by the center’s administrator.</p>
          </div>

          {/* Lockout State */}
          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="sa-alert sa-alert--danger flex-col"
            >
              <div className="flex items-center gap-3">
                <ShieldOff size={16} strokeWidth={1.5} className="shrink-0" />
                <div>
                  <p className="text-sm">Account Access Locked</p>
                  <p className="text-xs">Multiple failed attempts detected.</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed">
                For security reasons, your login has been temporarily disabled.
              </p>
              {resetSent ? (
                <div className="sa-alert sa-alert--success items-center">
                  <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0" />
                  <span>A recovery email has been sent to <strong className="font-medium">{email.trim()}</strong>.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => sendResetEmail(email)}
                    className="sa-link min-h-[44px] self-start"
                  >
                    Send password reset email to {email.trim()} →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLockedOut(false); setFailedAttempts(0); setError(''); }}
                    className="sa-link min-h-[44px] self-start"
                  >
                    Reset attempt counter
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* General Error */}
          {error && !isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="sa-alert sa-alert--danger items-center"
            >
              <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="sa-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="sa-field-icon" size={16} strokeWidth={1.5} />
                <input
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  disabled={isLockedOut}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' }));
                  }}
                  onBlur={() => validateField('email')}
                  placeholder="name@center.com"
                  aria-invalid={fieldErrors.email ? 'true' : undefined}
                  className="sa-input disabled:opacity-40"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 flex items-center gap-1 text-xs text-ps-danger">
                  <AlertCircle size={12} strokeWidth={1.5} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="sa-label">
                Password
              </label>
              <div className="relative">
                <Lock className="sa-field-icon" size={16} strokeWidth={1.5} />
                <input
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={isLockedOut}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }));
                  }}
                  onBlur={() => validateField('password')}
                  placeholder="••••••••"
                  aria-invalid={fieldErrors.password ? 'true' : undefined}
                  className="sa-input sa-input--reveal disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  // keeps focus and caret in the input instead of firing its blur validation
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isLockedOut}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-ps-ink-2 hover:text-ps-ink-1 disabled:opacity-40 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 flex items-center gap-1 text-xs text-ps-danger">
                  <AlertCircle size={12} strokeWidth={1.5} /> {fieldErrors.password}
                </p>
              )}
              {password.length > 0 && password !== password.trim() && (
                <p className="mt-1 text-xs text-ps-warn">Spaces at the start or end count as part of your password.</p>
              )}
            </div>

            {/* Failed-attempt marks */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isLockedOut && (
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <span className="text-xs text-ps-ink-2">Security check</span>
                <div className="flex gap-1.5">
                  {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                    <div
                      key={i}
                      className={i < failedAttempts ? 'sa-attempt sa-attempt--spent' : 'sa-attempt'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || demoLoading || isLockedOut}
              className="sa-btn sa-btn--primary sa-btn--block disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[var(--sa-gold)] border-t-transparent animate-spin" />
              ) : isLockedOut ? (
                'Access Locked'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>

            {/* Forgot Password */}
            <Link
              to="/forgot-password"
              className="sa-link w-full justify-center min-h-[44px]"
            >
              Forgot password?
            </Link>
          </form>

          {/* Demo accounts (rendered only when VITE_DEMO_ACCOUNTS is set) */}
          {demoAccounts.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                aria-expanded={showDemo}
                aria-controls="demo-accounts-grid"
                className="w-full flex flex-col items-center justify-center gap-1 min-h-[44px] px-3 border border-ps-border bg-transparent transition-colors cursor-pointer hover:border-[var(--sa-line-strong)] hover:bg-[var(--sa-surface-2)]"
              >
                <span className="block text-xs text-ps-ink-1">Demo accounts</span>
                <span className="block text-xs text-ps-ink-2">{showDemo ? 'Tap a role to sign in.' : 'Tap to show demo accounts.'}</span>
              </button>
              {showDemo && (
                <div id="demo-accounts-grid" className="flex flex-wrap gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleDemoLogin(account)}
                      disabled={demoLoading}
                      className="grow basis-[calc(50%-0.25rem)] min-h-[44px] px-2 border border-ps-border bg-transparent text-xs text-ps-ink-1 hover:border-[var(--sa-line-strong)] hover:bg-[var(--sa-surface-2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {`Use ${DEMO_ROLE_LABELS[account.role]} demo`}
                    </button>
                  ))}
                </div>
              )}
              {showDemo && demoError && (
                <p role="alert" className="text-xs text-ps-danger text-center">{demoError}</p>
              )}
            </div>
          )}

          {/* Trust line at bottom */}
          <div className="pt-6 border-t border-ps-border flex flex-col items-center gap-3">
            <p className="flex items-center gap-2 text-[11px] text-ps-ink-2">
              <ShieldCheck size={14} strokeWidth={1.5} className="text-ps-success" />
              <span>Secure access • Role-based • SPED Center</span>
            </p>
            <nav aria-label="About PoliSync" className="flex items-center gap-4">
              <Link to="/about" className="sa-link min-h-[44px]">About this system</Link>
              <Link to="/faq" className="sa-link min-h-[44px]">FAQ</Link>
            </nav>
          </div>
        </motion.div>
    </AuthShell>
  );
};

export default Login;
