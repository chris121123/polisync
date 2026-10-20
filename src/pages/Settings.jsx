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
  Laptop,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';
import ClearDatabaseModal from '../components/ClearDatabaseModal';

const ThemeCard = ({ type, active, onClick, icon: Icon, description }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-col p-5 rounded-2xl border-2 transition-all group text-left w-full",
        active 
          ? "border-ps-accent bg-ps-accent-soft/40 shadow-sm" 
          : "border-ps-border bg-ps-surface hover:border-ps-ink-2/30"
      )}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            "p-2 rounded-xl transition-colors",
            active ? "bg-ps-accent dark:bg-indigo-600 text-white" : "bg-ps-bg text-ps-ink-2"
          )}>
            <Icon size={16} />
          </div>
          <span className="text-sm font-medium text-ps-ink-1 capitalize">{type}</span>
        </div>
        {active && (
          <CheckCircle2 size={18} className="text-ps-accent" />
        )}
      </div>

      <p className="text-xs text-ps-ink-2 font-medium leading-relaxed">
        {description}
      </p>
    </button>
  );
};

// ── Slide-Over Drawer for Legal Documents ─────────────────────────────────────
const SlideOverDrawer = ({ isOpen, onClose, title, icon: Icon, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 transition-opacity"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-ps-surface border-l border-ps-border shadow-md flex flex-col"
          >
            <div className="p-6 border-b border-ps-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-ps-accent-soft text-ps-accent">
                  <Icon size={18} />
                </div>
                <h3 className="font-display font-semibold text-lg text-ps-ink-1">{title}</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-ps-bg text-ps-ink-2">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-ps-ink-2 leading-relaxed custom-scrollbar">
              {children}
            </div>

            <div className="p-6 border-t border-ps-border bg-ps-bg/30">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-ps-accent dark:bg-indigo-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>
);

const Settings = () => {
  const { darkMode, setDarkMode, clearDatabase, loading, appRole } = useGlobalState();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const navItems = [
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'center', label: 'Center Details', icon: MapPin },
    { id: 'roles', label: 'Role Guide', icon: Info },
    { id: 'privacy', label: 'Legal & Privacy', icon: Shield },
    ...(appRole === 'superadmin' ? [{ id: 'system', label: 'System & Danger', icon: Database, danger: true }] : [])
  ];

  return (
    <div className="space-y-8 animate-page-entry">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-ps-ink-1">Settings</h1>
        <p className="text-ps-ink-2 font-medium">Configure workspace preferences, roles, and administrative options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Vertical Categories Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-ps-surface p-2 rounded-2xl border border-ps-border space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all text-left",
                  activeTab === item.id 
                    ? "bg-ps-accent dark:bg-indigo-600 text-white shadow-md shadow-ps-accent/20" 
                    : item.danger 
                      ? "text-ps-danger hover:bg-ps-danger/10" 
                      : "text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1"
                )}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-ps-surface border border-ps-border rounded-2xl">
            <p className="text-xs font-medium text-ps-ink-2">Environment</p>
            <p className="text-xs font-medium text-ps-ink-1 mt-1">PoliSync Core v2.4.0</p>
            <p className="text-xs font-medium text-ps-success mt-0.5">● Connected to Supabase Engine</p>
          </div>
        </div>

        {/* Right Active Content Panel */}
        <div className="lg:col-span-3">
          <div className="bg-ps-surface rounded-2xl p-6 lg:p-8 border border-ps-border shadow-sm min-h-[500px]">
            
            {/* 1. Appearance */}
            {activeTab === 'appearance' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-semibold text-ps-ink-1">Appearance & Interface</h2>
                  <p className="text-xs text-ps-ink-2 mt-1">Select your preferred color theme across all tools.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ThemeCard 
                    type="Light" 
                    active={!darkMode} 
                    onClick={() => setDarkMode(false)} 
                    icon={Sun}
                    description="Crisp high-contrast theme optimized for bright clinic lighting."
                  />
                  <ThemeCard 
                    type="Dark" 
                    active={darkMode} 
                    onClick={() => setDarkMode(true)} 
                    icon={Moon}
                    description="Dark surfaces with lighter text across all tools."
                  />
                </div>
              </motion.div>
            )}

            {/* 2. Center Information */}
            {activeTab === 'center' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-semibold text-ps-ink-1">Center Registry</h2>
                  <p className="text-xs text-ps-ink-2 mt-1">Official developmental and clinical facility credentials.</p>
                </div>

                <div className="divide-y divide-ps-border">
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ps-ink-2">Facility Name</span>
                    <span className="text-sm font-medium text-ps-ink-1">PoliSync Developmental Center</span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ps-ink-2">Location</span>
                    <span className="text-sm font-medium text-ps-ink-1 text-right">123 Therapy Lane, QC, Metro Manila</span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ps-ink-2">Hours</span>
                    <span className="text-sm font-medium text-ps-ink-1">Mon – Fri, 8:00 AM – 5:00 PM</span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ps-ink-2">License ID</span>
                    <span className="text-sm font-medium text-ps-ink-1">SPED-2026-PH-0994</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Role Guide */}
            {activeTab === 'roles' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-semibold text-ps-ink-1">Access Roles & Capabilities</h2>
                  <p className="text-xs text-ps-ink-2 mt-1">Hierarchical permission breakdown across center staff.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-2xl border-l-4 border-l-violet-600 bg-ps-bg/40 space-y-1">
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-400">Super Administrator</span>
                    <p className="text-xs text-ps-ink-2">Complete platform sovereignty: user promotion, database resets, and cryptographic audit inspections.</p>
                  </div>
                  <div className="p-4 rounded-2xl border-l-4 border-l-amber-600 bg-ps-bg/40 space-y-1">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Center Administrator</span>
                    <p className="text-xs text-ps-ink-2">Operational oversight: automated schedule generation, conflict arbitration, directory, and room logistics.</p>
                  </div>
                  <div className="p-4 rounded-2xl border-l-4 border-l-teal-600 bg-ps-bg/40 space-y-1">
                    <span className="text-xs font-medium text-teal-700 dark:text-teal-400">Clinical Therapist</span>
                    <p className="text-xs text-ps-ink-2">Clinical execution: daily therapy caseload review, progress note authoring, and qualitative ratings.</p>
                  </div>
                  <div className="p-4 rounded-2xl border-l-4 border-l-ps-accent bg-ps-bg/40 space-y-1">
                    <span className="text-xs font-medium text-ps-accent">Faculty Teacher</span>
                    <p className="text-xs text-ps-ink-2">Classroom management: daily session tracking and unified multi-student attendance recording.</p>
                  </div>
                  <div className="p-4 rounded-2xl border-l-4 border-l-pink-600 bg-ps-bg/40 space-y-1">
                    <span className="text-xs font-medium text-pink-700 dark:text-pink-400">Parent / Guardian</span>
                    <p className="text-xs text-ps-ink-2">Client view: real-time verified schedules, program tracking, and requirement uploads for linked children.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. Privacy & Terms */}
            {activeTab === 'privacy' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-semibold text-ps-ink-1">Compliance & Policies</h2>
                  <p className="text-xs text-ps-ink-2 mt-1">Review legal standards, confidentiality, and data handling protocols.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border border-ps-border bg-ps-bg/30 space-y-4">
                    <div className="p-3 bg-ps-surface rounded-xl border border-ps-border w-fit text-ps-accent">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ps-ink-1">Privacy Agreement</h3>
                      <p className="text-xs text-ps-ink-2 mt-1">Data privacy frameworks and student record protections under RLS.</p>
                    </div>
                    <button 
                      id="settings-view-privacy"
                      onClick={() => setIsPrivacyOpen(true)}
                      className="text-xs font-medium text-ps-accent hover:underline flex items-center gap-1"
                    >
                      Read Statement <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl border border-ps-border bg-ps-bg/30 space-y-4">
                    <div className="p-3 bg-ps-surface rounded-xl border border-ps-border w-fit text-ps-accent">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ps-ink-1">Platform Terms</h3>
                      <p className="text-xs text-ps-ink-2 mt-1">Acceptable use mandates, institutional responsibilities, and uptime rules.</p>
                    </div>
                    <button 
                      id="settings-view-terms"
                      onClick={() => setIsTermsOpen(true)}
                      className="text-xs font-medium text-ps-accent hover:underline flex items-center gap-1"
                    >
                      Read Terms <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. Danger Zone (Superadmin only) */}
            {activeTab === 'system' && appRole === 'superadmin' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="text-xl font-display font-semibold text-ps-danger">Danger Zone</h2>
                  <p className="text-xs text-ps-ink-2 mt-1">Destructive actions and permanent database purge routines.</p>
                </div>

                <div className="p-6 rounded-xl bg-ps-danger/10 border border-ps-danger/30 space-y-4">
                  <div className="flex items-center gap-3 text-ps-danger">
                    <AlertTriangle size={20} />
                    <h3 className="text-sm font-semibold">Permanent System Reset</h3>
                  </div>
                  <p className="text-xs text-ps-danger leading-relaxed font-medium">
                    Executing this routine will erase all sessions, rooms, enrolled students, attendance entries, and notes. Only authenticated system admin credentials will survive.
                  </p>
                  <button 
                    id="settings-clear-database"
                    onClick={() => setIsClearModalOpen(true)}
                    disabled={loading}
                    className="px-5 py-2.5 bg-ps-danger dark:bg-red-700 hover:opacity-90 text-white font-medium rounded-lg text-sm transition-opacity cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Initiate Factory Wipe
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </div>

      </div>

      <ClearDatabaseModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={clearDatabase}
      />

      {/* Drawers */}
      <SlideOverDrawer 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
        title="Privacy Policy"
        icon={Shield}
      >
        <p className="font-medium text-ps-ink-1">PoliSync Healthcare Protection</p>
        <p>1. <strong>Data Collection</strong>: PoliSync collects personal data necessary for special education and clinical rehabilitation schedules.</p>
        <p>2. <strong>Row-Level Security</strong>: All database transactions are restricted using strict PostgreSQL policies ensuring that only authorized guardians access student data.</p>
        <p>3. <strong>Zero-Sale Policy</strong>: We do not monetize or distribute confidential student profiles.</p>
      </SlideOverDrawer>

      <SlideOverDrawer 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
        title="Institutional Terms"
        icon={FileText}
      >
        <p className="font-medium text-ps-ink-1">PoliSync Terms of Service</p>
        <p>1. <strong>Usage</strong>: Intended exclusively for certified teachers, licensed therapists, and verified families.</p>
        <p>2. <strong>Accountability</strong>: Staff accounts are personally tied to center operations. Sharing credentials is prohibited.</p>
        <p>3. <strong>Data Availability</strong>: Automated daily snapshots occur on Supabase PostgreSQL servers.</p>
      </SlideOverDrawer>
    </div>
  );
};

export default Settings;
