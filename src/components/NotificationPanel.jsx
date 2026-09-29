import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Check, CheckCheck, CalendarDays, UserPlus, ShieldAlert,
  FileText, Clock, AlertTriangle, Info, Stethoscope, GraduationCap,
  DoorOpen, Trash2, Settings, BookUser, X, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NOTIFICATION_CONFIG = {
  schedule_created: { icon: CalendarDays, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', label: 'Schedule' },
  schedule_updated: { icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Schedule' },
  schedule_cancelled: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Cancelled' },
  session_moved: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Rescheduled' },
  user_created: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'New User' },
  role_changed: { icon: ShieldAlert, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', label: 'Role Change' },
  account_updated: { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/40', label: 'Account' },
  account_deactivated: { icon: BellOff, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Deactivated' },
  account_activated: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Activated' },
  note_added: { icon: FileText, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', label: 'Note' },
  attendance_marked: { icon: BookUser, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', label: 'Attendance' },
  document_uploaded: { icon: FileText, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', label: 'Document' },
  room_updated: { icon: DoorOpen, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Room' },
  child_update: { icon: GraduationCap, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', label: 'Student' },
  assignment_update: { icon: Stethoscope, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', label: 'Assignment' },
  system: { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/40', label: 'System' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Warning' },
  success: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Success' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Error' },
};

const getConfig = (notif) => {
  const t = (notif.title || '').toLowerCase();
  if (t.includes('welcome') || t.includes('user created')) return NOTIFICATION_CONFIG.user_created;
  if (t.includes('role')) return NOTIFICATION_CONFIG.role_changed;
  if (t.includes('account activated')) return NOTIFICATION_CONFIG.account_activated;
  if (t.includes('account deactivated')) return NOTIFICATION_CONFIG.account_deactivated;
  if (t.includes('assigned') || t.includes('new session')) return NOTIFICATION_CONFIG.schedule_created;
  if (t.includes('rescheduled') || t.includes('moved')) return NOTIFICATION_CONFIG.session_moved;
  if (t.includes('cancelled')) return NOTIFICATION_CONFIG.schedule_cancelled;
  
  return NOTIFICATION_CONFIG[notif.type] || NOTIFICATION_CONFIG.info;
};

// ─── Filter tabs per role ────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const NotificationPanel = ({ isOpen, onClose, anchorRef }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    appRole,
  } = useGlobalState();
  const [filter, setFilter] = useState('all');
  const panelRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  const filteredNotifications = (notifications || []).filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  const getRoleBadge = () => {
    const badges = {
      superadmin: { text: 'Super Admin', cls: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
      admin: { text: 'Admin', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
      therapist: { text: 'Therapist', cls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
      teacher: { text: 'Teacher', cls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
      parent: { text: 'Parent', cls: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
    };
    return badges[appRole] || badges.teacher;
  };

  const badge = getRoleBadge();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 dark:bg-black/30 z-[90] md:hidden"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={clsx(
              "fixed md:absolute right-2 md:right-0 top-14 md:top-full md:mt-2 z-[100]",
              "w-[calc(100vw-16px)] md:w-[420px]",
              "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700",
              "rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50",
              "flex flex-col max-h-[calc(100vh-80px)] md:max-h-[600px]",
              "overflow-hidden"
            )}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
                    <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-md', badge.cls)}>
                      {badge.text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors md:hidden"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={clsx(
                      "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                      filter === tab.key
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Notification List ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <BellOff size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                    {filter === 'unread'
                      ? "You've read all your notifications"
                      : 'Notifications will appear here when there are updates'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredNotifications.map((notif, index) => {
                    const config = getConfig(notif);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={clsx(
                          "group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150",
                          "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          !notif.is_read && "bg-indigo-50/40 dark:bg-indigo-950/20 border-l-2 border-indigo-500 dark:border-indigo-400",
                          notif.is_read && "border-l-2 border-transparent"
                        )}
                        onClick={() => {
                          if (!notif.is_read) markNotificationRead(notif.id);
                        }}
                      >
                        {/* Icon */}
                        <div className={clsx(
                          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                          config.bg
                        )}>
                          <Icon size={16} className={config.color} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={clsx(
                              "text-sm leading-snug",
                              !notif.is_read
                                ? "font-semibold text-slate-900 dark:text-white"
                                : "font-medium text-slate-600 dark:text-slate-300"
                            )}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={clsx(
                              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              config.bg, config.color
                            )}>
                              {config.label}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {timeAgo(notif.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            {filteredNotifications.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium">
                  Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                  {unreadCount > 0 && ` · ${unreadCount} unread`}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
