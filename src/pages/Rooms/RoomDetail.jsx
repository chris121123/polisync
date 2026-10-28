import { X, MapPin, Clock, DoorOpen } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const RoomDetail = ({ selectedRoom, cfg, staff, students, setSelectedRoomId }) => (
  <>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSelectedRoomId(null)}
      className="fixed inset-0 bg-black/10 z-30"
    />
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[440px] bg-[var(--sa-surface-1)] border-l border-[var(--sa-line-default)] z-40 flex flex-col"
    >
      {/* Panel Header */}
      <div className={clsx("p-8 relative overflow-hidden", cfg.bg)}>
        <div className="absolute top-0 right-0 p-4">
          <button onClick={() => setSelectedRoomId(null)} aria-label="Close room details" className="p-2.5 border border-[var(--sa-line-default)] text-[var(--sa-text-secondary)] hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="relative mt-4">
          <div className={clsx("inline-flex items-center gap-2 sa-badge mb-4", cfg.badge)}>
            <div className={clsx("w-1.5 h-1.5", cfg.accent)} />
            {selectedRoom.status}
          </div>
          <h2 className="sa-title mb-2">{selectedRoom.name}</h2>
          <p className="text-sm text-[var(--sa-text-muted)] flex items-center gap-2">
            <MapPin size={14} strokeWidth={1.5} className="sa-t-warm" />
            {selectedRoom.type}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 border border-[var(--sa-line-default)]">
            <p className="sa-micro mb-1">Student Capacity</p>
            <p className={clsx("text-[28px] tabular-nums leading-none", selectedRoom.currentOccupancy >= selectedRoom.maxCapacity ? "sa-t-danger" : "text-[var(--sa-text-primary)]")}>
              {selectedRoom.currentOccupancy} <span className="text-[var(--sa-text-muted)] text-lg">/ {selectedRoom.maxCapacity}</span>
            </p>
          </div>
          <div className="p-5 border border-[var(--sa-line-default)]">
            <p className="sa-micro mb-1">Active Hours</p>
            <p className="text-[28px] tabular-nums leading-none text-[var(--sa-text-primary)]">
              {selectedRoom.activeSessionsList.length * 2} <span className="text-[var(--sa-text-muted)] text-lg">hrs</span>
            </p>
          </div>
        </div>

        {/* Live Activity Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="sa-micro flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[var(--sa-bar-primary)]" />
              Ongoing Sessions
            </h3>
          </div>
          
          <div className="space-y-3">
            {selectedRoom.activeSessionsList.length > 0 ? selectedRoom.activeSessionsList.map((s, idx) => (
              <motion.div 
                key={idx}
                className="p-4 border border-[var(--sa-line-default)] flex flex-col gap-3"
              >
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="sa-row-title">{s.title}</h4>
                     <div className="flex items-center gap-2 mt-1">
                       <span className="sa-badge">{s.type} Session</span>
                       <span className="w-1 h-1 bg-[var(--sa-line-strong)]" />
                       <span className="text-[11px] text-[var(--sa-text-muted)]">Therapist: {staff.find(st => st.id === s.therapistId)?.name}</span>
                     </div>
                   </div>
                   <div className="flex flex-col items-end">
                     <div className="text-[11px] tabular-nums border border-[var(--sa-line-default)] px-2 py-1 flex items-center gap-1.5 shrink-0 whitespace-nowrap sa-t-warm">
                        <Clock size={10} strokeWidth={1.5} /> {s.startHour}:00 – {s.startHour + s.span}:00
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--sa-line-hairline)]">
                    {s.studentIds.map(sid => {
                       const student = students.find(st => st.id === sid);
                       return (
                         <div key={sid} className="flex items-center gap-1.5 px-2 py-1 border border-[var(--sa-line-hairline)] cursor-default">
                            <div className="w-1.5 h-1.5 bg-[var(--sa-success)]" />
                            <span className="text-[11px] text-[var(--sa-text-muted)]">{student?.name}</span>
                         </div>
                       );
                    })}
                 </div>
              </motion.div>
            )) : (
              <div className="sa-empty flex flex-col items-center justify-center">
                <DoorOpen size={20} strokeWidth={1.5} className="mb-2 sa-t-muted" />
                <p className="sa-empty-sub">No active sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  </>
);
