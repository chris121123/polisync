import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Mail, Key, ShieldAlert, X } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { AppModal } from './AppModal.jsx';

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

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={step === 1 ? 'wipe-critical-title' : 'admin-verify-title'}
      maxWidth={step === 1 ? 'max-w-lg' : 'max-w-md'}
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="p-5 sm:p-8 flex min-h-0 flex-col items-center text-center overflow-y-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border border-[var(--sa-danger)] flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <ShieldAlert size={28} strokeWidth={1.5} className="sa-t-danger" />
              </div>
              
              <h2 id="wipe-critical-title" className="text-lg sm:text-xl sa-t-danger mb-2">
                CRITICAL WARNING
              </h2>
              <p className="text-sm text-[var(--sa-text-secondary)] mb-6 leading-relaxed">
                You are about to <strong className="font-medium sa-t-danger">PERMANENTLY ERASE</strong> all data in the system. This includes all students, staff, rooms, and sessions. This action <strong className="font-medium">CANNOT BE UNDONE</strong>.
              </p>

              <div className="w-full border border-[var(--sa-danger)] p-3 sm:p-4 mb-6 sm:mb-8 text-xs sm:text-sm sa-t-danger">
                Please wait {countdown} seconds to proceed...
              </div>

              <div className="flex flex-col-reverse sm:flex-row w-full gap-3">
                <button
                  onClick={onClose}
                  className="sa-btn w-full sm:flex-1 justify-center min-h-11"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={countdown > 0}
                  className={clsx(
                    "w-full sm:flex-1 min-h-11 px-4 text-center text-[11px] uppercase tracking-[0.1em] transition-colors",
                    countdown > 0
                      ? "border border-[var(--sa-line-default)] text-[var(--sa-text-muted)] cursor-not-allowed"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="p-5 sm:p-8 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 sa-t-danger">
                  <Lock size={20} strokeWidth={1.5} />
                  <h3 id="admin-verify-title" className="text-lg">Admin Verification</h3>
                </div>
                <button onClick={onClose} aria-label="Close" className="shrink-0 border border-[var(--sa-line-default)] p-2 text-[var(--sa-text-secondary)] transition-colors hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]">
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <p className="text-sm text-[var(--sa-text-secondary)] mb-6">
                To finalize the database wipe, please enter your administrator credentials to verify your identity.
              </p>

              {error && (
                <div className="sa-alert sa-alert--danger items-center mb-6">
                  <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-8">
                <div>
                  <label className="sa-label">Admin Email</label>
                  <div className="relative">
                    <Mail className="sa-field-icon" size={16} strokeWidth={1.5} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="sa-input"
                      placeholder="admin@polisync.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="sa-label">Password</label>
                  <div className="relative">
                    <Key className="sa-field-icon" size={16} strokeWidth={1.5} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="sa-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="sa-btn flex-1 justify-center min-h-11 disabled:opacity-40 disabled:cursor-default"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyAndClear}
                  disabled={loading || !email || !password}
                  className="flex-[2] min-h-11 py-3 text-[11px] uppercase tracking-[0.1em] border border-[var(--sa-danger)] text-[var(--sa-danger)] transition-colors hover:border-[var(--sa-line-strong)] disabled:opacity-40 disabled:cursor-default flex justify-center items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
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
    </AppModal>
  );
};

export default ClearDatabaseModal;
