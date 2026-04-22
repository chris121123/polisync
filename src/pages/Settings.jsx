import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Moon, 
  Sun, 
  Bell, 
  Shield, 
  Info, 
  Building, 
  Mail, 
  Phone, 
  Globe, 
  Save,
  CheckCircle2,
  Database,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import clsx from 'clsx';

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

const SettingToggle = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-200 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
        enabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700 dark:bg-slate-700"
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow ring-0 transition duration-200 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  </div>
);

const SettingInput = ({ label, icon: Icon, value, placeholder, type = "text" }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon size={16} />
      </div>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
      />
    </div>
  </div>
);

const Settings = () => {
  const { darkMode, setDarkMode, clearDatabase, loading } = useGlobalState();
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    app: true,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
          <p className="text-slate-500 dark:text-slate-200 font-medium">Manage center preferences and your workspace experience.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all shadow-indigo-200 dark:shadow-none">
          <Save size={18} />
          Save Changes
        </button>
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

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-200 uppercase tracking-wider">Primary Accent Color</label>
              <div className="grid grid-cols-3 gap-3">
                {['Indigo', 'Emerald', 'Rose'].map(color => (
                  <button 
                    key={color}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      color === 'Indigo' 
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <div className={clsx(
                      "w-6 h-6 rounded-full",
                      color === 'Indigo' ? "bg-indigo-600" : color === 'Emerald' ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-200">{color}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Center Details */}
        <SettingsCard title="Center Information" icon={Building}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <SettingInput label="Center Name" icon={Building} value="PoliSync Special Ed Center" placeholder="Legal name of the facility" />
            </div>
            <div className="sm:col-span-2">
              <SettingInput label="Physical Address" icon={Globe} value="123 Harmony St., Metro Manila, PH" placeholder="Full street address" />
            </div>
            <SettingInput label="Support Email" icon={Mail} value="contact@polisync.com" placeholder="Official contact email" type="email" />
            <SettingInput label="Contact Number" icon={Phone} value="+63 2 8888 0000" placeholder="Main landline or mobile" />
          </div>
        </SettingsCard>

        {/* Notification Preferences */}
        <SettingsCard title="Notifications" icon={Bell}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <SettingToggle 
              label="Email Alerts" 
              description="Receive weekly summaries and critical conflict reports via email."
              enabled={notifications.email}
              onChange={(v) => setNotifications({...notifications, email: v})}
            />
            <SettingToggle 
              label="SMS Notifications" 
              description="Get text message alerts for urgent schedule changes."
              enabled={notifications.sms}
              onChange={(v) => setNotifications({...notifications, sms: v})}
            />
            <SettingToggle 
              label="Browser Notifications" 
              description="Show real-time alerts while you're using the application."
              enabled={notifications.app}
              onChange={(v) => setNotifications({...notifications, app: v})}
            />
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
            
            <p className="text-xs text-slate-500 dark:text-slate-200 px-1">
              Your data is encrypted locally and synchronized with the secure center server. 
              Last backup: 24 minutes ago.
            </p>

            <div className="pt-2">
              <button className="text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline">
                View Privacy Policy & Terms of Service
              </button>
            </div>
          </div>
        </SettingsCard>

        {/* Database Management */}
        <SettingsCard title="Database Management" icon={Database}>
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                Warning: Clearing the database will permanently delete all rooms, students, and sessions. Only the system administrator profile will remain.
              </p>
            </div>

            <button 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
                  clearDatabase();
                }
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-900/30 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50"
            >
              <Trash2 size={18} />
              Clear All Data (Reset System)
            </button>
          </div>
        </SettingsCard>

      </div>
    </div>
  );
};

export default Settings;
