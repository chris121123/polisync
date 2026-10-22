import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, Stethoscope, Search, Command, DoorOpen, LogOut, Menu, Settings as SettingsIcon, FileText, Bell, X } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';
import ForceChangePasswordModal from './ForceChangePasswordModal';
import { useGlobalState } from '../context/GlobalStateContext';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const Layout = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { user, appRole, logout, notifications } = useGlobalState();
  const navigate = useNavigate();
  const bellRef = useRef(null);

  // Auto-collapse sidebar on smaller screens and track isMobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isSidebarOpen]);

  // Global Ctrl+K shortcut — must live in Layout so it always fires,
  // regardless of whether the search modal is open or closed.
  useEffect(() => {
    const handleSearchShortcut = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut, true); // capture phase
    return () => window.removeEventListener('keydown', handleSearchShortcut, true);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    // Close sidebar on tablet when clicking a nav link
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const getNavStyle = (link, isActive) => {
    if (!isActive) return 'text-ps-ink-2 hover:bg-ps-bg hover:text-ps-ink-1';
    return 'bg-ps-accent-soft text-ps-ink-1 font-medium';
  };

  const navLinks = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: appRole === 'superadmin' ? 'Super Admin Dashboard' : (appRole === 'admin' ? 'Admin Dashboard' : 'Dashboard'),
    },
    ...(appRole === 'therapist' ? [{ to: '/therapist/notes', icon: FileText, label: 'Session Notes', section: 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/schedule', icon: CalendarDays, label: 'Schedule', section: 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/directory', icon: Users, label: 'Directory', section: 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/rooms', icon: DoorOpen, label: 'Rooms', section: 'Operations' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/users', icon: Users, label: 'System Console', section: 'System' }] : []),
    { to: '/settings', icon: SettingsIcon, label: 'Settings', section: 'System' },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-ps-bg font-sans text-ps-ink-1 overflow-hidden transition-colors duration-300">
      
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 bg-ps-surface border-b border-ps-border flex items-center justify-between px-4 lg:px-6 z-40 shadow-sm transition-colors">
        <div className="flex gap-2 sm:gap-6 items-center flex-1 min-w-0">
          {/* Toggle & Logo Group */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
              className="p-2 rounded-lg hover:bg-ps-bg text-ps-ink-2 transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-ps-accent dark:bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Stethoscope size={18} />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-base text-ps-ink-1 leading-tight">PoliSync</h1>
                <p className="text-xs font-medium text-ps-ink-2">Special Ed Center</p>
              </div>
            </div>
          </div>

          {/* AI Search Bar */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 text-ps-ink-2 bg-ps-bg hover:bg-ps-border/40 px-3 sm:px-4 py-2 rounded-xl transition-all w-auto sm:w-full max-w-[150px] xs:max-w-[200px] sm:max-w-sm border border-ps-border touch-manipulation min-w-0 focus-visible:outline-2 focus-visible:outline-ps-accent"
          >
            <Search size={16} className="shrink-0" />
            <span className="text-sm font-medium truncate hidden xs:block">Search...</span>
            <span className="text-sm font-medium truncate hidden sm:block">Search schedules, students...</span>
            <div className="ml-auto hidden sm:flex items-center gap-1 text-xs font-medium text-ps-ink-2 bg-ps-surface border border-ps-border px-1.5 py-0.5 rounded shadow-sm shrink-0">
              <Command size={10} />K
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl hover:bg-ps-bg transition-colors group touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
              title="Notifications"
            >
              <Bell size={20} className="text-ps-ink-2 group-hover:text-ps-ink-1 transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-ps-ink-1 text-ps-surface text-xs font-semibold rounded-full flex items-center justify-center ring-2 ring-ps-surface">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              anchorRef={bellRef}
            />
          </div>
          <div className="text-xs font-medium text-ps-ink-2 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* ── Main Layout Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile/Tablet overlay */}
        <AnimatePresence>
          {isSidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={clsx(
          "bg-ps-surface border-r border-ps-border flex flex-col flex-shrink-0 z-30 transition-all duration-300",
          "fixed lg:relative inset-y-0 left-0 h-full",
          isSidebarOpen 
            ? "w-64 translate-x-0" 
            : "-translate-x-full lg:translate-x-0 lg:w-20 shadow-none"
        )}>
          {/* Mobile sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-ps-border lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-ps-accent dark:bg-indigo-600 flex items-center justify-center text-white shrink-0">
                <Stethoscope size={18} />
              </div>
              <span className="font-semibold text-sm text-ps-ink-1">PoliSync</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
              className="p-1.5 rounded-lg hover:bg-ps-bg text-ps-ink-2 transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Section */}
          <nav className={clsx("flex-1 p-4 pt-4 lg:pt-6 space-y-1 overflow-y-auto", !isSidebarOpen && "px-2 pt-4")}>
            {navLinks.map((link, i) => (
              <React.Fragment key={link.to}>
                {isSidebarOpen && link.section && navLinks[i - 1]?.section !== link.section && (
                  <p className="text-xs font-medium text-ps-ink-2 px-3 pt-4 pb-1">{link.section}</p>
                )}
                <NavLink
                  to={link.to}
                  onClick={handleNavClick}
                  title={!isSidebarOpen ? link.label : ""}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent",
                      isSidebarOpen ? "px-3 py-2.5" : "p-3 justify-center",
                      getNavStyle(link, isActive)
                    )
                  }
                >
                  <link.icon size={20} />
                  {isSidebarOpen && (
                    <span className="whitespace-nowrap">{link.label}</span>
                  )}
                </NavLink>
              </React.Fragment>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className={clsx("p-4 border-t border-ps-border", !isSidebarOpen && "p-2")}>
            <div className={clsx(
              "flex items-center bg-ps-bg rounded-xl relative group transition-all",
              isSidebarOpen ? "gap-3 p-3" : "p-2 justify-center"
            )}>
              <div className="w-9 h-9 rounded-full bg-ps-accent-soft border-2 border-ps-surface flex items-center justify-center text-ps-accent font-semibold text-xs shrink-0 shadow-sm">
                {getInitials(user?.name)}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ps-ink-1 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-ps-ink-2 truncate capitalize">{appRole || 'Loading...'}</p>
                </div>
              )}
              
              {isSidebarOpen ? (
                <div className="flex gap-1">
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-surface rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="absolute left-full ml-4 p-2 bg-ps-surface border border-ps-border rounded-xl shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-all z-50 flex flex-col gap-2">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ps-ink-1 hover:bg-ps-bg rounded-lg focus-visible:outline-2 focus-visible:outline-ps-accent"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-ps-bg transition-colors">
          <React.Suspense fallback={<div className="p-8 font-medium text-ps-ink-2">Loading center data...</div>}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onToggle={() => setIsSearchOpen(prev => !prev)} onClose={() => setIsSearchOpen(false)} />
      
      {/* Forced Password Change Modal */}
      <ForceChangePasswordModal />
    </div>
  );
};

export default Layout;
