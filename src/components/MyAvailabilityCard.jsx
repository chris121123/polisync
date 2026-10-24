import { CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../context/GlobalStateContext';
import { formatDateISO, upcomingWeekdays } from '../pages/ScheduleCalendar/calendarMath.js';

// Staff set their own availability here; admins read the same rows live via ManageAvailabilityModal.
const MyAvailabilityCard = () => {
  const { user, staffAvailability, addStaffAvailability, removeStaffAvailability } = useGlobalState();
  const days = upcomingWeekdays(5);

  return (
    <section
      aria-labelledby="my-availability-title"
      className="bg-ps-surface rounded-2xl p-6 shadow-md border border-ps-border space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-ps-success/10 text-ps-success rounded-xl shrink-0">
          <CalendarDays size={18} />
        </div>
        <div>
          <h2 id="my-availability-title" className="font-display font-bold text-ps-ink-1">My Availability</h2>
          <p className="text-xs text-ps-ink-2 font-medium mt-0.5">
            Mark the days you're available. Admin sees this live.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {days.map(day => {
          const iso = formatDateISO(day);
          const available = staffAvailability?.some(a => a.staff_id === user?.id && a.available_date === iso);
          return (
            <li key={iso} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-ps-bg border border-ps-border/70">
              <span className="text-sm font-semibold text-ps-ink-1">
                {day.toLocaleDateString('en-US', { weekday: 'long' })}
                <span className="text-ps-ink-2 font-medium"> · {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </span>
              <button
                type="button"
                aria-pressed={Boolean(available)}
                disabled={!user?.id}
                onClick={() => (available ? removeStaffAvailability(user.id, iso) : addStaffAvailability(user.id, iso))}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50',
                  available
                    ? 'bg-ps-success/10 text-ps-success'
                    : 'bg-ps-surface text-ps-ink-2 border border-ps-border hover:border-ps-success'
                )}
              >
                {available ? 'Available' : 'Not marked'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default MyAvailabilityCard;
