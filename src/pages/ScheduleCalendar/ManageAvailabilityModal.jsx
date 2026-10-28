import { useState } from 'react';
import { CheckCircle2, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { AppModal, ModalHeader } from '../../components/AppModal.jsx';
import { isTherapistOrTeacher } from './staff.js';
import { formatDateISO } from './calendarMath.js';

// ─── Staff Availability Viewer ────────────────────────────────────────────────
// Read-only: staff mark their own availability from their dashboard.
export const ManageAvailabilityModal = ({ isOpen, onClose, staff, staffAvailability }) => {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()));

  const therapistsAndTeachers = staff.filter(isTherapistOrTeacher);

  const availableIdsForDate = staffAvailability
    .filter(a => a.available_date === selectedDate)
    .map(a => a.staff_id);

  const availableStaffForDate = therapistsAndTeachers.filter(s => availableIdsForDate.includes(s.id));

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <AppModal isOpen={isOpen} onClose={onClose} labelledBy="availability-title">
      <ModalHeader
        titleId="availability-title"
        eyebrow="Scheduling"
        title="Staff Availability"
        description="Read-only — staff manage their own availability"
        onClose={onClose}
        className="bg-[var(--sa-surface-warm)]"
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-6">
        <div>
          <label htmlFor="availability-date" className="mb-2 block text-xs font-medium text-ps-ink-2">Select Date</label>
          <input
            id="availability-date"
            data-autofocus
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-ps-border bg-ps-bg px-4 py-3 text-sm font-semibold text-ps-ink-1 outline-none transition-all focus:border-ps-success focus:ring-2 focus:ring-ps-success/20"
          />
          <p className="mt-1 text-xs font-medium text-ps-ink-2">{dayLabel}</p>
        </div>

        <p className="text-sm font-semibold text-ps-ink-2">
          <span className="font-medium text-ps-success">{availableStaffForDate.length}</span> / {therapistsAndTeachers.length} available
        </p>

        <ul className="max-h-[300px] space-y-2 overflow-y-auto">
          {therapistsAndTeachers.map(person => {
            const isAvailable = availableIdsForDate.includes(person.id);
            return (
              <li
                key={person.id}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border-2 p-3',
                  isAvailable
                    ? 'border-ps-success/20 bg-ps-success/10'
                    : 'border-ps-border bg-ps-surface'
                )}
              >
                <div className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isAvailable ? 'border border-[var(--sa-success)] text-[var(--sa-success)]' : 'bg-ps-bg text-ps-ink-2'
                )}>
                  {isAvailable ? <CheckCircle2 size={16} /> : <UserCheck size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={clsx('truncate text-sm font-semibold', isAvailable ? 'text-ps-success' : 'text-ps-ink-2')}>
                    {person.name}
                  </p>
                  <p className="truncate text-xs font-medium text-ps-ink-2">{person.role} · {person.department || 'General'}</p>
                </div>
                <span className={clsx(
                  'shrink-0 rounded-lg px-2 py-1 text-xs font-medium',
                  isAvailable ? 'bg-ps-success/10 text-ps-success' : 'bg-ps-bg text-ps-ink-2'
                )}>
                  {isAvailable ? 'Available' : 'Not marked'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t border-ps-border bg-ps-surface px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-ps-primary py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
        >
          Close
        </button>
      </div>
    </AppModal>
  );
};
