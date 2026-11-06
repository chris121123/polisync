import { DoorOpen, Users, User, MapPin, ArrowUpRight, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

// The only authored shape here: a chip is the 4px radius step, not a card.
const chipStyle = { borderRadius: 'var(--x-radius-sm)' };

export const RoomCard = ({ room, cfg, isSelected, setSelectedRoomId, onDelete }) => {
  const select = () => setSelectedRoomId(room.id);

  return (
    <motion.div layoutId={`room-${room.id}`} className="relative">
      {/* The whole card selects the room; delete stays a sibling so controls never nest. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`${room.name}, ${room.status}, ${room.currentOccupancy} of ${room.maxCapacity} students`}
        onClick={select}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        }}
        className={clsx(
          'itx-card block w-full cursor-pointer text-left',
          isSelected
            ? 'outline-2 -outline-offset-2 outline-[var(--accent)]'
            : 'hover:outline-1 hover:outline-[var(--line-strong)] active:outline-2 active:-outline-offset-2 active:outline-[var(--line-strong)]'
        )}
      >
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <DoorOpen size={16} strokeWidth={1.5} className="text-[var(--sa-text-muted)]" />
            <span className={clsx("sa-badge flex items-center gap-1.5", cfg.badge)}>
              <span className={clsx("w-1.5 h-1.5 shrink-0", cfg.dot)} />
              {room.status}
            </span>
          </div>

          <div className="mb-5">
            <h3 className="sa-row-title capitalize">{room.name}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin size={11} strokeWidth={1.5} className="text-[var(--sa-text-muted)]" />
              <span className="text-[11px] text-[var(--sa-text-muted)] leading-none">{room.type}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[11px] text-[var(--sa-text-muted)]">
              <span className="flex items-center gap-1.5"><Users size={12} strokeWidth={1.5}/> Occupancy</span>
              <span className={clsx("tabular-nums", room.currentOccupancy >= room.maxCapacity ? "sa-t-danger" : "text-[var(--sa-text-primary)]")}>
                {room.currentOccupancy} / {room.maxCapacity}
              </span>
            </div>

            <div className="w-full h-1 overflow-hidden bg-[var(--chart-grid)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((room.currentOccupancy / room.maxCapacity) * 100, 100)}%` }}
                className={clsx(
                  "h-full",
                  room.status === 'Over Capacity'
                    ? "bg-[var(--danger)]"
                    : room.currentOccupancy / room.maxCapacity > 0.8
                      ? "bg-[var(--chart-2)]"
                      : "bg-[var(--chart-1)]"
                )}
              />
            </div>

            {room.status !== 'Available' ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3].slice(0, room.currentOccupancy).map(idx => (
                    <div key={idx} style={chipStyle} className="flex h-5 w-5 items-center justify-center bg-[var(--surface-sunken)] text-[var(--sa-text-muted)]">
                      <User size={10} strokeWidth={1.5} />
                    </div>
                  ))}
                  {room.currentOccupancy > 3 && (
                    <div style={chipStyle} className="flex h-5 w-5 items-center justify-center bg-[var(--surface-sunken)] text-[11px] tabular-nums text-[var(--sa-text-muted)]">
                      +{room.currentOccupancy - 3}
                    </div>
                  )}
                </div>
                {room.therapist && (
                  <div className="text-[11px] text-[var(--sa-text-muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[var(--sa-bar-primary)]" />
                    {room.therapist.split(' ')[0]}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-[var(--sa-text-muted)]">No active sessions</span>
                <span className="sa-t-muted">Ready</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--sa-text-muted)]">
            <span className="sa-link">View Details <ArrowUpRight size={12} strokeWidth={1.5} /></span>
            <span className="tabular-nums pr-9">ID: {room.id.toString().padStart(3, '0')}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(room)}
        aria-label={`Delete ${room.name}`}
        className="absolute bottom-[14px] right-[14px] inline-flex h-9 w-9 items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-danger)] active:text-[var(--danger-pressed)]"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
};
