import React, { useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ShieldCheck, ShieldOff, ArrowRight, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { parseDemoAccounts, DEMO_ROLE_LABELS } from '../../lib/demoAccounts';
import AuthShell from './AuthShell';
import { AUTH_ROLES } from './roles';

const MAX_ATTEMPTS = 5;

const Login = () => {
  const { role } = useParams();
  const activeRole = AUTH_ROLES.find(r => r.id === role);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login, logout, requestPasswordReset } = useGlobalState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const demoAccounts = parseDemoAccounts(import.meta.env.VITE_DEMO_ACCOUNTS);

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

  const handleForgotPassword = async () => {
    if (resetSent) return;
    if (!validateField('email')) return;
    await sendResetEmail(email);
  };

  const performLogin = async (emailValue, passwordValue) => {
    setLoading(true);
    
    try {
      const loggedInUser = await login(emailValue, passwordValue);
      if (loggedInUser) {
        if (loggedInUser.app_role !== role) {
          await logout();
          setError('These credentials do not match the selected role.');
          return;
        }

        setFailedAttempts(0);
        setIsLockedOut(false);

        const roleRoutes = {
          superadmin: '/dashboard',
          admin: '/dashboard',
          parent: '/dashboard',
          teacher: '/dashboard',
          therapist: '/dashboard'
        };
        navigate(roleRoutes[loggedInUser.app_role] || '/dashboard');
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

  const handleDemoLogin = async (account) => {
    if (loading || isLockedOut) return;
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    await performLogin(account.email, account.password);
  };

  if (!activeRole) return <Navigate to="/login" replace />;

  return (
    <AuthShell>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/95 dark:bg-ps-surface/95 backdrop-blur rounded-2xl max-w-md w-full space-y-6 sm:space-y-8 my-auto p-6 sm:p-8"
        >
          {/* Form Header */}
          <div className="flex flex-col items-start space-y-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium text-ps-accent hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent"
            >
              <ArrowLeft size={14} /> Choose a different role
            </Link>
            <h2 className="font-display font-semibold text-3xl text-ps-ink-1">
              Sign in
            </h2>
            <p className="text-ps-ink-2 text-sm">
              Signing in as {activeRole.label}.
            </p>
          </div>

          {/* Lockout State */}
          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 rounded-2xl bg-ps-danger/10 border border-ps-danger/20 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-ps-danger/10 text-ps-danger rounded-xl">
                  <ShieldOff size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ps-ink-1">Account Access Locked</p>
                  <p className="text-xs text-ps-danger">Multiple failed attempts detected.</p>
                </div>
              </div>
              <p className="text-xs text-ps-danger leading-relaxed">
                For security reasons, your login has been temporarily disabled.
              </p>
              {resetSent ? (
                <div className="text-xs text-ps-success font-medium bg-ps-success/10 p-3 rounded-xl border border-ps-success/20 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-ps-success shrink-0" />
                  <span>A recovery email has been sent to <strong>{email.trim()}</strong>.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => sendResetEmail(email)}
                    className="inline-flex items-center min-h-[44px] text-xs font-medium text-ps-danger hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent"
                  >
                    Send password reset email to {email.trim()} →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLockedOut(false); setFailedAttempts(0); setError(''); }}
                    className="min-h-[44px] text-xs font-semibold text-ps-accent hover:underline text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent"
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
              className="p-4 rounded-xl bg-ps-danger/10 border border-ps-danger/20 flex items-center gap-3 text-ps-danger text-sm"
            >
              <AlertCircle size={18} className="shrink-0 text-ps-danger" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-medium text-ps-ink-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
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
                  className={`w-full pl-11 pr-4 py-3 bg-ps-surface border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 ${
                    fieldErrors.email
                      ? 'border-ps-danger ring-2 ring-ps-danger/20'
                      : 'border-ps-border focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-ps-danger font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-ps-ink-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
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
                  className={`w-full pl-11 pr-12 py-3 bg-ps-surface border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 ${
                    fieldErrors.password
                      ? 'border-ps-danger ring-2 ring-ps-danger/20'
                      : 'border-ps-border focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  // keeps focus and caret in the input instead of firing its blur validation
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={isLockedOut}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-ps-ink-2 hover:text-ps-ink-1 disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-ps-danger font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {fieldErrors.password}
                </p>
              )}
              {password.length > 0 && password !== password.trim() && (
                <p className="text-xs text-ps-warn font-medium">Spaces at the start or end count as part of your password.</p>
              )}
            </div>

            {/* Segmented Attempt Dots */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isLockedOut && (
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <span className="text-xs font-medium text-ps-ink-2">Security check</span>
                <div className="flex gap-1.5">
                  {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i < failedAttempts 
                          ? 'bg-ps-danger ring-2 ring-ps-danger/30' 
                          : 'bg-ps-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isLockedOut}
              className="w-full py-3.5 bg-ps-primary hover:opacity-90 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLockedOut ? (
                'Access Locked'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Forgot Password */}
            {resetSent ? (
              <div className="text-xs text-ps-success font-medium bg-ps-success/10 p-3 rounded-xl border border-ps-success/20 flex items-center gap-2">
                <ShieldCheck size={16} className="text-ps-success shrink-0" />
                <span>A recovery email has been sent to <strong>{email.trim()}</strong>.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || isLockedOut}
                className="w-full inline-flex items-center justify-center min-h-[44px] rounded-lg text-xs font-medium text-ps-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
              >
                Forgot password?
              </button>
            )}
          </form>

          {/* Demo role accounts (only when VITE_DEMO_ACCOUNTS is set) */}
          {demoAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ps-ink-2">Demo accounts</h3>
                <p className="text-xs text-ps-ink-2">Tap a role to sign in.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleDemoLogin(account)}
                    disabled={loading || isLockedOut}
                    aria-label={`Sign in as demo ${DEMO_ROLE_LABELS[account.role]}`}
                    className="min-h-[44px] px-2 rounded-xl border border-ps-border bg-ps-bg hover:bg-ps-accent-soft text-xs font-medium text-ps-ink-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-ps-accent"
                  >
                    {DEMO_ROLE_LABELS[account.role]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trust Badge at bottom */}
          <div className="pt-6 border-t border-ps-border flex flex-col items-center gap-3 text-xs text-ps-ink-2 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-ps-success" />
              <span>Secure access • Role-based • SPED Center</span>
            </div>
            <nav aria-label="About PoliSync" className="flex items-center gap-4">
              <Link to="/about" className="inline-flex items-center min-h-[44px] cursor-pointer hover:text-ps-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent">About this system</Link>
              <Link to="/faq" className="inline-flex items-center min-h-[44px] cursor-pointer hover:text-ps-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-accent">FAQ</Link>
            </nav>
          </div>
        </motion.div>
    </AuthShell>
  );
};

export default Login;