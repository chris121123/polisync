import { DoorOpen, Users, User, MapPin, ArrowUpRight, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const RoomCard = ({ room, cfg, isSelected, setSelectedRoomId, onDelete }) => (
  <motion.div 
    layoutId={`room-${room.id}`}
    onClick={() => setSelectedRoomId(room.id)}
    className={clsx(
      "bg-[var(--sa-surface-1)] p-5 border cursor-pointer relative overflow-hidden group",
      isSelected 
        ? "border-[var(--sa-gold)] z-10" 
        : "border-[var(--sa-line-default)] hover:border-[var(--sa-line-strong)]"
    )}
  >
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
    
    <div className="space-y-3 pt-3 border-t border-[var(--sa-line-hairline)]">
      <div className="flex justify-between items-center text-[11px] text-[var(--sa-text-muted)]">
        <span className="flex items-center gap-1.5"><Users size={12} strokeWidth={1.5}/> Occupancy</span>
        <span className={clsx("tabular-nums", room.currentOccupancy >= room.maxCapacity ? "sa-t-danger" : "text-[var(--sa-text-primary)]")}>
          {room.currentOccupancy} / {room.maxCapacity}
        </span>
      </div>
      
      <div className="w-full h-1 bg-[var(--sa-bar-track)] overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((room.currentOccupancy / room.maxCapacity) * 100, 100)}%` }}
          className={clsx("h-full", room.status === 'Over Capacity' ? "bg-[var(--sa-danger)]" : (room.currentOccupancy / room.maxCapacity > 0.8 ? "bg-[var(--sa-gold)]" : "bg-[var(--sa-bar-primary)]"))}
        />
      </div>

      {room.status !== 'Available' ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1">
            {[1, 2, 3].slice(0, room.currentOccupancy).map(idx => (
              <div key={idx} className="w-5 h-5 border border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] flex items-center justify-center text-[var(--sa-text-muted)]">
                <User size={10} strokeWidth={1.5} />
              </div>
            ))}
            {room.currentOccupancy > 3 && (
              <div className="w-5 h-5 border border-[var(--sa-line-default)] bg-[var(--sa-surface-1)] flex items-center justify-center text-[10px] tabular-nums text-[var(--sa-text-muted)]">
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
          <span className="sa-t-warm">Ready</span>
        </div>
      )}
    </div>
    
    <div className="mt-4 pt-3 border-t border-[var(--sa-line-hairline)] flex items-center justify-between text-[11px] text-[var(--sa-text-muted)]">
       <span className="sa-link">View Details <ArrowUpRight size={12} strokeWidth={1.5} /></span>
       <div className="flex items-center gap-1.5">
         <span className="tabular-nums">ID: {room.id.toString().padStart(3, '0')}</span>
         <button
           type="button"
           onClick={(event) => { event.stopPropagation(); onDelete(room); }}
           aria-label={`Delete ${room.name}`}
           className="p-1.5 text-[var(--sa-text-muted)] hover:text-[var(--sa-danger)]"
         >
           <Trash2 size={14} strokeWidth={1.5} />
         </button>
       </div>
    </div>
  </motion.div>
);
