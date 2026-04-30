import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login } = useGlobalState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field) => {
    const newErrors = { ...fieldErrors };
    
    if (field === 'email') {
      if (!email.trim()) newErrors.email = 'Email address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';
      else delete newErrors.email;
    }
    
    if (field === 'password') {
      if (!password) newErrors.password = 'Password is required';
      else delete newErrors.password;
    }

    setFieldErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setError('');
    setLoading(true);
    
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser) {
        // Store password temporarily to prevent reusing it in the force-change-password modal
        if (loggedInUser.must_change_password) {
          sessionStorage.setItem('temp_pass', password);
        }
        
        const roleRoutes = {
          admin: '/dashboard',
          parent: '/parent',
          teacher: '/teacher',
          therapist: '/therapist'
        };
        navigate(roleRoutes[loggedInUser.app_role] || '/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
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

        {error && (
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' }));
                }}
                onBlur={() => validateField('email')}
                placeholder="name@polisync.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }));
                }}
                onBlur={() => validateField('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-slate-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-500/50'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500'
                }`}
              />
            </div>
            {fieldErrors.password && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "Sign In"}
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
