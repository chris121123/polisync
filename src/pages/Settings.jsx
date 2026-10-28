import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Wifi,
  WifiOff,
  Loader2,
  Clock,
  CalendarDays,
  Users,
  FileSearch,
  StickyNote
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';
import ClearDatabaseModal from '../components/ClearDatabaseModal';

const ThemeCard = ({ type, active, onClick, icon: Icon, description }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-col p-5 border text-left w-full",
        active 
          ? "border-[var(--sa-gold)]" 
          : "border-[var(--sa-line-default)] hover:border-[var(--sa-line-strong)]"
      )}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="flex items-center gap-2.5">
          <Icon size={16} strokeWidth={1.5} className={active ? "sa-t-warm" : "text-[var(--sa-text-muted)]"} />
          <span className="text-sm text-[var(--sa-text-primary)] capitalize">{type}</span>
        </div>
        {active && (
          <CheckCircle2 size={16} strokeWidth={1.5} className="sa-t-warm" />
        )}
      </div>

      <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">
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
            className="w-screen max-w-md bg-[var(--sa-surface-1)] border-l border-[var(--sa-line-default)] flex flex-col"
          >
            <div className="p-6 border-b border-[var(--sa-line-hairline)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.5} className="sa-t-warm" />
                <h3 className="sa-panel-title">{title}</h3>
              </div>
              <button onClick={onClose} aria-label="Close panel" className="p-2 border border-[var(--sa-line-default)] text-[var(--sa-text-secondary)] hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 text-sm text-[var(--sa-text-muted)] leading-relaxed custom-scrollbar">
              {children}
            </div>

            <div className="p-6 border-t border-[var(--sa-line-hairline)]">
              <button 
                onClick={onClose}
                className="sa-btn sa-btn--primary w-full justify-center min-h-11"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )}
  </AnimatePresence>
);

