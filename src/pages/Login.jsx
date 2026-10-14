import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Mail, Lock, AlertCircle, ShieldCheck, ShieldOff } from 'lucide-react';
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
      // Trim both fields before sending to Supabase
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      const loggedInUser = await login(trimmedEmail, trimmedPassword);
      if (loggedInUser) {
        // Reset attempt counter on success
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
        // Auto-send password reset link
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors duration-300"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Stethoscope size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-200 text-sm mt-1 text-center">
            Sign in to your PoliSync account to manage your center.
          </p>
        </div>

        {/* Lockout Banner */}
        {isLockedOut && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-3 mb-2">
              <ShieldOff size={20} className="text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Account Access Locked</p>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed">
              Too many failed login attempts were detected. For your security, access has been temporarily locked.
            </p>
            {resetSent ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-3 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-lg">
                <ShieldCheck size={14} />
                A password reset link has been sent to <strong>{email.trim()}</strong>. Check your inbox.
              </p>
            ) : (
              <button
                onClick={() => sendResetEmail(email)}
                className="mt-3 text-xs font-bold text-red-700 dark:text-red-400 underline"
              >
                Send password reset link to {email.trim()}
              </button>
            )}
          </motion.div>
        )}

        {/* General Error */}
        {error && !isLockedOut && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm"
          >
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.email ? 'text-red-400' : 'text-slate-400 dark:text-slate-300'}`} size={18} />
              <input
                type="email"
                value={email}
                disabled={isLockedOut}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' }));
                }}
                onBlur={() => validateField('email')}
                placeholder="name@polisync.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'
                }`}
              />
            </div>
            {fieldErrors.email && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.password ? 'text-red-400' : 'text-slate-400 dark:text-slate-300'}`} size={18} />
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
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'
                }`}
              />
            </div>
            {fieldErrors.password && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.password}</p>}
          </div>

          {/* Attempt counter warning */}
          {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isLockedOut && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i < failedAttempts ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLockedOut}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLockedOut ? 'Access Locked' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck size={14} />
          <span>Access is managed by your administrator.</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
