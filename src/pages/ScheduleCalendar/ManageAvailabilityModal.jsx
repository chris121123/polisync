import { useState } from 'react';
import { X, CheckCircle2, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { isTherapistOrTeacher } from './staff.js';

// ─── Manage Staff Availability Modal ──────────────────────────────────────────
export const ManageAvailabilityModal = ({ isOpen, onClose, staff, staffAvailability, addStaffAvailability, removeStaffAvailability, notify }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  if (!isOpen) return null;

  const therapistsAndTeachers = staff.filter(isTherapistOrTeacher);

  const availableIdsForDate = staffAvailability
    .filter(a => a.available_date === selectedDate)
    .map(a => a.staff_id);

  const availableStaffForDate = therapistsAndTeachers.filter(s => availableIdsForDate.includes(s.id));

  const handleToggle = async (staffId) => {
    if (availableIdsForDate.includes(staffId)) {
      await removeStaffAvailability(staffId, selectedDate);
    } else {
      await addStaffAvailability(staffId, selectedDate);
    }
  };

  const handleSelectAll = async () => {
    const allSelected = therapistsAndTeachers.length > 0 && therapistsAndTeachers.every(s => availableIdsForDate.includes(s.id));
    if (allSelected) {
      // Deselect all
      for (const s of therapistsAndTeachers) {
        if (availableIdsForDate.includes(s.id)) {
          await removeStaffAvailability(s.id, selectedDate);
        }
      }
    } else {
      // Select all
      for (const s of therapistsAndTeachers) {
        if (!availableIdsForDate.includes(s.id)) {
          await addStaffAvailability(s.id, selectedDate);
        }
      }
    }
  };

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
              <p className="text-white text-xs md:text-xs font-medium  mb-1">Staff Availability</p>
              <h3 className="text-white text-lg md:text-xl font-semibold">Manage Schedule</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-ps-surface/30 text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          {/* Date Picker */}
          <div>
            <label className="text-xs font-medium text-ps-ink-2 mb-2 block">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-ps-bg border border-ps-border rounded-xl outline-none focus:border-ps-success focus:ring-2 focus:ring-ps-success/20 text-sm font-semibold transition-all"
            />
            <p className="text-xs text-ps-ink-2 font-medium mt-1">{dayLabel}</p>
          </div>

          {/* Available Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ps-ink-2">
              <span className="text-ps-success font-medium">{availableStaffForDate.length}</span> / {therapistsAndTeachers.length} available
            </p>
            <button
              onClick={handleSelectAll}
              className="text-xs font-medium text-ps-success hover:text-ps-success transition-colors px-3 py-1.5 rounded-lg hover:bg-ps-success/10"
            >
              {therapistsAndTeachers.length > 0 && therapistsAndTeachers.every(s => availableIdsForDate.includes(s.id)) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Staff Checklist */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {therapistsAndTeachers.map(person => {
              const isAvailable = availableIdsForDate.includes(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => handleToggle(person.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    isAvailable
                      ? 'border-ps-success/20 bg-ps-success/10'
                      : 'border-ps-border bg-ps-surface hover:border-ps-border'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
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
                  {isAvailable && (
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-ps-success/10 text-ps-success shrink-0">
                      Available
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <button
            onClick={() => { notify(`Availability saved for ${dayLabel}`); onClose(); }}
            className="w-full py-3 text-sm font-medium bg-ps-accent dark:bg-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} /> Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
