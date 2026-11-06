import React, { useEffect, useRef, useState } from 'react';
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
  const demoToggleRef = useRef(null);
  // supersedes ADR-019: superadmin demo is intentionally shown on the public login (user-approved)
  const demoAccounts = parseDemoAccounts(import.meta.env.VITE_DEMO_ACCOUNTS);
  const passwordHint = password.length > 0 && password !== password.trim();

  // Escape collapses the demo disclosure; its buttons unmount, so focus goes back to the toggle.
  useEffect(() => {
    if (!showDemo) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setShowDemo(false);
      demoToggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showDemo]);

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
        className="itx-card w-full max-w-[420px]"
      >
        <div className="p-6 sm:p-8 space-y-6">
          {/* Form Header */}
          <div className="flex flex-col items-start gap-2">
            <h1>Sign in to PoliSync</h1>
            <p>Accounts are created by the center’s administrator.</p>
          </div>

          {/* Lockout State */}
          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="alert"
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
                  <span className="break-words">A recovery email has been sent to <span className="font-medium">{email.trim()}</span>.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => sendResetEmail(email)}
                    className="sa-link min-h-[44px] self-start break-words text-left"
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
              role="alert"
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
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  className="sa-input"
                />
              </div>
              {fieldErrors.email && (
                <p id="login-email-error" className="mt-2 flex items-center gap-1 text-xs text-[var(--x-notice-ink)]">
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
                  aria-describedby={
                    [fieldErrors.password && 'login-password-error', passwordHint && 'login-password-hint']
                      .filter(Boolean).join(' ') || undefined
                  }
                  className="sa-input sa-input--reveal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  // keeps focus and caret in the input instead of firing its blur validation
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isLockedOut}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  data-reveal
                  className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="mt-2 flex items-center gap-1 text-xs text-[var(--x-notice-ink)]">
                  <AlertCircle size={12} strokeWidth={1.5} /> {fieldErrors.password}
                </p>
              )}
              {passwordHint && (
                <p id="login-password-hint" className="mt-2 text-xs text-[var(--ink-muted)]">Spaces at the start or end count as part of your password.</p>
              )}
            </div>

            {/* Failed-attempt marks */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isLockedOut && (
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <span className="text-xs text-[var(--ink-muted)]">Security check</span>
                <div
                  className="flex gap-1.5"
                  role="img"
                  aria-label={`${failedAttempts} of ${MAX_ATTEMPTS} attempts used`}
                >
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
              className="sa-btn sa-btn--primary sa-btn--block"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[var(--action-text)] border-t-transparent animate-spin" />
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
                ref={demoToggleRef}
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                aria-expanded={showDemo}
                aria-controls={showDemo ? 'demo-accounts-grid' : undefined}
                className="sa-btn w-full justify-center"
              >
                <span>Demo accounts</span>
              </button>
              <p className="text-xs text-center text-[var(--ink-muted)]">
                {showDemo ? 'Tap a role to sign in.' : 'Tap to show demo accounts.'}
              </p>
              {showDemo && (
                <div id="demo-accounts-grid" className="grid gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleDemoLogin(account)}
                      disabled={demoLoading}
                      className="sa-btn w-full justify-center"
                    >
                      {`Use ${DEMO_ROLE_LABELS[account.role]} demo`}
                    </button>
                  ))}
                </div>
              )}
              {showDemo && demoError && (
                <p role="alert" className="text-xs text-center text-[var(--x-notice-ink)]">{demoError}</p>
              )}
            </div>
          )}

          {/* Trust line at bottom */}
          <div className="flex flex-col items-center gap-3">
            <p className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
              <ShieldCheck size={14} strokeWidth={1.5} className="text-[var(--success)]" />
              <span>Secure access • Role-based • SPED Center</span>
            </p>
            <nav aria-label="About PoliSync" className="flex items-center gap-4">
              <Link to="/about" className="sa-link min-h-[44px]">About this system</Link>
              <Link to="/faq" className="sa-link min-h-[44px]">FAQ</Link>
            </nav>
          </div>
        </div>
      </motion.div>
    </AuthShell>
  );
};

export default Login;
