import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Calendar, User, FileText, ArrowRight, DoorOpen, BookOpen, Settings as SettingsIcon, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';

const AISearch = ({ isOpen, onClose }) => {
  const { staff, students, sessions, rooms } = useGlobalState();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      let mockResults = [];

      // Search Staff
      staff.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery))
        .slice(0, 5)
        .forEach(s => mockResults.push({
          id: `staff-${s.id}`,
          title: s.name,
          sub: `${s.role} · ${s.department}`,
          icon: User,
          action: () => navigate(`/profile/${s.id}?type=staff`),
        }));

      // Search Students
      students.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery) || (s.diagnosis && s.diagnosis.toLowerCase().includes(lowerQuery)))
        .slice(0, 5)
        .forEach(s => mockResults.push({
          id: `student-${s.id}`,
          title: s.name,
          sub: `${s.role} · ${s.department}${s.diagnosis ? ` · ${s.diagnosis}` : ''}`,
          icon: FileText,
          action: () => navigate(`/profile/${s.id}?type=student`),
        }));

      // Search Sessions
      sessions.filter(s => s.title.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach(s => mockResults.push({
          id: `session-${s.id}`,
          title: s.title,
          sub: `${s.room} · ${s.startHour}:00–${s.startHour + s.span}:00 · ${s.type}`,
          icon: BookOpen,
          action: () => navigate('/schedule'),
        }));

      // Search Rooms
      rooms.filter(r => r.name.toLowerCase().includes(lowerQuery) || r.type.toLowerCase().includes(lowerQuery))
        .slice(0, 4)
        .forEach(r => mockResults.push({
          id: `room-${r.id}`,
          title: r.name,
          sub: `${r.type} · ${roomOccupancy(r.name)}`,
          icon: DoorOpen,
          action: () => navigate('/rooms'),
        }));

      // Settings Search
      if ("settings".includes(lowerQuery) || "preferences".includes(lowerQuery)) {
        mockResults.push({
          id: 'nav-settings',
          title: 'System Settings',
          sub: 'Manage preferences, center details, and appearance',
          icon: SettingsIcon,
          action: () => navigate('/settings'),
        });
      }

      if ("dark mode".includes(lowerQuery) || "theme".includes(lowerQuery) || "appearance".includes(lowerQuery)) {
        mockResults.push({
          id: 'nav-appearance',
          title: 'Appearance Settings',
          sub: 'Toggle dark mode and change theme colors',
          icon: Moon,
          action: () => navigate('/settings'),
        });
      }

      // Natural language queries
      if (mockResults.length === 0) {
        // Try common natural language patterns
        if (lowerQuery.includes('conflict') || lowerQuery.includes('overlap')) {
          mockResults.push({
            id: 'nav-schedule',
            title: 'View Schedule Conflicts',
            sub: 'Open the scheduling calendar to see detected conflicts',
            icon: Calendar,
            action: () => navigate('/schedule'),
          });
        } else if (lowerQuery.includes('room') || lowerQuery.includes('available') || lowerQuery.includes('venue')) {
          mockResults.push({
            id: 'nav-rooms',
            title: 'Room Availability',
            sub: 'Check room status and occupancy',
            icon: DoorOpen,
            action: () => navigate('/rooms'),
          });
        } else if (lowerQuery.includes('schedule') || lowerQuery.includes('session') || lowerQuery.includes('calendar')) {
          mockResults.push({
            id: 'nav-schedule',
            title: 'View Schedule',
            sub: 'Open the daily/weekly scheduling calendar',
            icon: Calendar,
            action: () => navigate('/schedule'),
          });
        }

        if (mockResults.length === 0) {
          mockResults = [{
            id: 'none',
            title: `No results for "${query}"`,
            sub: 'Try searching by name, room, diagnosis, or role.',
            icon: ArrowRight,
            action: null,
          }];
        }
      }

      setResults(mockResults.slice(0, 8));
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, staff, students, rooms, sessions, navigate, roomOccupancy]);

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
        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm px-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="relative border-b border-slate-100 dark:border-slate-800 p-4">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300" size={24} />
            <input
              type="text"
              autoFocus
              placeholder="Search students, staff, rooms, sessions... (Ctrl+K)"
              className="w-full pl-12 pr-4 py-3 text-lg bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isSearching && (
              <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />
            )}
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {!query && (
              <div className="p-8 text-center text-slate-400 dark:text-slate-300">
                <p className="text-sm font-medium">Search for students, staff, rooms, sessions, or diagnoses.</p>
                <p className="text-xs mt-2 text-slate-300 dark:text-slate-200">Try: "Room 5", "autism", "therapist", "speech"</p>
              </div>
            )}
            
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-start gap-4 p-4 text-left rounded-xl hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 hover:shadow-sm dark:hover:shadow-none transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group-hover:border-indigo-100 dark:border-indigo-800 dark:group-hover:border-indigo-900 text-slate-400 dark:text-slate-300 group-hover:text-indigo-600 dark:text-indigo-400 dark:group-hover:text-indigo-400 shadow-sm">
                  <result.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{result.title}</h4>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 mt-0.5 truncate">{result.sub}</p>
                </div>
                {result.action && (
                  <ArrowRight size={16} className="text-slate-300 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AISearch;
