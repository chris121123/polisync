import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Mail, Lock, AlertCircle, ShieldCheck, ShieldOff, ArrowRight } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedOut) return;
    if (!validateForm()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      const loggedInUser = await login(trimmedEmail, trimmedPassword);
      if (loggedInUser) {
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

  return (
    <div className="min-h-screen w-full flex bg-ps-bg font-sans text-ps-ink-1 overflow-hidden transition-colors">
      
      {/* ── Left Decorative Brand Panel (Desktop) ────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-ps-accent dark:bg-indigo-600 p-12 text-white flex-col justify-between overflow-hidden">
        {/* Top Header inside Brand Panel */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <Stethoscope size={22} className="text-white" />
          </div>
          <span className="font-display font-semibold text-xl tracking-tight">PoliSync</span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight">
              PoliSync is scheduling and student-record software for special-education and therapy centers.
            </h1>
          </div>
        </div>

        {/* Bottom Tagline / Trust */}
        <div className="relative z-10 text-xs text-white/80 font-medium">
          © {new Date().getFullYear()} PoliSync Healthcare Solutions • Designed for Specialized Learning
        </div>
      </div>

      {/* ── Right Form Container ───────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 min-h-screen overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full space-y-6 sm:space-y-8 my-auto py-6"
        >
          {/* Mobile Header Logo */}
          <div className="flex flex-col items-center lg:items-start space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-ps-accent dark:bg-indigo-600 flex items-center justify-center text-white mb-2 shadow-sm shadow-ps-accent/25 lg:hidden">
              <Stethoscope size={24} />
            </div>
            <h2 className="font-display font-semibold text-3xl text-ps-ink-1">
              Sign In
            </h2>
            <p className="text-ps-ink-2 text-sm">
              Enter your center credentials to access your dashboard.
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
                    className="text-xs font-medium text-ps-danger hover:underline inline-flex items-center gap-1"
                  >
                    Send password reset email to {email.trim()} →
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLockedOut(false); setFailedAttempts(0); setError(''); }}
                    className="text-xs font-semibold text-ps-accent hover:underline text-left"
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
              <label className="block text-xs font-medium text-ps-ink-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
                <input
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
              <label className="block text-xs font-medium text-ps-ink-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ps-ink-2" size={18} />
                <input
                  type="password"
                  value={password}
                  disabled={isLockedOut}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }));
                  }}
                  onBlur={() => validateField('password')}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3 bg-ps-surface border rounded-xl text-sm font-medium transition-all outline-none disabled:opacity-50 ${
                    fieldErrors.password
                      ? 'border-ps-danger ring-2 ring-ps-danger/20'
                      : 'border-ps-border focus:border-ps-accent focus:ring-4 focus:ring-ps-accent/10'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-ps-danger font-medium flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {fieldErrors.password}
                </p>
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
              className="w-full py-3.5 bg-ps-accent dark:bg-indigo-600 hover:opacity-90 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
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
          </form>

          {/* Trust Badge at bottom */}
          <div className="pt-6 border-t border-ps-border flex flex-col items-center gap-3 text-xs text-ps-ink-2 font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-ps-success" />
              <span>Secure access • Role-based • SPED Center</span>
            </div>
            <nav aria-label="About PoliSync" className="flex items-center gap-4">
              <Link to="/about" className="hover:text-ps-accent hover:underline">About this system</Link>
              <Link to="/faq" className="hover:text-ps-accent hover:underline">FAQ</Link>
            </nav>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default Login;