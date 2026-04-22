import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, Stethoscope, Search, Command, DoorOpen, LogOut, Trash2, ShieldAlert, Menu, X, Settings as SettingsIcon } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import AISearch from './AISearch';
import { useGlobalState } from '../context/GlobalStateContext';

const Layout = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout, deleteAccount } = useGlobalState();
  const navigate = useNavigate();

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This will remove you from the staff directory.')) {
      deleteAccount(user.id);
      navigate('/login');
    }
  };

  const handleNavClick = () => {
    // Close sidebar on tablet when clicking a nav link
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const navLinks = [
    ...(user?.role === 'Admin' ? [{ to: '/admin', icon: ShieldAlert, label: 'Admin Dashboard', isAdmin: true }] : []),
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/schedule', icon: CalendarDays, label: 'Schedule & Calendar' },
    { to: '/directory', icon: Users, label: 'Staff & Students' },
    { to: '/rooms', icon: DoorOpen, label: 'Room Management' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 z-40 shadow-sm transition-colors">
        <div className="flex gap-6 items-center flex-1">
          {/* Toggle & Logo Group */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-200 transition-colors"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                <Stethoscope size={18} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight">PoliSync</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Special Ed Center</p>
              </div>
            </div>
          </div>

          {/* AI Search Bar */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-all w-full max-w-sm border border-slate-200 dark:border-slate-700"
          >
            <Search size={16} />
            <span className="text-sm font-medium truncate">Ask AI to find a schedule, student...</span>
            <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-sm">
              <Command size={10} />K
            </div>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-200 font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile/Tablet overlay */}
        <AnimatePresence>
          {isSidebarOpen && window.innerWidth < 1024 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[2px] z-20 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={clsx(
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-30 transition-all duration-300",
          "fixed lg:relative inset-y-0 left-0 h-full",
          isSidebarOpen 
            ? "w-64 translate-x-0" 
            : "-translate-x-full lg:translate-x-0 lg:w-20 shadow-none"
        )}>
          {/* Navigation Section */}
          <nav className={clsx("flex-1 p-4 pt-6 space-y-1 overflow-y-auto", !isSidebarOpen && "px-2 pt-4")}>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                title={!isSidebarOpen ? link.label : ""}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isSidebarOpen ? "px-3 py-2.5" : "p-3 justify-center",
                    link.isAdmin && "mb-2",
                    isActive 
                      ? (link.isAdmin ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-2 border-amber-100 dark:border-amber-900/50 font-bold" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm")
                      : "text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  )
                }
              >
                <link.icon size={20} />
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {link.label}
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className={clsx("p-4 border-t border-slate-100 dark:border-slate-800", !isSidebarOpen && "p-2")}>
            <div className={clsx(
              "flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl relative group transition-all",
              isSidebarOpen ? "gap-3 p-3" : "p-2 justify-center"
            )}>
              <div className="w-9 h-9 rounded-full bg-indigo-200 dark:bg-indigo-900/50 border-2 border-white dark:border-slate-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shrink-0 shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-200 truncate">{user?.role || 'Staff'}</p>
                </motion.div>
              )}
              
              {isSidebarOpen ? (
                <div className="flex gap-1">
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="absolute left-full ml-4 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 flex flex-col gap-2">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
          <React.Suspense fallback={<div className="p-8 font-bold text-slate-400">Loading center data...</div>}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
      {/* Global AI Search Modal */}
      <AISearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Layout;
