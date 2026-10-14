import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Shield, 
  Info,
  CheckCircle2,
  Database,
  Trash2
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

const Settings = () => {
  const { darkMode, setDarkMode, clearDatabase, loading, appRole } = useGlobalState();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

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

        {/* System Information */}
        <SettingsCard title="System & Privacy" icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Info size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Software Version</span>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">v2.4.0-stable</span>
            </div>
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
    </div>
  );
};

export default Settings;
