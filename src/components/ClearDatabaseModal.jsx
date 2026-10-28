import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Mail, Key, ShieldAlert, X } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';

const ClearDatabaseModal = ({ isOpen, onClose, onConfirm }) => {
  const { verifyPassword } = useGlobalState();
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
      const signInError = await verifyPassword(email, password);

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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 0 }}
            className="w-full max-w-lg bg-ps-surface rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden border border-ps-danger/30 max-h-[90vh] flex flex-col"
          >
            <div className="p-5 sm:p-8 flex flex-col items-center text-center overflow-y-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-ps-danger/15 rounded-full flex items-center justify-center mb-5 sm:mb-6 border-8 border-ps-danger/5 shrink-0">
                <ShieldAlert size={28} className="text-ps-danger sm:w-8 sm:h-8" />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-ps-danger mb-2">
                CRITICAL WARNING
              </h2>
              <p className="text-sm sm:text-base text-ps-ink-2 mb-6 font-medium leading-relaxed">
                You are about to <strong className="text-ps-danger">PERMANENTLY ERASE</strong> all data in the system. This includes all students, staff, rooms, and sessions. This action <strong>CANNOT BE UNDONE</strong>.
              </p>

              <div className="w-full bg-ps-danger/10 p-3 sm:p-4 rounded-xl border border-ps-danger/20 mb-6 sm:mb-8 text-xs sm:text-sm text-ps-danger font-bold">
                Please wait {countdown} seconds to proceed...
              </div>

              <div className="flex flex-col-reverse sm:flex-row w-full gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:flex-1 py-3 px-4 bg-ps-bg hover:bg-ps-border text-ps-ink-1 font-bold rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-ps-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={countdown > 0}
                  className={clsx(
                    "w-full sm:flex-1 py-3 px-4 font-bold rounded-xl transition-colors text-[11px] uppercase tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-ps-accent",
                    countdown > 0
                      ? "bg-ps-bg text-ps-ink-2 cursor-not-allowed"
                      : "border border-[var(--sa-danger)] text-[var(--sa-danger)] hover:border-[var(--sa-line-strong)]"
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
            exit={{ opacity: 0, scale: 0.95, y: 0 }}
            className="w-full max-w-md bg-ps-surface rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden border border-ps-danger/30 max-h-[90vh] flex flex-col"
          >
            <div className="p-5 sm:p-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-ps-danger">
                  <Lock size={24} />
                  <h3 className="text-xl font-bold">Admin Verification</h3>
                </div>
                <button onClick={onClose} className="p-2 text-ps-ink-2 hover:bg-ps-bg rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent">
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-ps-ink-2 mb-6 font-medium">
                To finalize the database wipe, please enter your administrator credentials to verify your identity.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-ps-danger/10 border border-ps-danger/20 rounded-xl text-xs text-ps-danger font-bold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ps-ink-2">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-ps-bg border border-ps-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ps-danger transition-all"
                      placeholder="admin@polisync.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ps-ink-2">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-ps-ink-2" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-ps-bg border border-ps-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-ps-danger transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 font-bold text-ps-ink-2 hover:bg-ps-bg rounded-xl transition-all disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ps-accent"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyAndClear}
                  disabled={loading || !email || !password}
                  className="flex-[2] py-3 font-bold border border-[var(--sa-danger)] text-[11px] uppercase tracking-[0.1em] text-[var(--sa-danger)] rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2 focus-visible:outline-2 focus-visible:outline-ps-accent"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
