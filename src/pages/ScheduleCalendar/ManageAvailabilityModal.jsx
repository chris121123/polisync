import { useState } from 'react';
import { X, CheckCircle2, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { isTherapistOrTeacher } from './staff.js';
import { formatDateISO } from './calendarMath.js';

// ─── Staff Availability Viewer ────────────────────────────────────────────────
// Read-only: staff mark their own availability from their dashboard.
export const ManageAvailabilityModal = ({ isOpen, onClose, staff, staffAvailability }) => {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()));

  if (!isOpen) return null;

  const therapistsAndTeachers = staff.filter(isTherapistOrTeacher);

  const availableIdsForDate = staffAvailability
    .filter(a => a.available_date === selectedDate)
    .map(a => a.staff_id);

  const availableStaffForDate = therapistsAndTeachers.filter(s => availableIdsForDate.includes(s.id));

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        className="bg-ps-surface rounded-t-2xl md:rounded-2xl shadow-md w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-6 bg-ps-success dark:bg-emerald-700 relative shrink-0">
          <div className="relative flex justify-between items-start">
            <div>
              <h3 className="text-white text-lg md:text-xl font-semibold">Staff Availability</h3>
              <p className="text-white text-xs md:text-xs font-medium mt-1">Read-only — staff manage their own availability</p>
            </div>
            <button onClick={onClose} aria-label="Close availability" className="p-2 rounded-full bg-white/20 hover:bg-ps-surface/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Date Picker */}
          <div>
            <label htmlFor="availability-date" className="text-xs font-medium text-ps-ink-2 mb-2 block">Select Date</label>
            <input
              id="availability-date"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-success focus:ring-2 focus:ring-ps-success/20 text-sm font-semibold transition-all"
            />
            <p className="text-xs text-ps-ink-2 font-medium mt-1">{dayLabel}</p>
          </div>

          {/* Available Count */}
          <p className="text-sm font-semibold text-ps-ink-2">
            <span className="text-ps-success font-medium">{availableStaffForDate.length}</span> / {therapistsAndTeachers.length} available
          </p>

          {/* Staff list */}
          <ul className="space-y-2 max-h-[300px] overflow-y-auto">
            {therapistsAndTeachers.map(person => {
              const isAvailable = availableIdsForDate.includes(person.id);
              return (
                <li
                  key={person.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border-2',
                    isAvailable
                      ? 'border-ps-success/20 bg-ps-success/10'
                      : 'border-ps-border bg-ps-surface'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isAvailable ? 'bg-ps-success dark:bg-emerald-700 text-white' : 'bg-ps-bg text-ps-ink-2'
                  )}>
                    {isAvailable ? <CheckCircle2 size={16} /> : <UserCheck size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold truncate', isAvailable ? 'text-ps-success' : 'text-ps-ink-2')}>
                      {person.name}
                    </p>
                    <p className="text-xs font-medium text-ps-ink-2 truncate">{person.role} · {person.department || 'General'}</p>
                  </div>
                  <span className={clsx(
                    'text-xs font-medium px-2 py-1 rounded-lg shrink-0',
                    isAvailable ? 'bg-ps-success/10 text-ps-success' : 'bg-ps-bg text-ps-ink-2'
                  )}>
                    {isAvailable ? 'Available' : 'Not marked'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium bg-ps-primary text-white rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
