import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Shield, 
  Info,
  CheckCircle2,
  Database,
  Trash2,
  FileText,
  X,
  MapPin,
  BookOpen
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';
import ClearDatabaseModal from '../components/ClearDatabaseModal';

const SettingsCard = ({ title, icon: Icon, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
        <Icon size={20} />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </motion.div>
);

const ThemeCard = ({ type, active, onClick }) => {
  const isDark = type === 'dark';
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 group text-left",
        active 
          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" 
          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
      )}
    >
      <div className={clsx(
        "w-full aspect-[16/10] rounded-lg mb-4 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner",
        isDark ? "bg-slate-950" : "bg-slate-50"
      )}>
        {/* Mock UI Preview */}
        <div className="p-2 space-y-2">
          <div className={clsx("h-2 w-1/2 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200 dark:bg-slate-700")} />
          <div className="flex gap-2">
            <div className={clsx("h-6 w-6 rounded-md", isDark ? "bg-indigo-900/40" : "bg-indigo-100 dark:bg-indigo-900/50")} />
            <div className="flex-1 space-y-1">
              <div className={clsx("h-2 w-full rounded-full", isDark ? "bg-slate-800" : "bg-slate-200 dark:bg-slate-700")} />
              <div className={clsx("h-2 w-3/4 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200 dark:bg-slate-700")} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className={clsx(
            "p-1.5 rounded-lg",
            isDark ? "bg-slate-800 text-amber-400" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          )}>
            {isDark ? <Moon size={14} /> : <Sun size={14} />}
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{type} Mode</span>
        </div>
        {active && (
          <CheckCircle2 size={18} className="text-indigo-600 dark:text-indigo-400" />
        )}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-200 mt-2 font-medium">
        {isDark ? "Easier on the eyes in dark environments." : "Clean and crisp UI for well-lit spaces."}
      </p>
    </button>
  );
};

// ── Privacy Policy Modal ──────────────────────────────────────────────────────
const PrivacyModal = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Shield size={18} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Privacy Policy</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-800 dark:text-slate-100">Effective Date: 2024</p>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">1. Data We Collect</h4>
              <p>PoliSync collects personal information necessary to operate the SPED Center Management System, including student profiles, session records, staff information, and contact details provided during registration.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">2. How We Use Your Data</h4>
              <p>Data is used exclusively for scheduling therapy sessions, generating reports, managing center operations, and communicating with authorized staff and parents. We do not sell or share data with third parties.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">3. Data Storage & Security</h4>
              <p>All data is stored securely using Supabase (PostgreSQL) with Row-Level Security (RLS) policies. Access is role-based and strictly controlled. Passwords are encrypted and never stored in plain text.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">4. Parent & Guardian Rights</h4>
              <p>Parents and guardians may request to view, correct, or delete their child's data by contacting the center administrator. Access to student records is restricted to authorized staff and linked guardians only.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">5. Data Retention</h4>
              <p>Session and student records are retained for the duration of the student's enrollment and up to 1 year after their last active session, unless earlier deletion is requested.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">6. Contact</h4>
              <p>For privacy concerns, contact your system administrator or the center management directly.</p>
            </section>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Terms of Use Modal ────────────────────────────────────────────────────────
const TermsModal = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <BookOpen size={18} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Terms of Use</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-800 dark:text-slate-100">Effective Date: 2024</p>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">1. Authorized Use</h4>
              <p>PoliSync is intended solely for authorized staff, administrators, therapists, teachers, and parents of the SPED center. Unauthorized access is strictly prohibited.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">2. Account Responsibility</h4>
              <p>Users are responsible for maintaining the confidentiality of their login credentials. You must immediately notify the administrator if you suspect unauthorized access to your account.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">3. Prohibited Actions</h4>
              <p>Users may not attempt to access data outside their assigned role, reverse-engineer the system, share credentials with others, or use the system for any purpose other than center management.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">4. System Availability</h4>
              <p>The system is provided as-is. The center is not liable for data loss due to network issues, user error, or force majeure events. Regular backups are recommended.</p>
            </section>

            <section>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">5. Modifications</h4>
              <p>The center reserves the right to update these terms. Continued use of the system constitutes acceptance of any changes.</p>
            </section>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Settings = () => {
  const { darkMode, setDarkMode, clearDatabase, loading, appRole } = useGlobalState();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-200 font-medium">Manage center preferences and your workspace experience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Appearance Settings */}
        <SettingsCard title="Appearance" icon={Sun}>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Theme Selection">
              <ThemeCard 
                type="light" 
                active={!darkMode} 
                onClick={() => setDarkMode(false)} 
              />
              <ThemeCard 
                type="dark" 
                active={darkMode} 
                onClick={() => setDarkMode(true)} 
              />
            </div>
          </div>
        </SettingsCard>

        {/* System & Privacy */}
        <SettingsCard title="System & Privacy" icon={Shield}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Info size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Software Version</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">v2.4.0-stable</span>
            </div>

            <button
              id="settings-view-privacy"
              onClick={() => setIsPrivacyOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Privacy Policy</span>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">View →</span>
            </button>

            <button
              id="settings-view-terms"
              onClick={() => setIsTermsOpen(true)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Terms of Use</span>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">View →</span>
            </button>
          </div>
        </SettingsCard>

        {/* Center Information */}
        <SettingsCard title="Center Information" icon={MapPin}>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Center Name</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">PoliSync SPED Center</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Physical Address</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">123 Therapy Lane, Quezon City, Metro Manila, Philippines</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Operating Hours</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monday – Friday, 8:00 AM – 5:00 PM</p>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              To update center information, contact your system administrator.
            </p>
          </div>
        </SettingsCard>

        {/* Role Guide */}
        <SettingsCard title="Role Guide" icon={Info}>
          <div className="space-y-3">
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/40 rounded-xl">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">🔧 Super Admin</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Technical role. Manages user accounts, promotes/demotes roles, clears database, and views audit logs. Full system access.</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">📋 Admin</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Operational role. Manages schedules, rooms, sessions, and the student/staff directory. Day-to-day center management.</p>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/40 rounded-xl">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-1">🩺 Therapist / Teacher</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Service providers — conduct sessions, write session notes, and mark availability. Also called "Provider" in the scheduling system.</p>
            </div>
            <div className="p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-900/40 rounded-xl">
              <p className="text-xs font-bold text-pink-700 dark:text-pink-300 mb-1">👨‍👩‍👧 Parent / Guardian</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">Limited access. Can view their linked child's schedule and progress. Cannot access other student data.</p>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Note: All roles share the same URL. The system redirects each user to their own dashboard after login.
            </p>
          </div>
        </SettingsCard>

        {/* Database Management - Super Admin Only */}
        {appRole === 'superadmin' && (
          <SettingsCard title="Database Management" icon={Database}>
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Warning: Clearing the database will permanently delete all rooms, students, and sessions. Only the system administrator profile will remain.
                </p>
              </div>

              <button 
                id="settings-clear-database"
                onClick={() => setIsClearModalOpen(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-900/30 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50"
              >
                <Trash2 size={18} />
                Clear All Data (Reset System)
              </button>
            </div>
          </SettingsCard>
        )}

      </div>

      <ClearDatabaseModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={clearDatabase}
      />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};

export default Settings;
