import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CalendarRange, Users, Search, Command, DoorOpen, LogOut, Menu, Settings as SettingsIcon, FileText, Bell, X, FileClock, SlidersHorizontal, Activity, Cpu, Sparkles, FileBarChart } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';
import ForceChangePasswordModal from './ForceChangePasswordModal';
import { AppModal, ModalHeader } from './AppModal.jsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { ROLE_LABELS } from '../lib/rolePalette';
import '../styles/superadminTheme.css';

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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, appRole, logout, notifications } = useGlobalState();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const sidebarToggleRef = useRef(null);
  const searchTriggerRef = useRef(null);

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
    if (!isMobile || !isSidebarOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isSidebarOpen]);

  // Mobile drawer: Escape closes it and returns focus to the toggle.
  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsSidebarOpen(false);
      sidebarToggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  const handleNavClick = () => {
    // Close sidebar on tablet when clicking a nav link
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const avatarClass = "itx-avatar w-9 h-9 flex items-center justify-center shrink-0";
  const collapsedProfile = !isSidebarOpen;

  const getNavStyle = (isActive) => {
    // ITX active = ink + weight only; the token accent bar is drawn in CSS.
    if (isActive) return 'font-medium';
    return 'text-ps-ink-2 hover:text-ps-ink-1';
  };

  const navLinks = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: appRole === 'superadmin' ? 'IT Operations Dashboard' : (appRole === 'admin' ? 'Admin Dashboard' : 'Dashboard'),
    },
    ...(appRole === 'therapist' ? [{ to: '/therapist/notes', icon: FileText, label: 'Session Notes', section: 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/schedule', icon: CalendarDays, label: 'Schedule', section: 'Operations' }] : []),
    ...(appRole === 'admin' || appRole === 'superadmin' ? [{ to: '/planner', icon: CalendarRange, label: 'Year Planner', section: appRole === 'superadmin' ? 'System' : 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/directory', icon: Users, label: 'Directory', section: 'Operations' }] : []),
    ...(appRole === 'admin' ? [{ to: '/rooms', icon: DoorOpen, label: 'Rooms', section: 'Operations' }] : []),
    ...(appRole === 'admin' || appRole === 'superadmin' ? [{ to: '/admin/reports', icon: FileBarChart, label: 'Reports', section: appRole === 'superadmin' ? 'System' : 'Operations' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/users', icon: Users, label: 'Identity & Access', section: 'System' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/audit', icon: FileClock, label: 'Audit Trail', section: 'System' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/config', icon: SlidersHorizontal, label: 'System Config', section: 'System' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/health', icon: Activity, label: 'System Health', section: 'System' }] : []),
    ...(appRole === 'superadmin' ? [{ to: '/admin/ai', icon: Cpu, label: 'AI Provider', section: 'System' }] : []),
    ...(appRole === 'admin' || appRole === 'superadmin' ? [{ to: '/assistant', icon: Sparkles, label: 'AI Assistant', section: appRole === 'superadmin' ? 'System' : 'Operations' }] : []),
    { to: '/settings', icon: SettingsIcon, label: 'Settings', section: 'System' },
  ];

  return (
    <div className="sa-theme flex flex-col h-screen w-full bg-ps-bg font-sans text-ps-ink-1 overflow-hidden transition-colors itx-scope itx-shell">
      
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 bg-ps-surface border-b border-ps-border flex items-center justify-between px-4 lg:px-6 z-40 transition-colors">
        <div className="flex gap-2 sm:gap-6 items-center flex-1 min-w-0">
          {/* Toggle & Logo Group */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              ref={sidebarToggleRef}
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
              className="p-2 text-ps-ink-2 transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-3">
              {/* crown-only crop: the source is square with the wordmark below y=60% */}
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
                <img src="/brand/polikids-logo.jpg" alt="Polikids crown" className="w-[135%] max-w-none shrink-0 aspect-[654/335] object-cover object-[50%_18%]" />
              </div>
              <div className="hidden sm:block">
                <p className="sa-wordmark font-semibold text-base text-ps-ink-1 leading-tight">PoliSync</p>
                <p className="text-ps-ink-2 text-[11px]">Polikids Center</p>
              </div>
            </div>
          </div>

          {/* AI Search Bar */}
          <button
            ref={searchTriggerRef}
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="itx-search-trigger flex items-center gap-2 text-ps-ink-2 bg-ps-bg hover:bg-ps-border/40 px-3 sm:px-4 py-2 w-auto sm:w-full max-w-[150px] xs:max-w-[200px] sm:max-w-sm border border-ps-border touch-manipulation min-w-0 transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
          >
            <Search size={16} className="shrink-0" />
            <span className="text-sm font-medium truncate">Search</span>
            <div className="itx-kbd ml-auto hidden sm:flex items-center gap-1 text-xs font-medium text-ps-ink-2 bg-ps-surface border border-ps-border px-1.5 py-0.5 shrink-0">
              <Command size={10} />K
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
              className="itx-bell relative p-2 transition-colors group touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
              title="Notifications"
            >
              <Bell size={20} className="text-ps-ink-2 group-hover:text-ps-ink-1 transition-colors" />
              {unreadCount > 0 && (
                <span className="itx-badge-count absolute top-1 right-1 w-4 h-4 bg-ps-ink-1 text-ps-surface text-xs font-semibold rounded-full flex items-center justify-center ring-2 ring-ps-surface">
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
              transition={{ duration: 0.15 }}
              onClick={() => setIsSidebarOpen(false)}
              className="itx-backdrop fixed inset-0 z-20 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={clsx(
          "bg-ps-surface border-r border-ps-border flex flex-col flex-shrink-0 z-30 transition-colors",
          "fixed lg:relative inset-y-0 left-0 h-full",
          isSidebarOpen 
            ? "w-64 translate-x-0" 
            : "-translate-x-full lg:translate-x-0 lg:w-20 shadow-none"
        )}>
          {/* Mobile sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-ps-border lg:hidden">
            <div className="flex items-center gap-2.5">
              {/* crown-only crop: the source is square with the wordmark below y=60% */}
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center">
                <img src="/brand/polikids-logo.jpg" alt="Polikids crown" className="w-[135%] max-w-none shrink-0 aspect-[654/335] object-cover object-[50%_18%]" />
              </div>
              <div className="leading-tight">
                <span className="block font-semibold text-sm text-ps-ink-1">PoliSync</span>
                <span className="text-ps-ink-2 text-[11px]">Polikids Center</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
              className="inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 text-ps-ink-2 transition-colors touch-manipulation focus-visible:outline-2 focus-visible:outline-ps-accent"
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
                      "flex items-center gap-3 text-sm font-medium touch-manipulation transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent",
                      // Phone/tablet rows keep a 44px touch target; desktop keeps its compact pitch.
                      "min-h-11 lg:min-h-0",
                      isSidebarOpen ? "px-3 py-2.5" : "p-3 justify-center",
                      getNavStyle(isActive)
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
            <div
              className={clsx(
                "itx-profile flex items-center bg-ps-bg relative transition-all",
                isSidebarOpen ? "gap-3 p-3" : "p-2 justify-center"
              )}
              onMouseEnter={collapsedProfile ? () => setIsProfileMenuOpen(true) : undefined}
              onMouseLeave={collapsedProfile ? (e) => {
                // Keep it open while keyboard focus is inside the panel.
                if (!e.currentTarget.querySelector('#profile-menu')?.contains(document.activeElement)) setIsProfileMenuOpen(false);
              } : undefined}
              onBlur={collapsedProfile ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setIsProfileMenuOpen(false);
              } : undefined}
              onKeyDown={collapsedProfile ? (e) => {
                if (e.key === 'Escape') {
                  setIsProfileMenuOpen(false);
                  profileTriggerRef.current?.focus();
                }
              } : undefined}
            >
              {collapsedProfile ? (
                <button
                  ref={profileTriggerRef}
                  type="button"
                  aria-label="Account menu"
                  aria-expanded={isProfileMenuOpen}
                  aria-controls="profile-menu"
                  onClick={() => setIsProfileMenuOpen(true)}
                  className="flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ps-accent"
                >
                  <span className={avatarClass}>
                    {getInitials(user?.name)}
                  </span>
                </button>
              ) : (
                <div className={avatarClass}>
                  {getInitials(user?.name)}
                </div>
              )}
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="itx-profile-name text-sm font-semibold text-ps-ink-1 truncate">{user?.name || 'User'}</p>
                  <p className="itx-profile-role text-xs text-ps-ink-2 truncate">{ROLE_LABELS[appRole] || appRole || 'Loading...'}</p>
                </div>
              )}
              
              {isSidebarOpen ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="-mx-1 inline-flex min-h-9 min-w-9 items-center justify-center p-1.5 text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-surface transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div
                  id="profile-menu"
                  aria-hidden={!isProfileMenuOpen}
                  inert={!isProfileMenuOpen}
                  className={clsx(
                    "itx-menu absolute left-full ml-4 p-2 bg-ps-surface border border-ps-border transition-all z-50 flex flex-col gap-2",
                    isProfileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ps-ink-1 hover:bg-ps-bg focus-visible:outline-2 focus-visible:outline-ps-accent"
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
      {/* Logout Confirmation */}
      <AppModal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} labelledBy="logout_confirm_title" describedBy="logout_confirm_desc" maxWidth="max-w-sm">
        <ModalHeader
          titleId="logout_confirm_title"
          title="Log out?"
          onClose={() => setShowLogoutConfirm(false)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <p id="logout_confirm_desc" className="text-sm font-medium text-[var(--sa-text-muted)]">
            You'll need to sign in again to get back to PoliSync.
          </p>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(false)}
            className="sa-btn flex-1 justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmLogout}
            className="sa-btn sa-btn--primary flex-1 justify-center"
          >
            Log out
          </button>
        </div>
      </AppModal>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onToggle={() => setIsSearchOpen(prev => !prev)} onClose={() => setIsSearchOpen(false)} returnFocusRef={searchTriggerRef} />
      
      {/* Forced Password Change Modal */}
      <ForceChangePasswordModal />
    </div>
  );
};

export default Layout;
