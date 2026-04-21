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
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      
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
        "w-64 bg-white dark:bg-slate-900 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-30 shadow-sm transition-all duration-300",
        "fixed lg:relative inset-y-0 left-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Stethoscope size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">PoliSync</h1>
              <p className="text-xs text-slate-500 dark:text-slate-200 font-medium">Special Ed Center</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-400 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                  link.isAdmin && "mb-2",
                  isActive 
                    ? (link.isAdmin ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-2 border-amber-100 dark:border-amber-900/50 font-bold" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400")
                    : "text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl relative group">
            <div className="w-9 h-9 rounded-full bg-indigo-200 dark:bg-indigo-900/50 border-2 border-white dark:border-slate-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-200 truncate">{user?.role || 'Staff'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-400 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-20 transition-colors">
          <div className="flex gap-3 items-center flex-1">
            {/* Hamburger toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={clsx(
                "p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-200 transition-colors",
                isSidebarOpen && "lg:hidden"
              )}
            >
              <Menu size={20} />
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-all w-full max-w-sm border border-slate-200 dark:border-slate-700"
            >
              <Search size={16} />
              <span className="text-sm font-medium truncate">Ask AI to find a schedule, student...</span>
              <div className="ml-auto hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-300 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-sm">
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

        {/* Dynamic Page Content */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
          <React.Suspense fallback={<div className="p-8 font-bold text-slate-400">Loading center data...</div>}>
            <Outlet />
          </React.Suspense>
        </div>
      </main>

      {/* Global AI Search Modal */}
      <AISearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

export default Layout;
