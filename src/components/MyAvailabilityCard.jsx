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
      className="sa-panel"
    >
      <div className="sa-panel-head">
        <div>
          <h2 id="my-availability-title" className="sa-panel-title">My Availability</h2>
          <p className="sa-panel-sub">
            Mark the days you're available. Admin sees this live.
          </p>
        </div>
      </div>

      <ul className="sa-list">
        {days.map(day => {
          const iso = formatDateISO(day);
          const available = staffAvailability?.some(a => a.staff_id === user?.id && a.available_date === iso);
          return (
            <li key={iso} className="sa-row justify-between">
              <p className="sa-row-title flex-1 min-w-0">
                {day.toLocaleDateString('en-US', { weekday: 'long' })}
                <span className="sa-row-target"> · {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </p>
              <button
                type="button"
                aria-pressed={Boolean(available)}
                disabled={!user?.id}
                onClick={() => (available ? removeStaffAvailability(user.id, iso) : addStaffAvailability(user.id, iso))}
                className={clsx(
                  'sa-badge py-1.5 cursor-pointer disabled:opacity-40',
                  available && 'sa-badge--positive'
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
