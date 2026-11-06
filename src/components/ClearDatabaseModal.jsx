import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Mail, Key, ShieldAlert, X } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { fetchWipeCounts } from '../state/settings';
import { AppModal } from './AppModal.jsx';

const WIPE_PHRASE = 'ERASE ALL DATA';
// A count that could not be read is shown as an em dash, never guessed.
const displayCount = (value, loading) => (loading ? '…' : value == null ? '—' : value);

const ClearDatabaseModal = ({ isOpen, onClose, onConfirm }) => {
  const { verifyPassword } = useGlobalState();
  const [step, setStep] = useState(1); // 1: Warning, 2: Auth
  const [countdown, setCountdown] = useState(30);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCountdown(30);
      setEmail('');
      setPassword('');
      setPassphrase('');
      setError('');
      setLoading(false);
    } else {
      setPassphrase('');
    }
  }, [isOpen]);

  // Preview only: a failed count never blocks the wipe.
  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    setCounts(null);
    fetchWipeCounts().then((next) => { if (active) setCounts(next); });
    return () => { active = false; };
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
    if (passphrase !== WIPE_PHRASE) return;

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
              <div className="itx-card w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <ShieldAlert size={28} strokeWidth={1.5} className="sa-t-danger" />
              </div>

              <h2 id="wipe-critical-title" className="mb-2 sa-t-danger text-[17px] font-medium">
                CRITICAL WARNING
              </h2>
              <p className="text-sm text-[var(--sa-text-secondary)] mb-6 leading-relaxed">
                You are about to <span className="font-medium sa-t-danger">PERMANENTLY ERASE</span> all data in the system. This includes all students, staff, rooms, and sessions. This action <span className="font-medium">CANNOT BE UNDONE</span>.
              </p>

              <div className="itx-card w-full mb-6 sm:mb-8 text-left">
                <div className="px-4">
                {[
                  ['Sessions', counts?.sessions],
                  ['Students', counts?.students],
                  ['Rooms', counts?.rooms],
                  ['Profiles', counts?.profiles == null ? null : Math.max(0, counts.profiles - 1)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 py-2">
                    <div>
                      <p className="sa-micro">{label}</p>
                      {label === 'Profiles' && <p className="sa-micro">current account retained</p>}
                    </div>
                    <p className="text-sm tabular-nums text-[var(--sa-text-primary)]">{displayCount(value, counts === null)}</p>
                  </div>
                ))}
                <p className="py-2 text-[11px] text-[var(--sa-text-muted)]">Audit log retained</p>
                </div>
              </div>

              <div className="sa-alert sa-alert--danger items-center w-full mb-6 sm:mb-8">
                <AlertTriangle size={14} strokeWidth={1.5} className="shrink-0" />
                <p className="text-xs sm:text-sm">Please wait {countdown} seconds to proceed...</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row w-full gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="sa-btn w-full sm:flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={countdown > 0}
                  className="sa-btn itx-danger w-full sm:flex-1 justify-center"
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
                  <h3 id="admin-verify-title" className="text-[15px] font-medium">Admin Verification</h3>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 itx-modal-close">
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
                  <label htmlFor="wipe-email" className="sa-label">Admin Email</label>
                  <div className="relative">
                    <Mail className="sa-field-icon" size={16} strokeWidth={1.5} />
                    <input
                      id="wipe-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="sa-input"
                      placeholder="admin@polisync.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="wipe-password" className="sa-label">Password</label>
                  <div className="relative">
                    <Key className="sa-field-icon" size={16} strokeWidth={1.5} />
                    <input
                      id="wipe-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="sa-input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="sa-label" htmlFor="wipe-passphrase">Type ERASE ALL DATA to confirm</label>
                  <div className="relative">
                    <ShieldAlert className="sa-field-icon" size={16} strokeWidth={1.5} />
                    <input
                      id="wipe-passphrase"
                      type="text"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="sa-input"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="sa-btn flex-1 justify-center"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndClear}
                  disabled={loading || !email || !password || passphrase !== WIPE_PHRASE}
                  className="sa-btn itx-danger flex-[2] justify-center"
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
