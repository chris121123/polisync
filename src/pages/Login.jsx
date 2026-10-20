import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Mail, Lock, AlertCircle, ShieldCheck, ShieldOff, Calendar, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { supabase } from '../lib/supabase';

const MAX_ATTEMPTS = 5;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login } = useGlobalState();
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
    if (!supabase || resetSent) return;
    try {
      await supabase.auth.resetPasswordForEmail(emailAddr.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      setResetSent(true);
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

        if (loggedInUser.must_change_password) {
          sessionStorage.setItem('temp_pass', trimmedPassword);
        }
        
        const roleRoutes = {
          admin: '/dashboard',
          parent: '/parent',
          teacher: '/teacher',
          therapist: '/therapist'
        };
        navigate(roleRoutes[loggedInUser.app_role] || '/dashboard');
      }
    } catch (_err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        setIsLockedOut(true);
        setError('');
        sendResetEmail(email);
      } else {
        const remaining = MAX_ATTEMPTS - nextAttempts;
        setError(
          remaining === 1
            ? 'Incorrect credentials. 1 attempt remaining before your account is locked.'
            : `Incorrect credentials. ${remaining} attempts remaining.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-ps-bg font-sans text-ps-ink-1 overflow-hidden transition-colors">
      
      {/* ── Left Decorative Brand Panel (Desktop) ────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-12 text-white flex-col justify-between overflow-hidden">
        {/* Abstract Floating Shapes (CSS-only) */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header inside Brand Panel */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <Stethoscope size={22} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">PoliSync</span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-100">
              <Sparkles size={14} className="text-amber-300" />
              Next-Gen Center Intelligence
            </div>
            <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight">
              Harmonizing special education with precision.
            </h1>
            <p className="text-indigo-100/80 text-base leading-relaxed">
              Unified scheduling, conflict-free student assignments, and transparent multi-role collaboration for modern developmental centers.
            </p>
          </div>

          {/* 3 Feature Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
              <Calendar size={18} className="text-indigo-200 mb-2" />
              <p className="text-xs font-bold leading-tight">Smart Scheduling</p>
              <p className="text-[10px] text-indigo-200/70 mt-1">Zero overlaps</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
              <Users size={18} className="text-indigo-200 mb-2" />
              <p className="text-xs font-bold leading-tight">Caseload Sync</p>
              <p className="text-[10px] text-indigo-200/70 mt-1">Realtime profiles</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
              <ShieldCheck size={18} className="text-indigo-200 mb-2" />
              <p className="text-xs font-bold leading-tight">Role Security</p>
              <p className="text-[10px] text-indigo-200/70 mt-1">Full compliance</p>
            </div>
          </div>
        </div>

        {/* Bottom Tagline / Trust */}
        <div className="relative z-10 text-xs text-indigo-200/60 font-medium">
          © {new Date().getFullYear()} PoliSync Healthcare Solutions • Designed for Specialized Learning
        </div>
      </div>

      {/* ── Right Form Container ───────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full space-y-8"
        >
          {/* Mobile Header Logo */}
          <div className="flex flex-col items-center lg:items-start space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-ps-accent flex items-center justify-center text-white mb-2 shadow-lg shadow-ps-accent/25 lg:hidden">
              <Stethoscope size={24} />
            </div>
            <h2 className="font-display font-bold text-3xl text-ps-ink-1">
              Sign In
            </h2>
            <p className="text-ps-ink-2 text-sm">
              Enter your center credentials to access your dashboard.
            </p>
          </div>

          {/* Lockout State */}
          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-xl">
                  <ShieldOff size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-200">Account Access Locked</p>
                  <p className="text-xs text-rose-700 dark:text-rose-400">Multiple failed attempts detected.</p>
                </div>
              </div>
              <p className="text-xs text-rose-600/90 dark:text-rose-300 leading-relaxed">
                For security reasons, your login has been temporarily disabled.
              </p>
              {resetSent ? (
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>A recovery email has been sent to <strong>{email.trim()}</strong>.</span>
                </div>
              ) : (
                <button
                  onClick={() => sendResetEmail(email)}
                  className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline inline-flex items-center gap-1"
                >
                  Send password reset email to {email.trim()} →
                </button>
              )}
            </motion.div>
          )}

          {/* General Error */}
          {error && !isLockedOut && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 text-amber-600" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ps-ink-2">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-ps-ink-2">
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
                <span className="text-[10px] uppercase font-bold text-ps-ink-2 tracking-wider">Security check</span>
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
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
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
          <div className="pt-6 border-t border-ps-border flex items-center justify-center gap-2 text-xs text-ps-ink-2 font-medium">
            <ShieldCheck size={14} className="text-ps-success" />
            <span>Secure access • Role-based • SPED Center</span>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default Login;