const Settings = () => {
  const { darkMode, setDarkMode, clearDatabase, loading, appRole, schedulingSettings, checkConnection } = useGlobalState();
  const [activeTab, setActiveTab] = useState('appearance');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [connStatus, setConnStatus] = useState('idle'); // 'idle' | 'ok' | 'error'

  // Real Supabase connection ping
  useEffect(() => {
    let cancelled = false;
    checkConnection().then((ok) => {
      if (!cancelled) setConnStatus(ok ? 'ok' : 'error');
    });
    return () => { cancelled = true; };
    // Factory action is state-free and recreated per render by design (ADR-001).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'center', label: 'Center Details', icon: MapPin },
    { id: 'roles', label: 'Role Guide', icon: Info },
    { id: 'privacy', label: 'Legal & Privacy', icon: Shield },
    ...(appRole === 'superadmin' ? [{ id: 'system', label: 'System & Danger', icon: Database, danger: true }] : [])
  ];

  const appVersion = import.meta.env.VITE_APP_VERSION || 'dev';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      {/* Header */}
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">Settings</h1>
        <p className="sa-sub">Configure workspace preferences, roles, and administrative options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        
        {/* Left Vertical Categories Navigation */}
        <div className="lg:col-span-1 space-y-3">
          <div className="border border-[var(--sa-line-default)] p-1 space-y-px">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 text-xs text-left",
                  activeTab === item.id 
                    ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1" 
                    : item.danger 
                      ? "sa-t-danger hover:text-[var(--sa-text-primary)]" 
                      : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                )}
              >
                <item.icon size={16} strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border border-[var(--sa-line-default)] space-y-1">
            <p className="sa-micro">Environment</p>
            <p className="text-[11px] text-[var(--sa-text-primary)]">PoliSync Core {appVersion}</p>
            <div className="flex items-center gap-1.5">
              {connStatus === 'idle' && <Loader2 size={10} className="animate-spin sa-t-muted" />}
              {connStatus === 'ok' && <span className="w-1.5 h-1.5 bg-[var(--sa-success)]" />}
              {connStatus === 'error' && <span className="w-1.5 h-1.5 bg-[var(--sa-danger)]" />}
              <p className={clsx(
                'text-[11px]',
                connStatus === 'ok' ? 'sa-t-warm' : connStatus === 'error' ? 'sa-t-danger' : 'sa-t-muted'
              )}>
                {connStatus === 'idle' ? 'Checking connection...' : connStatus === 'ok' ? 'Supabase connected' : 'Connection unavailable'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Active Content Panel */}
        <div className="md:col-span-2 xl:col-span-3">
          <div className="sa-panel p-6 lg:p-8">
            
            {/* 1. Appearance */}
            {activeTab === 'appearance' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="sa-title">Appearance & Interface</h2>
                  <p className="sa-panel-sub">Select your preferred color theme across all tools.</p>
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
                  <h2 className="sa-title">Center Registry</h2>
                  <p className="sa-panel-sub">Operational parameters from the platform configuration.</p>
                </div>

                <div className="divide-y divide-[var(--sa-line-hairline)]">
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="sa-micro">Platform</span>
                    <span className="text-sm text-[var(--sa-text-primary)]">PoliSync Special Education Center</span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="sa-micro">Operating Hours</span>
                    <span className="text-sm tabular-nums text-[var(--sa-text-primary)]">
                      {schedulingSettings
                        ? `${schedulingSettings.operating_start_time || '08:00'} – ${schedulingSettings.operating_end_time || '17:00'}`
                        : 'Not configured'}
                    </span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="sa-micro">Schedule Window</span>
                    <span className="text-sm text-[var(--sa-text-primary)]">Monday – Friday</span>
                  </div>
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="sa-micro">Max Daily Hours / Student</span>
                    <span className="text-sm tabular-nums text-[var(--sa-text-primary)]">
                      {schedulingSettings?.max_daily_hours_per_student ?? '—'} hrs
                    </span>
                  </div>
                </div>

                <div className="p-4 border border-[var(--sa-line-hairline)] flex items-start gap-3">
                  <Info size={14} strokeWidth={1.5} className="shrink-0 mt-0.5 sa-t-muted" />
                  <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">
                    Other facility details — name, address, license ID — are managed by your institution administrator and are not stored in PoliSync.
                  </p>
                </div>
              </motion.div>
            )}

            {/* 3. Role Guide */}
            {activeTab === 'roles' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="sa-title">Access Roles & Capabilities</h2>
                  <p className="sa-panel-sub">What each role can access and do in the platform.</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 border-l-2 border-l-[var(--sa-line-strong)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-role-superadmin">Super Administrator</span>
                      <span className="sa-badge">superadmin</span>
                    </div>
                    <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">Platform overview dashboard, user account management (create, delete, activate, change roles), audit trail inspection, platform scheduling configuration, and system settings.</p>
                  </div>
                  <div className="p-4 border-l-2 border-l-[var(--sa-line-strong)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-role-admin">Center Administrator</span>
                      <span className="sa-badge">admin</span>
                    </div>
                    <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">Clinical operations dashboard, session scheduling (manual and auto-scheduler), staff and student directory, room management, and conflict detection.</p>
                  </div>
                  <div className="p-4 border-l-2 border-l-[var(--sa-line-strong)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-role-therapist">Clinical Therapist</span>
                      <span className="sa-badge">therapist</span>
                    </div>
                    <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">Personal therapy caseload dashboard and session notes — view assigned sessions, write progress notes, and record session ratings.</p>
                  </div>
                  <div className="p-4 border-l-2 border-l-[var(--sa-line-strong)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-role-teacher">Faculty Teacher</span>
                      <span className="sa-badge">teacher</span>
                    </div>
                    <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">Classroom dashboard — view assigned teaching sessions, track daily attendance for enrolled students.</p>
                  </div>
                  <div className="p-4 border-l-2 border-l-[var(--sa-line-strong)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-role-parent">Parent / Guardian</span>
                      <span className="sa-badge">parent</span>
                    </div>
                    <p className="text-[11px] text-[var(--sa-text-muted)] leading-relaxed">Child dashboard — view the verified schedule, program enrollment status, and upcoming sessions for linked children.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. Privacy & Terms */}
            {activeTab === 'privacy' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="sa-title">Compliance & Policies</h2>
                  <p className="sa-panel-sub">Review legal standards, confidentiality, and data handling protocols.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 border border-[var(--sa-line-default)] space-y-4">
                    <Shield size={20} strokeWidth={1.5} className="sa-t-warm" />
                    <div>
                      <h3 className="sa-row-title">Privacy Agreement</h3>
                      <p className="text-[11px] text-[var(--sa-text-muted)] mt-1">Data privacy frameworks and student record protections under RLS.</p>
                    </div>
                    <button 
                      id="settings-view-privacy"
                      onClick={() => setIsPrivacyOpen(true)}
                      className="sa-link"
                    >
                      Read Statement <ArrowRight size={12} strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="p-5 border border-[var(--sa-line-default)] space-y-4">
                    <FileText size={20} strokeWidth={1.5} className="sa-t-warm" />
                    <div>
                      <h3 className="sa-row-title">Platform Terms</h3>
                      <p className="text-[11px] text-[var(--sa-text-muted)] mt-1">Acceptable use mandates, institutional responsibilities, and uptime rules.</p>
                    </div>
                    <button 
                      id="settings-view-terms"
                      onClick={() => setIsTermsOpen(true)}
                      className="sa-link"
                    >
                      Read Terms <ArrowRight size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. Danger Zone (Superadmin only) */}
            {activeTab === 'system' && appRole === 'superadmin' && (
              <motion.div className="space-y-6">
                <div>
                  <h2 className="sa-title sa-t-danger">Danger Zone</h2>
                  <p className="sa-panel-sub">Destructive actions and permanent database purge routines.</p>
                </div>

                <div className="p-6 border border-[var(--sa-danger)] space-y-4">
                  <div className="flex items-center gap-3 sa-t-danger">
                    <AlertTriangle size={20} strokeWidth={1.5} />
                    <h3 className="text-sm">Permanent System Reset</h3>
                  </div>
                  <p className="text-[11px] sa-t-danger leading-relaxed">
                    Executing this routine will erase all sessions, rooms, enrolled students, attendance entries, and notes. Only authenticated system admin credentials will survive.
                  </p>
                  <button 
                    id="settings-clear-database"
                    onClick={() => setIsClearModalOpen(true)}
                    disabled={loading}
                    className="px-5 py-2.5 border border-[var(--sa-danger)] text-[var(--sa-danger)] text-[11px] uppercase tracking-[0.1em] transition-colors hover:border-[var(--sa-line-strong)] cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
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
        <p className="text-[var(--sa-text-primary)]">PoliSync Healthcare Protection</p>
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
        <p className="text-[var(--sa-text-primary)]">PoliSync Terms of Service</p>
        <p>1. <strong>Usage</strong>: Intended exclusively for certified teachers, licensed therapists, and verified families.</p>
        <p>2. <strong>Accountability</strong>: Staff accounts are personally tied to center operations. Sharing credentials is prohibited.</p>
        <p>3. <strong>Data Availability</strong>: Automated daily snapshots occur on Supabase PostgreSQL servers.</p>
      </SlideOverDrawer>
    </div>
  );
};

export default Settings;
