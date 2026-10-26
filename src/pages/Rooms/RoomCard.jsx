import { DoorOpen, Users, User, MapPin, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const RoomCard = ({ room, cfg, isSelected, setSelectedRoomId }) => (
  <motion.div 
    layoutId={`room-${room.id}`}
    onClick={() => setSelectedRoomId(room.id)}
    className={clsx(
      "bg-ps-surface rounded-xl p-5 border transition-all cursor-pointer relative overflow-hidden group",
      isSelected 
        ? "ring-2 ring-ps-accent shadow-sm z-10 border-transparent translate-y-[-2px]" 
        : "border-ps-border hover:shadow-sm hover:border-ps-border/80 hover:translate-y-[-2px]"
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 rounded-xl bg-ps-bg border border-ps-border flex items-center justify-center text-ps-ink-2 group-hover:text-ps-accent transition-colors">
        <DoorOpen size={20} strokeWidth={2} />
      </div>
      <span className={clsx("text-xs font-medium px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5", cfg.badge)}>
        <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        {room.status}
      </span>
    </div>
    
    <div className="mb-5">
      <h3 className="font-semibold text-ps-ink-1 text-lg tracking-tight leading-none capitalize group-hover:text-ps-accent transition-colors">{room.name}</h3>
      <div className="flex items-center gap-1.5 mt-2">
         <MapPin size={11} className="text-ps-ink-2" />
         <span className="text-xs text-ps-ink-2 font-medium leading-none">{room.type}</span>
      </div>
    </div>
    
    <div className="space-y-3 bg-ps-bg p-3.5 rounded-xl border border-ps-border">
      <div className="flex justify-between items-center text-xs font-medium text-ps-ink-2">
        <span className="flex items-center gap-1.5"><Users size={12}/> Occupancy</span>
        <span className={clsx("font-semibold", room.currentOccupancy >= room.maxCapacity ? "text-ps-danger" : "text-ps-ink-1")}>
          {room.currentOccupancy} / {room.maxCapacity}
        </span>
      </div>
      
      <div className="w-full h-1.5 bg-ps-border/60 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((room.currentOccupancy / room.maxCapacity) * 100, 100)}%` }}
          className={clsx("h-full rounded-full transition-all duration-1000", room.status === 'Over Capacity' ? "bg-ps-danger" : (room.currentOccupancy / room.maxCapacity > 0.8 ? "bg-ps-warn" : "bg-ps-primary"))}
        />
      </div>

      {room.status !== 'Available' ? (
        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].slice(0, room.currentOccupancy).map(idx => (
              <div key={idx} className="w-5 h-5 rounded-full bg-ps-surface border border-ps-border flex items-center justify-center text-ps-ink-2 shadow-xs">
                <User size={10} />
              </div>
            ))}
            {room.currentOccupancy > 3 && (
              <div className="w-5 h-5 rounded-full bg-ps-accent-soft border border-ps-accent/20 flex items-center justify-center text-[10px] font-semibold text-ps-accent">
                +{room.currentOccupancy - 3}
              </div>
            )}
          </div>
          {room.therapist && (
            <div className="text-xs font-medium text-ps-ink-2 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-ps-primary " />
               {room.therapist.split(' ')[0]}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 text-xs text-ps-ink-2 font-medium">
          <span className="text-ps-ink-2">No active sessions</span>
          <span className="text-ps-success text-xs font-medium">Ready</span>
        </div>
      )}
    </div>
    
    <div className="mt-4 pt-3 border-t border-ps-border flex items-center justify-between text-xs font-medium text-ps-ink-2">
       <span className="text-ps-accent group-hover:underline flex items-center gap-1">View Details <ArrowUpRight size={12} /></span>
       <span>ID: {room.id.toString().padStart(3, '0')}</span>
    </div>
  </motion.div>
);
