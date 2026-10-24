import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Calendar, User, Users, FileText, ArrowRight, DoorOpen, BookOpen, Settings as SettingsIcon, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';

const GlobalSearch = ({ isOpen, onToggle, onClose }) => {
  const { staff, students, sessions, rooms, appRole, parentChildren, fetchParentChildren } = useGlobalState();
  const isParent = appRole === 'parent';
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);

  // Parents search only linked children: load links on mount so results
  // fail closed (empty) until the links arrive.
  useEffect(() => {
    if (isParent) fetchParentChildren();
  }, [isParent, fetchParentChildren]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onToggle) onToggle();
        else onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle, onClose]);

  // Reset logic moved to a handler to avoid sync setState in effect
  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  const roomOccupancy = useCallback((roomName) => {
    const count = sessions.filter(s => s.room === roomName).length;
    return count > 0 ? `${count} active sessions` : 'Currently vacant';
  }, [sessions]);

  useEffect(() => {
    if (!query) {
      queueMicrotask(() => {
        setResults([]);
        setIsSearching(false);
      });
      return;
    }

    queueMicrotask(() => setIsSearching(true));
    const timeout = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let searchResults = [];

      // Parent role: no staff results (limited to own linked children)
      if (!isParent) {
        // Search Staff
        staff.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery))
          .slice(0, 5)
          .forEach(s => searchResults.push({
            id: `staff-${s.id}`,
            title: s.name,
            sub: `${s.role} · ${s.department}`,
            icon: User,
            action: () => navigate(`/profile/${s.id}?type=staff`),
          }));
      }

      // Search Students (parents: only their linked children)
      const linkedIds = new Set((parentChildren || []).map(c => String(c.id)));
      students.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery) || (s.diagnosis && s.diagnosis.toLowerCase().includes(lowerQuery)))
        .filter(s => !isParent || linkedIds.has(String(s.id)))
        .slice(0, 5)
        .forEach(s => searchResults.push({
          id: `student-${s.id}`,
          title: s.name,
          sub: `${s.role} · ${s.department}${s.diagnosis ? ` · ${s.diagnosis}` : ''}`,
          icon: FileText,
          action: () => navigate(`/profile/${s.id}?type=student`),
        }));

      // Admin-only gate: /schedule, /directory, /rooms are RoleRoute(allowedRoles=['admin'])-guarded
      // in App.jsx and hidden from superadmin in the sidebar — superadmin gets bounced to /dashboard.
      const isAdminOnly = appRole === 'admin';

      // Search Sessions
      sessions.filter(s => isAdminOnly && s.title.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach(s => searchResults.push({
          id: `session-${s.id}`,
          title: s.title,
          sub: `${s.room} · ${s.startHour}:00–${s.startHour + s.span}:00 · ${s.type}`,
          icon: BookOpen,
          action: () => navigate('/schedule'),
        }));

      // Search Rooms
      rooms.filter(r => isAdminOnly && (r.name.toLowerCase().includes(lowerQuery) || r.type.toLowerCase().includes(lowerQuery)))
        .slice(0, 4)
        .forEach(r => searchResults.push({
          id: `room-${r.id}`,
          title: r.name,
          sub: `${r.type} · ${roomOccupancy(r.name)}`,
          icon: DoorOpen,
          action: () => navigate('/rooms'),
        }));

      // Settings Search
      if ("settings".includes(lowerQuery) || "preferences".includes(lowerQuery)) {
        searchResults.push({
          id: 'nav-settings',
          title: 'System Settings',
          sub: 'Manage preferences, center details, and appearance',
          icon: SettingsIcon,
          action: () => navigate('/settings'),
        });
      }

      if ("dark mode".includes(lowerQuery) || "theme".includes(lowerQuery) || "appearance".includes(lowerQuery)) {
        searchResults.push({
          id: 'nav-appearance',
          title: 'Appearance Settings',
          sub: 'Toggle dark mode and change theme colors',
          icon: Moon,
          action: () => navigate('/settings'),
        });
      }

      // Phase 2.5 — superadmin/admin page results
      if (appRole === 'superadmin' && ("user management".includes(lowerQuery) || "users".includes(lowerQuery) || "accounts".includes(lowerQuery))) {
        searchResults.push({
          id: 'nav-usermgmt',
          title: 'User Management',
          sub: 'Create accounts, manage roles and permissions',
          icon: Users,
          action: () => navigate('/admin/users'),
        });
      }
      if (isAdminOnly && ("directory".includes(lowerQuery) || "staff".includes(lowerQuery) || "people".includes(lowerQuery))) {
        searchResults.push({
          id: 'nav-directory',
          title: 'Directory',
          sub: 'Browse all staff and students',
          icon: Users,
          action: () => navigate('/directory'),
        });
      }

      // Natural language queries
      if (searchResults.length === 0) {
        // Try common natural language patterns
        if (isAdminOnly && (lowerQuery.includes('conflict') || lowerQuery.includes('overlap'))) {
          searchResults.push({
            id: 'nav-schedule',
            title: 'View Schedule Conflicts',
            sub: 'Open the scheduling calendar to see detected conflicts',
            icon: Calendar,
            action: () => navigate('/schedule'),
          });
        } else if (isAdminOnly && (lowerQuery.includes('room') || lowerQuery.includes('available') || lowerQuery.includes('venue'))) {
          searchResults.push({
            id: 'nav-rooms',
            title: 'Room Availability',
            sub: 'Check room status and occupancy',
            icon: DoorOpen,
            action: () => navigate('/rooms'),
          });
        } else if (isAdminOnly && (lowerQuery.includes('schedule') || lowerQuery.includes('session') || lowerQuery.includes('calendar'))) {
          searchResults.push({
            id: 'nav-schedule',
            title: 'View Schedule',
            sub: 'Open the daily/weekly scheduling calendar',
            icon: Calendar,
            action: () => navigate('/schedule'),
          });
        }

        if (searchResults.length === 0) {
          searchResults = [{
            id: 'none',
            title: `No results for "${query}"`,
            sub: isParent ? "Try searching by your child's name." : 'Try searching by name, room, diagnosis, or role.',
            icon: ArrowRight,
            action: null,
          }];
        }
      }

      setResults(searchResults.slice(0, 8));
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, staff, students, rooms, sessions, navigate, roomOccupancy, appRole, isParent, parentChildren]);

  if (!isOpen) return null;

  const handleResultClick = (result) => {
    if (result.action) {
      result.action();
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-[10vh] bg-black/40 px-3 sm:px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-ps-surface rounded-2xl shadow-md border border-ps-border overflow-hidden max-h-[85vh] flex flex-col"
        >
          <div className="relative border-b border-ps-border p-3 sm:p-4 shrink-0">
            <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-ps-ink-2" size={22} />
            <input
              type="text"
              autoFocus
              placeholder={isParent ? "Search your children... (Ctrl+K)" : "Search students, staff, rooms, sessions... (Ctrl+K)"}
              aria-label="Global search"
              className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 text-base sm:text-lg bg-transparent border-none outline-none focus:ring-0 focus-visible:outline-2 focus-visible:outline-ps-accent text-ps-ink-1 placeholder:text-ps-ink-2 font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isSearching && (
              <Loader2 className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-ps-accent animate-spin" size={20} />
            )}
          </div>

          <div className="p-2 overflow-y-auto bg-ps-bg flex-1">
            {!query && (
              <div className="p-8 text-center text-ps-ink-2">
                <p className="text-sm font-medium">{isParent ? 'Search your linked children by name.' : 'Search for students, staff, rooms, sessions, or diagnoses.'}</p>
                <p className="text-xs mt-2 text-ps-ink-2">{isParent ? "Try: your child's first name" : 'Try: "Room 5", "autism", "therapist", "speech"'}</p>
              </div>
            )}
            
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-start gap-4 p-4 text-left rounded-xl hover:bg-ps-surface hover:shadow-sm transition-all group focus-visible:outline-2 focus-visible:outline-ps-accent"
              >
                <div className="p-2.5 rounded-lg bg-ps-surface border border-ps-border group-hover:border-ps-accent text-ps-ink-2 group-hover:text-ps-accent shadow-sm">
                  <result.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-ps-ink-1 truncate">{result.title}</h4>
                  <p className="text-xs font-medium text-ps-ink-2 mt-0.5 truncate">{result.sub}</p>
                </div>
                {result.action && (
                  <ArrowRight size={16} className="text-ps-ink-2 group-hover:text-ps-accent shrink-0 mt-1 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalSearch;
