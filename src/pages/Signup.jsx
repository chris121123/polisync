import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, User, Briefcase, Mail, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Teacher',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { signup } = useGlobalState();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Stethoscope size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Dr. Jane Doe"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Role / Department</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="Lead Teacher">Lead Teacher</option>
                <option value="Occupational Therapist">Occupational Therapist</option>
                <option value="Physiotherapist">Physiotherapist</option>
                <option value="Speech Therapist">Speech Therapist</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@polisync.com"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
              {formData.password && (
                <span className={clsx(
                  "text-[10px] font-bold flex items-center gap-1",
                  formData.password.length >= 8 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {formData.password.length >= 8 ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {formData.password.length >= 8 ? "Strong" : "Too short (min 8 chars)"}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={clsx(
                  "w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all",
                  formData.password && formData.password.length < 8 ? "border-rose-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.email || !formData.password || formData.password.length < 8}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Create Account"}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
