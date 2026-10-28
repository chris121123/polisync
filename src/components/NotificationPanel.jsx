import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Check, CheckCheck, CalendarDays, UserPlus, ShieldAlert,
  FileText, Clock, AlertTriangle, Info, Stethoscope, GraduationCap,
  DoorOpen, Trash2, Settings, BookUser, X, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { ROLE_LABELS } from '../lib/rolePalette';

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

// Every row shares one ink scale; type identity is carried by the label, not a tint.
const NOTIFICATION_CONFIG = {
  schedule_created: { icon: CalendarDays, label: 'Schedule' },
  schedule_updated: { icon: CalendarDays, label: 'Schedule' },
  schedule_cancelled: { icon: AlertTriangle, label: 'Cancelled' },
  session_moved: { icon: Clock, label: 'Rescheduled' },
  user_created: { icon: UserPlus, label: 'New User' },
  role_changed: { icon: ShieldAlert, label: 'Role Change' },
  account_updated: { icon: Settings, label: 'Account' },
  account_deactivated: { icon: BellOff, label: 'Deactivated' },
  account_activated: { icon: Check, label: 'Activated' },
  note_added: { icon: FileText, label: 'Note' },
  attendance_marked: { icon: BookUser, label: 'Attendance' },
  document_uploaded: { icon: FileText, label: 'Document' },
  room_updated: { icon: DoorOpen, label: 'Room' },
  child_update: { icon: GraduationCap, label: 'Student' },
  assignment_update: { icon: Stethoscope, label: 'Assignment' },
  system: { icon: Info, label: 'System' },
  info: { icon: Info, label: 'Info' },
  warning: { icon: AlertTriangle, label: 'Warning' },
  success: { icon: Check, label: 'Success' },
  error: { icon: AlertTriangle, label: 'Error' },
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

  const roleLabel = ROLE_LABELS[appRole] || ROLE_LABELS.teacher;

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
              "bg-[var(--sa-surface-1)] border border-[var(--sa-line-default)]",
              "flex flex-col max-h-[calc(100vh-80px)] md:max-h-[600px]",
              "overflow-hidden"
            )}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="border-b border-[var(--sa-line-hairline)] px-5 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm text-[var(--sa-text-primary)]">
                    <Bell size={16} strokeWidth={1.5} className="shrink-0 text-[var(--sa-text-muted)]" />
                    Notifications
                  </h2>
                  <span className="sa-micro mt-1 block">{roleLabel}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="sa-link min-h-6"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} strokeWidth={1.5} />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] md:hidden"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs — square hairline segmented control */}
              <div className="flex divide-x divide-[var(--sa-line-default)] border border-[var(--sa-line-default)]">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={clsx(
                      "flex-1 px-3 py-1.5 text-xs",
                      filter === tab.key
                        ? "text-[var(--sa-text-primary)] outline-1 outline-[var(--sa-gold)] -outline-offset-1"
                        : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)]"
                    )}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 text-[11px] tabular-nums">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Notification List ──────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {filteredNotifications.length === 0 ? (
                <div className="sa-empty m-4">
                  <BellOff size={18} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--sa-text-muted)]" />
                  <span className="sa-empty-title block">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </span>
                  <span className="sa-empty-sub block">
                    {filter === 'unread'
                      ? "You've read all your notifications"
                      : 'Notifications will appear here when there are updates'}
                  </span>
                </div>
              ) : (
                <div className="sa-list">
                  {filteredNotifications.map((notif) => {
                    const config = getConfig(notif);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        className="sa-row group cursor-pointer px-5"
                        onClick={() => {
                          if (!notif.is_read) markNotificationRead(notif.id);
                        }}
                      >
                        {/* Unread marker — a 2px square, never a tinted row */}
                        <span className={clsx('sa-marker', notif.is_read && 'invisible')} />

                        <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--sa-text-muted)]" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <span className={clsx(
                            "block text-sm leading-snug",
                            notif.is_read
                              ? "text-[var(--sa-text-secondary)]"
                              : "text-[var(--sa-text-primary)]"
                          )}>
                            {notif.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--sa-text-muted)]">
                            {notif.message}
                          </span>
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className="sa-micro">{config.label}</span>
                            <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">
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
                          className="shrink-0 p-1.5 text-[var(--sa-text-muted)] opacity-0 transition-opacity hover:text-[var(--sa-danger)] focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
                          title="Delete notification"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            {filteredNotifications.length > 0 && (
              <div className="border-t border-[var(--sa-line-hairline)] px-5 py-3">
                <span className="block text-center text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                  Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                  {unreadCount > 0 && ` · ${unreadCount} unread`}
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
