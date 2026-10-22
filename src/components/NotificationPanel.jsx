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

// All rows collapse onto the five semantic ps-* tokens; the tint comes from
// the token itself so light/dark need no separate class pair.
const NOTIFICATION_CONFIG = {
  schedule_created: { icon: CalendarDays, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Schedule' },
  schedule_updated: { icon: CalendarDays, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Schedule' },
  schedule_cancelled: { icon: AlertTriangle, color: 'text-ps-danger', bg: 'bg-ps-danger/10', label: 'Cancelled' },
  session_moved: { icon: Clock, color: 'text-ps-warn', bg: 'bg-ps-warn/10', label: 'Rescheduled' },
  user_created: { icon: UserPlus, color: 'text-ps-success', bg: 'bg-ps-success/10', label: 'New User' },
  role_changed: { icon: ShieldAlert, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Role Change' },
  account_updated: { icon: Settings, color: 'text-ps-ink-2', bg: 'bg-ps-bg', label: 'Account' },
  account_deactivated: { icon: BellOff, color: 'text-ps-danger', bg: 'bg-ps-danger/10', label: 'Deactivated' },
  account_activated: { icon: Check, color: 'text-ps-success', bg: 'bg-ps-success/10', label: 'Activated' },
  note_added: { icon: FileText, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Note' },
  attendance_marked: { icon: BookUser, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Attendance' },
  document_uploaded: { icon: FileText, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Document' },
  room_updated: { icon: DoorOpen, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Room' },
  child_update: { icon: GraduationCap, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Student' },
  assignment_update: { icon: Stethoscope, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Assignment' },
  system: { icon: Info, color: 'text-ps-ink-2', bg: 'bg-ps-bg', label: 'System' },
  info: { icon: Info, color: 'text-ps-accent', bg: 'bg-ps-accent-soft', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-ps-warn', bg: 'bg-ps-warn/10', label: 'Warning' },
  success: { icon: Check, color: 'text-ps-success', bg: 'bg-ps-success/10', label: 'Success' },
  error: { icon: AlertTriangle, color: 'text-ps-danger', bg: 'bg-ps-danger/10', label: 'Error' },
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
      superadmin: { text: 'Super Admin', cls: 'bg-ps-accent-soft text-ps-accent' },
      admin: { text: 'Admin', cls: 'bg-ps-bg text-ps-ink-2 border border-ps-border' },
      therapist: { text: 'Therapist', cls: 'bg-ps-bg text-ps-ink-2 border border-ps-border' },
      teacher: { text: 'Teacher', cls: 'bg-ps-bg text-ps-ink-2 border border-ps-border' },
      parent: { text: 'Parent', cls: 'bg-ps-bg text-ps-ink-2 border border-ps-border' },
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
            className="fixed inset-0 bg-black/40 z-[90] md:hidden"
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
              "bg-ps-surface border border-ps-border",
              "rounded-2xl shadow-md",
              "flex flex-col max-h-[calc(100vh-80px)] md:max-h-[600px]",
              "overflow-hidden"
            )}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-3 border-b border-ps-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-ps-accent-soft flex items-center justify-center">
                    <Bell size={18} className="text-ps-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ps-ink-1 text-sm">Notifications</h3>
                    <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded-md', badge.cls)}>
                      {badge.text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="flex items-center gap-1 text-xs font-semibold text-ps-accent hover:bg-ps-accent-soft px-2.5 py-1.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ps-accent"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 text-ps-ink-2 hover:text-ps-ink-1 hover:bg-ps-bg rounded-lg transition-colors md:hidden focus-visible:outline-2 focus-visible:outline-ps-accent"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 bg-ps-bg rounded-lg p-0.5">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={clsx(
                      "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all focus-visible:outline-2 focus-visible:outline-ps-accent",
                      filter === tab.key
                        ? "bg-ps-surface text-ps-ink-1 shadow-sm"
                        : "text-ps-ink-2 hover:text-ps-ink-1"
                    )}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 text-xs bg-ps-danger/10 text-ps-danger px-1.5 py-0.5 rounded-full">
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
                  <div className="w-14 h-14 rounded-xl bg-ps-bg flex items-center justify-center mb-3">
                    <BellOff size={24} className="text-ps-ink-2" />
                  </div>
                  <p className="text-sm font-semibold text-ps-ink-2">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-ps-ink-2 mt-1">
                    {filter === 'unread'
                      ? "You've read all your notifications"
                      : 'Notifications will appear here when there are updates'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredNotifications.map((notif) => {
                    const config = getConfig(notif);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        className={clsx(
                          "group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150",
                          "hover:bg-ps-bg",
                          !notif.is_read && "bg-ps-accent-soft border-l-2 border-ps-accent",
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
                                ? "font-semibold text-ps-ink-1"
                                : "font-medium text-ps-ink-2"
                            )}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-ps-accent flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-ps-ink-2 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={clsx(
                              "text-xs font-medium px-1.5 py-0.5 rounded",
                              config.bg, config.color
                            )}>
                              {config.label}
                            </span>
                            <span className="text-xs text-ps-ink-2">
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
                          className="p-1.5 text-ps-ink-2 hover:text-ps-danger opacity-0 group-hover:opacity-100 max-md:opacity-100 focus-visible:opacity-100 transition-all rounded-lg hover:bg-ps-danger/10 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-ps-accent"
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
              <div className="px-5 py-3 border-t border-ps-border bg-ps-bg">
                <p className="text-xs text-ps-ink-2 text-center font-medium">
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
