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
          <label htmlFor="availability-date" className="sa-label">Select Date</label>
          <input
            id="availability-date"
            data-autofocus
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm tabular-nums text-[var(--sa-text-primary)] focus:border-[var(--sa-gold)]"
          />
          <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">{dayLabel}</p>
        </div>

        <p className="text-sm text-[var(--sa-text-secondary)]">
          <span className="tabular-nums sa-t-warm">{availableStaffForDate.length}</span> / {therapistsAndTeachers.length} available
        </p>

        <ul className="max-h-[300px] overflow-y-auto border border-[var(--sa-line-default)] sa-list">
          {therapistsAndTeachers.map(person => {
            const isAvailable = availableIdsForDate.includes(person.id);
            return (
              <li
                key={person.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {isAvailable
                  ? <CheckCircle2 size={16} strokeWidth={1.5} className="shrink-0 sa-t-warm" />
                  : <UserCheck size={16} strokeWidth={1.5} className="shrink-0 text-[var(--sa-text-subtle)]" />}
                <div className="min-w-0 flex-1">
                  <p className={clsx(
                    'truncate text-sm',
                    isAvailable ? 'text-[var(--sa-text-primary)]' : 'text-[var(--sa-text-muted)]'
                  )}>
                    {person.name}
                  </p>
                  <p className="truncate text-[11px] text-[var(--sa-text-muted)]">{person.role} · {person.department || 'General'}</p>
                </div>
                <span className={clsx(
                  'sa-badge shrink-0',
                  isAvailable && 'sa-badge--positive'
                )}>
                  {isAvailable ? 'Available' : 'Not marked'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t border-[var(--sa-line-hairline)] px-5 py-4 md:px-6">
        <button
          type="button"
          onClick={onClose}
          className="sa-btn w-full justify-center min-h-11"
        >
          Close
        </button>
      </div>
    </AppModal>
  );
};
