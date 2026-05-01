import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Mail, Key, ShieldAlert, X } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';

const ClearDatabaseModal = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState(1); // 1: Warning, 2: Auth
  const [countdown, setCountdown] = useState(30);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCountdown(30);
      setEmail('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Handle countdown
  useEffect(() => {
    let timer;
    if (isOpen && step === 1 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, step, countdown]);

  const handleVerifyAndClear = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Re-authenticate to verify credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error('Invalid credentials. Verification failed.');
      }

      // Credentials are valid. Proceed with clear.
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-100 dark:border-rose-900/30"
          >
            <div className="p-6 md:p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6 border-8 border-rose-50 dark:border-rose-900/10">
                <ShieldAlert size={32} className="text-rose-600 dark:text-rose-400" />
              </div>
              
              <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-2">
                CRITICAL WARNING
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium leading-relaxed">
                You are about to <strong className="text-rose-600 dark:text-rose-400">PERMANENTLY ERASE</strong> all data in the system. This includes all students, staff, rooms, and sessions. This action <strong>CANNOT BE UNDONE</strong>.
              </p>

              <div className="w-full bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800 mb-8 text-sm text-rose-700 dark:text-rose-300 font-bold">
                Please wait {countdown} seconds to proceed...
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={countdown > 0}
                  className={clsx(
                    "flex-1 py-3 px-4 font-bold rounded-xl transition-all",
                    countdown > 0
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 dark:shadow-none"
                  )}
                >
                  {countdown > 0 ? `Wait ${countdown}s` : 'I Understand, Proceed'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-100 dark:border-rose-900/30"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <Lock size={24} />
                  <h3 className="text-xl font-bold">Admin Verification</h3>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                To finalize the database wipe, please enter your administrator credentials to verify your identity.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      placeholder="admin@polisync.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyAndClear}
                  disabled={loading || !email || !password}
                  className="flex-[2] py-3 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Wipe Database'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClearDatabaseModal;
